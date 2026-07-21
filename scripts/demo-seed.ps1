# demo-seed.ps1 — Chuẩn bị dữ liệu demo cho buổi bảo vệ.
#
# Chạy TỐI HÔM TRƯỚC ngày demo, trên chính môi trường sẽ demo (local hoặc Railway).
# Script gọi API thật (không đụng DB trực tiếp) nên dữ liệu tạo ra giống hệt
# dữ liệu người dùng thật: session chat, report lookup, report verify.
#
# Cách dùng:
#   .\scripts\demo-seed.ps1 -BaseUrl "http://localhost:8080" -Email "demo@marketscout.vn" -Password "..."
#   Thêm -RunDeepVerify để chạy cả 2 deep verify (tốn 2 quota, ~10-16 phút).
#
# Yêu cầu: tài khoản demo đã đăng ký + verify email + còn >= 2 quota (nếu -RunDeepVerify).

param(
    [Parameter(Mandatory = $true)] [string]$BaseUrl,
    [Parameter(Mandatory = $true)] [string]$Email,
    [Parameter(Mandatory = $true)] [string]$Password,
    [switch]$RunDeepVerify
)

$ErrorActionPreference = "Stop"

function Invoke-Json($Method, $Path, $Body, $Token) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $json = if ($Body) { $Body | ConvertTo-Json -Depth 5 } else { $null }
    Invoke-RestMethod -Method $Method -Uri "$BaseUrl$Path" -Headers $headers -Body $json
}

# SSE call: curl.exe giữ kết nối tới khi server gửi [DONE] rồi trả toàn bộ text.
# Trả về message của event cuối cùng có field "message".
function Send-ChatMessage($Token, $SessionId, $Message, $ConfirmVerify, $TimeoutSec = 200) {
    $body = @{ message = $Message; sessionId = $SessionId }
    if ($ConfirmVerify) { $body.confirmVerify = $true }
    $json = $body | ConvertTo-Json -Compress
    $tmp = New-TemporaryFile
    Set-Content -Path $tmp -Value $json -Encoding utf8
    try {
        $raw = & curl.exe -s -N --max-time $TimeoutSec -X POST "$BaseUrl/api/v1/chat/message" `
            -H "Authorization: Bearer $Token" -H "Content-Type: application/json" `
            --data-binary "@$tmp"
    } finally {
        Remove-Item $tmp -Force -Confirm:$false
    }
    $lastMsg = $null
    foreach ($line in ($raw -split "`n")) {
        if ($line -notmatch '^data:') { continue }
        $payload = $line.Substring(5).Trim()
        if ($payload -eq '[DONE]') { continue }
        try {
            $evt = $payload | ConvertFrom-Json
            if ($evt.message) { $lastMsg = $evt.message }
        } catch {}
    }
    return $lastMsg
}

Write-Host "== Đăng nhập $Email ==" -ForegroundColor Cyan
$login = Invoke-Json POST "/api/v1/auth/login" @{ email = $Email; password = $Password } $null
$token = $login.token
Write-Host "OK — plan=$($login.planName) quota=$($login.quotaRemaining)"

Write-Host "`n== Tạo session demo ==" -ForegroundColor Cyan
$session = Invoke-Json POST "/api/v1/chat/sessions" @{ title = "Demo bảo vệ" } $token
$sessionId = $session.id
Write-Host "Session: $sessionId"

# ── Kịch bản seed: mỗi lệnh 1 moment demo, cách nhau 16s để né rate limit 20/5phút ──
$seedCommands = @(
    # 1. Lookup công ty VN lớn (miễn phí, nhanh) — moment "tra cứu MST thật"
    "tra cứu công ty cổ phần sữa Việt Nam Vinamilk",
    # 2. Lookup công ty quốc tế (GLEIF LEI) — moment "190+ quốc gia"
    "tra cứu Toyota Motor Corporation Nhật Bản",
    # 3. Lookup tên dính trừng phạt — moment HARD STOP (ấn tượng nhất)
    "tra cứu Rosneft Oil Company",
    # 4. Tìm đối tác — moment lead extraction + sanctions pre-screen
    "tìm buyer nhập khẩu cà phê tại Đức",
    # 5. Câu hỏi nghiệp vụ — moment persona + GENERAL_QA
    "phương thức thanh toán L/C có an toàn hơn T/T không?"
)

foreach ($cmd in $seedCommands) {
    Write-Host "`n>> $cmd" -ForegroundColor Yellow
    $reply = Send-ChatMessage $token $sessionId $cmd $false
    if ($null -eq $reply) { $reply = "(không có reply — kiểm tra log server)" }
    Write-Host $reply
    Start-Sleep -Seconds 16
}

if ($RunDeepVerify) {
    # Deep verify 2 công ty: 1 điểm cao (công ty lớn), 1 hard-stop.
    # Mỗi verify: gửi yêu cầu → nhận câu hỏi confirm → gửi lại với confirmVerify=true.
    $verifyTargets = @(
        "thẩm định công ty cổ phần sữa Việt Nam Vinamilk",
        "thẩm định Rosneft Oil Company"
    )
    foreach ($cmd in $verifyTargets) {
        Write-Host "`n== DEEP VERIFY: $cmd (5-8 phút) ==" -ForegroundColor Cyan
        $confirmAsk = Send-ChatMessage $token $sessionId $cmd $false
        Write-Host "Confirm prompt: $confirmAsk"
        Start-Sleep -Seconds 3
        $result = Send-ChatMessage $token $sessionId "xác nhận" $true -TimeoutSec 600
        Write-Host "Kết quả: $result" -ForegroundColor Green
        Start-Sleep -Seconds 16
    }
}

Write-Host "`n== XONG ==" -ForegroundColor Green
Write-Host "Mở $BaseUrl (FE) đăng nhập $Email — session 'Demo bảo vệ' và các report đã sẵn sàng."
Write-Host "Checklist còn lại xem docs/demo-playbook.md"
