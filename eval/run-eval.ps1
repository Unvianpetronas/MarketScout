# run-eval.ps1 — Đo độ chính xác nhận diện công ty của MarketScout (P1 + P6).
#
# Chạy LOOKUP (miễn phí, không tốn quota) cho từng công ty trong companies.csv
# và so kết quả với nhãn expected:
#   ACTIVE     — hệ thống phải tìm thấy đăng ký (MST/LEI) và không cảnh báo trừng phạt
#   SANCTIONED — hệ thống phải gắn cờ trừng phạt
#   NOT_FOUND  — hệ thống phải trả "không tìm thấy" (không được bịa ra kết quả)
#
# Output: bảng kết quả + tỷ lệ đúng tổng và theo nhóm, lưu eval/results-<ngày>.csv.
# Dùng con số này cho slide "Đánh giá độ chính xác" khi bảo vệ.
#
# Cách dùng:
#   .\eval\run-eval.ps1 -BaseUrl "http://localhost:8080" -Email "demo@..." -Password "..."
#
# Lưu ý: chat rate-limit 20 tin / 5 phút / user → script tự nghỉ 16s giữa các lần gọi.
# 20 công ty chạy hết ~6-8 phút.

param(
    [Parameter(Mandatory = $true)] [string]$BaseUrl,
    [Parameter(Mandatory = $true)] [string]$Email,
    [Parameter(Mandatory = $true)] [string]$Password,
    [string]$CsvPath = "$PSScriptRoot\companies.csv",
    [int]$DelaySeconds = 16
)

$ErrorActionPreference = "Stop"

$login = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/v1/auth/login" `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)
$token = $login.token
Write-Host "Đăng nhập OK ($($login.email))" -ForegroundColor Cyan

function Get-LookupMessage($Name) {
    $body = @{ message = "tra cứu $Name" } | ConvertTo-Json -Compress
    $tmp = New-TemporaryFile
    Set-Content -Path $tmp -Value $body -Encoding utf8
    try {
        $raw = & curl.exe -s -N --max-time 120 -X POST "$BaseUrl/api/v1/chat/message" `
            -H "Authorization: Bearer $token" -H "Content-Type: application/json" `
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

# Phân loại kết quả từ message của handleLookup (xem ChatService.handleLookup):
#   trừng phạt  → "nằm trong danh sách trừng phạt"
#   tìm thấy    → có "MST:" hoặc "LEI:" hoặc "Trạng thái:"
#   không thấy  → "Không tìm thấy thông tin đăng ký"
function Classify($Message) {
    if ($null -eq $Message) { return "ERROR" }
    if ($Message -match "trừng phạt") { return "SANCTIONED" }
    if ($Message -match "Không tìm thấy thông tin đăng ký") { return "NOT_FOUND" }
    if ($Message -match "MST:|LEI:|Trạng thái:") { return "ACTIVE" }
    return "UNKNOWN"
}

$rows = Import-Csv $CsvPath
$results = @()
$i = 0
foreach ($row in $rows) {
    $i++
    Write-Host "[$i/$($rows.Count)] $($row.companyName) (expected: $($row.expected))" -ForegroundColor Yellow
    $msg = Get-LookupMessage $row.companyName
    $actual = Classify $msg
    $pass = ($actual -eq $row.expected)
    $results += [PSCustomObject]@{
        companyName = $row.companyName
        expected    = $row.expected
        actual      = $actual
        pass        = $pass
        message     = if ($msg -and $msg.Length -gt 160) { $msg.Substring(0, 160) + "..." } else { $msg }
    }
    Write-Host ("  → {0}  [{1}]" -f $actual, $(if ($pass) { "PASS" } else { "FAIL" })) `
        -ForegroundColor $(if ($pass) { "Green" } else { "Red" })
    if ($i -lt $rows.Count) { Start-Sleep -Seconds $DelaySeconds }
}

Write-Host "`n===== KẾT QUẢ =====" -ForegroundColor Cyan
$results | Format-Table companyName, expected, actual, pass -AutoSize

$total = $results.Count
$passed = ($results | Where-Object pass).Count
Write-Host ("Tổng: {0}/{1} đúng = {2:P0}" -f $passed, $total, ($passed / $total)) -ForegroundColor Cyan
foreach ($group in ($results | Group-Object expected)) {
    $gp = ($group.Group | Where-Object pass).Count
    Write-Host ("  {0}: {1}/{2}" -f $group.Name, $gp, $group.Count)
}

$outPath = Join-Path $PSScriptRoot ("results-{0}.csv" -f (Get-Date -Format "yyyyMMdd-HHmm"))
$results | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8
Write-Host "`nĐã lưu: $outPath"
