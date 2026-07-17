# MarketScout

**Nền tảng thẩm định đối tác thương mại quốc tế bằng AI.** Nhập tên công ty, hệ thống tự động quét dữ liệu công khai từ 8 nguồn độc lập ("8 trụ cột") và trả về điểm tin cậy 0–100 kèm khuyến nghị hành động cụ thể — trong vài phút thay vì tra cứu thủ công từng nguồn.

> Dự án capstone của Team ARAM #278.

---

## Mục lục

1. [Vấn đề giải quyết](#vấn-đề-giải-quyết)
2. [Luồng hoạt động tổng quan](#luồng-hoạt-động-tổng-quan)
3. [Mô hình chấm điểm — 8 Trụ cột (Deep Verify™)](#mô-hình-chấm-điểm--8-trụ-cột-deep-verify)
4. [Hai tính năng AI hỗ trợ ra quyết định](#hai-tính-năng-ai-hỗ-trợ-ra-quyết-định)
5. [Trụ cột P7 — Xác minh hợp đồng thật](#trụ-cột-p7--xác-minh-hợp-đồng-thật)
6. [Mô hình gói dịch vụ & Thanh toán](#mô-hình-gói-dịch-vụ--thanh-toán)
7. [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)
8. [Tổng kết tính năng đã hoàn thiện](#tổng-kết-tính-năng-đã-hoàn-thiện)
9. [Tech Stack](#tech-stack)
10. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
11. [Bắt đầu (Getting Started)](#bắt-đầu-getting-started)
12. [Triển khai (Deployment)](#triển-khai-deployment)
13. [Tài liệu kỹ thuật chuyên sâu](#tài-liệu-kỹ-thuật-chuyên-sâu)

---

## Vấn đề giải quyết

Khi một doanh nghiệp Việt Nam chuẩn bị giao thương với một đối tác nước ngoài (hoặc ngược lại) — mua hàng, bán hàng, ký hợp đồng xuất nhập khẩu — câu hỏi đầu tiên luôn là:

> **"Đối tác này có đáng tin không? Nếu chuyển tiền/đặt cọc, có rủi ro bị lừa không?"**

Trước giờ, việc kiểm tra này thường làm thủ công: tra cứu từng nguồn (đăng ký kinh doanh, website, tin tức, danh sách trừng phạt...), rất tốn thời gian, dễ bỏ sót, và không có một con số/điểm số rõ ràng để so sánh giữa nhiều đối tác.

**MarketScout là nền tảng "thẩm định đối tác thương mại" tự động bằng AI** — người dùng chỉ cần nhập tên công ty, hệ thống tự động quét nhiều nguồn dữ liệu công khai, chấm điểm theo 8 tiêu chí độc lập, và trả về **một báo cáo trực quan + điểm tin cậy tổng (0–100)** trong vài phút, kèm khuyến nghị hành động cụ thể.

**Khách hàng mục tiêu**: doanh nghiệp xuất nhập khẩu, môi giới thương mại, bộ phận mua hàng/kế toán công nợ cần xác minh đối tác trước khi ký kết hoặc chuyển tiền.

## Luồng hoạt động tổng quan

```
Người dùng nhập tên công ty + quốc gia
            ↓
   Hệ thống trừ 1 "credit" (quota) của tài khoản
            ↓
   AI quét song song 8 nguồn dữ liệu (8 trụ cột)
            ↓
   Nếu dính danh sách trừng phạt → HARD STOP ngay lập tức
            ↓
   Chấm điểm từng trụ cột (0-100) + gộp thành Điểm tin cậy tổng
            ↓
   Sinh báo cáo: điểm tổng, mức rủi ro, chi tiết từng trụ cột,
   phân tích "Deal Safety" (rủi ro giao dịch), khuyến nghị hành động AI
            ↓
   Người dùng xem báo cáo, có thể bổ sung "Thông tin giao dịch"
   (tự khai hoặc upload hợp đồng thật) để tăng độ chính xác của điểm
```

Mỗi lần thẩm định tiêu tốn **1 credit** trong hạn mức (quota) hàng tháng của tài khoản — đây là đơn vị tính phí cốt lõi của sản phẩm (xem mục [Mô hình gói dịch vụ & Thanh toán](#mô-hình-gói-dịch-vụ--thanh-toán)).

## Mô hình chấm điểm — 8 Trụ cột (Deep Verify™)

Mỗi đối tác được đánh giá độc lập theo 8 khía cạnh, mỗi khía cạnh có **trọng số** (đóng góp bao nhiêu % vào điểm tổng) và trạng thái **PASS / WARN / FAIL / N/A**:

| # | Trụ cột | Trọng số | Kiểm tra điều gì | Nguồn dữ liệu |
|---|---|---|---|---|
| 1 | **Pháp lý** (Entity Validation) | 22% | Doanh nghiệp có tồn tại, đang hoạt động hợp pháp không | GLEIF, cơ quan đăng ký, mã số thuế |
| 2 | **Số hóa** (Digital Footprint) | 10% | Có website chính thức, tên miền, hiện diện online rõ ràng | RDAP (tên miền), tìm kiếm web (Tavily) |
| 3 | **Thương mại** (Trade Activity) | 15% | Có lịch sử xuất nhập khẩu thực tế không | Dữ liệu thương mại công khai, Tavily |
| 4 | **Nhận dạng** (Identity Consistency) | 12% | Tên, địa chỉ, thông tin liên hệ có khớp giữa các nguồn | Google Places, Nominatim (OpenStreetMap) |
| 5 | **Tài chính** (Financial & Tax) | 12% | Tuân thủ thuế, có báo cáo tài chính | Cơ quan thuế, Companies House (UK), SEC EDGAR (US) |
| 6 | **Trừng phạt** (Sanctions) | 18% | Có nằm trong danh sách cấm vận/PEP quốc tế không — **có thể gây HARD STOP** | OpenSanctions |
| 7 | **Giao dịch** (Deal Structure Risk) | 4% | Cấu trúc giao dịch có an toàn không | Hợp đồng thật đã upload + AI (Gemini) |
| 8 | **Vật lý** (Operational Proof) | 7% | Nhà máy/văn phòng có thật, ảnh không phải ảnh giả (stock photo) | TinEye, xác minh địa điểm |

**Nguyên tắc quan trọng**: nếu một trụ cột **không đủ dữ liệu để kiểm tra** (ví dụ nguồn dữ liệu tạm thời không trả lời được), nó bị đánh dấu **N/A** và **loại hẳn khỏi phép tính điểm tổng** — không bị coi là "điểm 0". Điều này tránh việc một công ty tốt bị điểm thấp oan chỉ vì thiếu dữ liệu, không phải vì có vấn đề thật.

**Trụ cột Trừng phạt (P6)** là đặc biệt: nếu phát hiện trùng khớp danh sách cấm vận, hệ thống **dừng ngay** (Hard Stop) và cảnh báo "không nên giao dịch", bất kể điểm các trụ cột khác cao thế nào.

Người dùng có thể xem giải thích chi tiết cách từng trụ cột hoạt động tại trang **"Phương pháp luận" (Methodology)** trong ứng dụng — trang này liệt kê rõ mỗi trụ cột kiểm tra gì, phân tích ra sao, dùng nguồn nào, và ý nghĩa của PASS/WARN/FAIL.

## Hai tính năng AI hỗ trợ ra quyết định

Sau khi có báo cáo, hệ thống sinh thêm **2 khối phân tích AI riêng biệt**, mỗi khối trả lời một câu hỏi khác nhau:

### Deal Safety Analysis (Phân tích an toàn giao dịch)
- Trả lời: **"Nếu giao dịch với đối tác này, nên dùng Incoterm và phương thức thanh toán nào?"**
- Dựa trên điểm tổng + mức rủi ro, AI đưa ra khuyến nghị cụ thể, ví dụ: *"Rủi ro cao → dùng L/C, đặt cọc ≤20%, yêu cầu hợp đồng công chứng"*.
- Chạy tự động ngay sau khi có kết quả thẩm định, không cần người dùng yêu cầu.

### AI Recommendations (hiển thị trên trang báo cáo)
- Trả lời 3 câu hỏi thực tế hơn:
  1. Nên làm gì tiếp theo?
  2. Cần yêu cầu đối tác cung cấp thêm gì?
  3. Cần tự xác minh độc lập điều gì?
- Ưu tiên các trụ cột đang FAIL/WARN — ví dụ nếu trụ cột Tài chính yếu, AI sẽ gợi ý "yêu cầu đối tác cung cấp báo cáo tài chính và mã số thuế".
- Nếu AI tạm thời không phản hồi được, hệ thống vẫn hiển thị một bộ khuyến nghị dự phòng (rule-based) dựa trên đúng các trụ cột yếu — không bao giờ để trống phần này.

## Trụ cột P7 — Xác minh hợp đồng thật

Trụ cột P7 (Rủi ro cấu trúc giao dịch) hoạt động theo nguyên tắc: **chỉ hợp đồng thật, đã xác minh khớp đối tác, mới được tính điểm** — tránh trường hợp người dùng tự khai khống để "làm đẹp" điểm số.

**Luồng hoạt động:**

1. **Tự khai báo (tham khảo, không tính điểm)** — người dùng có thể điền tay các thông tin giao dịch (phương thức thanh toán, % đặt cọc, giá trị giao dịch) ngay trên trang báo cáo. Dữ liệu này **chỉ để tham khảo**, không bao giờ ảnh hưởng điểm số — vì không ai kiểm chứng được nó có đúng sự thật không.
2. **Upload hợp đồng thật → AI đọc và trích xuất** — nếu người dùng có hợp đồng đã ký, họ upload file (PDF/ảnh, tối đa 10MB). AI (Gemini) đọc trực tiếp nội dung file và tự động trích xuất: Incoterm, % đặt cọc, phương thức thanh toán, có điều khoản trọng tài không, tên và mã số thuế bên ký kết — mỗi thông tin kèm **% độ tin cậy** để người dùng biết AI chắc chắn tới đâu.
3. **Đối chiếu chéo tự động** — hệ thống so khớp tên/mã số thuế bên ký kết trong hợp đồng với chính đối tác đang được thẩm định (dữ liệu đã có từ trụ cột Pháp lý).
   - **Khớp** → hợp đồng được đánh dấu "Đã xác minh", dữ liệu từ hợp đồng thật sự đóng góp vào điểm P7.
   - **Không khớp** → hệ thống cảnh báo rõ ràng, dữ liệu vẫn được lưu lại để tham khảo nhưng **không tính điểm**.
4. **Sửa tay sau khi AI đọc → mất trạng thái xác minh cho riêng trường đó** — nếu người dùng sửa lại 1 con số AI đọc được, thì chỉ riêng trường đó rớt về "chưa xác minh", các trường khác không bị ảnh hưởng. Đây là chốt chặn quan trọng: không cho phép upload hợp đồng thật rồi âm thầm sửa số liệu mà vẫn được tính là "đã xác minh".
5. **Thư viện hợp đồng tái sử dụng** — hợp đồng đã upload được lưu vào "thư viện" của người dùng, dùng lại cho nhiều lần thẩm định khác nhau mà không cần upload lại. Mỗi lần dùng lại, hệ thống luôn chạy lại đối chiếu chéo — một hợp đồng "khớp" với đối tác A không có nghĩa nó cũng khớp với đối tác B.

**Kết quả**: khi hợp đồng đã được xác minh khớp, điểm tổng của báo cáo được cập nhật ngay lập tức (không cần quét lại từ đầu, không tốn thêm credit) — trụ cột P7 chuyển từ N/A sang có điểm thật, đóng góp 4% vào điểm tổng.

## Mô hình gói dịch vụ & Thanh toán

### Gói thuê bao (Subscription Plans)

| Gói | Giá/tháng | Số lượt thẩm định/tháng |
|---|---|---|
| Free | 0đ | 5 |
| Starter | 249.000đ | 30 |
| Pro | 749.000đ | 100 |
| Enterprise | 2.490.000đ | 500 |

Mỗi tài khoản có **"quota" (hạn mức credit)** reset hàng tháng theo gói đang dùng. Mỗi lần thẩm định = trừ 1 credit. Nếu pipeline thẩm định bị lỗi giữa chừng, hệ thống **tự động hoàn lại credit** cho người dùng.

### Mua thêm credit lẻ (Top-up)
Ngoài gói thuê bao, người dùng có thể mua thêm credit lẻ (200.000đ/credit) mà không cần nâng gói.

### Thanh toán tự động qua VietQR (SePay)

1. Người dùng chọn mua gói hoặc top-up → hệ thống tạo mã QR chuyển khoản (VietQR) với nội dung chuyển khoản duy nhất.
2. Khách hàng quét mã, chuyển khoản qua ngân hàng.
3. **SePay tự động gửi webhook về hệ thống ngay khi tiền về** → hệ thống xác thực, đối chiếu đúng mã + đúng số tiền.
4. **Tự động**: cộng credit hoặc nâng gói cho tài khoản, gửi email hóa đơn/biên nhận cho khách hàng — không cần nhân viên can thiệp thủ công.
5. **Cơ chế chống lỗi kép**: nếu webhook bị gọi lại (SePay tự động retry khi gặp lỗi), hệ thống nhận diện đã xử lý rồi và không cộng tiền/credit 2 lần.
6. **Lưới an toàn dự phòng**: nếu webhook không bao giờ tới được server (sập mạng, cấu hình sai), một tiến trình nền tự động quét lại giao dịch ngân hàng mỗi 90 giây để "vớt" các đơn hàng bị bỏ sót.

Tính năng này đã được kiểm thử round-trip thật trên môi trường production (tạo đơn hàng thật → giả lập webhook thật → xác nhận cộng credit đúng, không cộng trùng khi gọi lại).

## Câu hỏi thường gặp

**Vì sao một công ty tốt vẫn có thể bị điểm không cao?**
Điểm phản ánh mức độ xác minh được, không phải "công ty xấu". Một công ty rất nhỏ, mới thành lập, ít hiện diện online vẫn có thể là đối tác tốt — nhưng hệ thống chưa đủ dữ liệu để xác nhận, nên điểm sẽ thận trọng hơn.

**Trụ cột Trừng phạt quan trọng thế nào?**
Đây là trụ cột duy nhất có thể dừng toàn bộ giao dịch ngay lập tức (Hard Stop) — vì giao dịch với cá nhân/tổ chức trong danh sách cấm vận có thể vi phạm pháp luật quốc tế, hậu quả nghiêm trọng hơn nhiều so với rủi ro thương mại thông thường.

**Tại sao phải upload hợp đồng thật thay vì tự nhập tay là được?**
Vì tự nhập tay không ai kiểm chứng được — một bên có thể khai "có hợp đồng an toàn" dù thực tế không có, để điểm số trông đẹp hơn. Yêu cầu hợp đồng thật + đối chiếu chéo với danh tính đối tác là cách duy nhất đảm bảo dữ liệu P7 phản ánh đúng thực tế trước khi cho nó ảnh hưởng điểm.

## Tổng kết tính năng đã hoàn thiện

- ✅ Thẩm định đối tác tự động qua 8 trụ cột, sinh điểm tin cậy 0–100
- ✅ Cơ chế Hard Stop tự động khi phát hiện trừng phạt/cấm vận
- ✅ Trang "Phương pháp luận" giải thích minh bạch cách chấm điểm cho khách hàng
- ✅ Phân tích Deal Safety (khuyến nghị Incoterm/thanh toán) tự động sau mỗi báo cáo
- ✅ Khuyến nghị hành động từ AI (nên làm gì / cần hỏi gì / cần tự kiểm chứng gì)
- ✅ Trụ cột P7 (Giao dịch): tự khai báo tham khảo + upload hợp đồng thật, AI trích xuất, đối chiếu chéo, chỉ hợp đồng khớp mới tính điểm, sửa tay mất xác minh riêng từng trường, thư viện hợp đồng tái sử dụng
- ✅ Find Partners — tìm đối tác B2B tiềm năng qua AI, tự động lọc danh sách trừng phạt
- ✅ AI Chat Assistant (Gemini) — tư vấn thương mại quốc tế, có thể kích hoạt thẩm định ngay trong chat
- ✅ Mô hình gói thuê bao + quota hàng tháng + hoàn credit tự động khi lỗi
- ✅ Mua credit lẻ (top-up) không cần nâng gói
- ✅ Thanh toán VietQR tự động qua SePay: webhook xác nhận, tự cộng credit/nâng gói, gửi email hóa đơn, chống cộng trùng, có lưới an toàn dự phòng khi mất webhook — đã kiểm thử thật trên production
- ✅ Admin panel — quản lý khách hàng, billing, quota matrix, system logs
- ✅ Đa ngôn ngữ — toàn bộ giao diện hỗ trợ English / Tiếng Việt, mặc định English

## Tech Stack

**Backend** — `backend/`
- Java 21, Spring Boot 4.0.4 (Web, Security, Data JPA, Validation, Actuator)
- PostgreSQL (JDBC), Redis (cache/session)
- JWT (jjwt) cho authentication
- Gemini API (Google AI Studio) cho AI chat/scoring/contract extraction
- Tavily (web search), GLEIF, RDAP, Nominatim (OpenStreetMap), TinEye, OpenSanctions, Companies House / SEC EDGAR — nguồn dữ liệu crawl cho từng trụ cột
- SePay (VietQR) cho thanh toán
- springdoc-openapi (Swagger UI), Lombok, ModelMapper

**Frontend** — `frontend/`
- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui
- react-hook-form + zod, axios, sonner (toast), next-themes

## Cấu trúc thư mục

```
backend/src/main/java/com/example/backend/
├── auth/            # Đăng ký/đăng nhập, JWT, refresh token
├── verification/    # Pipeline thẩm định 8 trụ cột, scoring
├── partners/         # Find Partners (tìm đối tác B2B)
├── report/           # Báo cáo thẩm định, Deal Safety, AI recommendations
├── contract/         # Upload hợp đồng, AI extraction, đối chiếu chéo (P7)
├── chat/             # AI Chat Assistant (Gemini)
├── payment/           # VietQR/SePay, quota top-up, subscription
├── quota/             # Quota/credit theo gói
├── admin/             # Admin panel APIs
├── domain/            # Entities, repositories dùng chung
├── shared/            # Utilities, config dùng chung
└── config/            # Security, CORS, Redis, Swagger...

frontend/app/
├── (auth)/            # login, register, forgot/reset password
├── dashboard/          # Trang chủ sau đăng nhập
├── verify/             # Thẩm định doanh nghiệp
├── find-partners/      # Tìm đối tác
├── chat/               # AI Assistant
├── reports/            # Danh sách báo cáo
├── checkout/           # Thanh toán VietQR
├── profile/            # Tài khoản, quota, billing
├── admin/              # Admin panel
└── page.tsx            # Landing page
```

## Bắt đầu (Getting Started)

### Yêu cầu

- Java 21+, Maven (hoặc dùng `./mvnw` có sẵn)
- Node.js 24.x, npm
- PostgreSQL 14+
- Redis (local qua Docker hoặc cài trực tiếp)

### 1. Database

Tạo database `marketscout` trên PostgreSQL rồi chạy script schema duy nhất:

```bash
psql -U postgres -d marketscout -f database_production_v4.sql
```

Script này tạo toàn bộ bảng, seed 4 gói dịch vụ, scoring config và tài khoản admin mặc định.

### 2. Backend

```bash
cd backend
cp .env.example .env   # điền JWT_SECRET, DB_PASSWORD, GEMINI_API_KEY, TAVILY_API_KEY, ...
./mvnw spring-boot:run
```

Backend chạy ở `http://localhost:8080`. Swagger UI: `http://localhost:8080/swagger-ui.html`.

Danh sách đầy đủ biến môi trường (JWT, PostgreSQL, Redis, Mailtrap, Gemini, Tavily, Nominatim, TinEye, OpenSanctions, SePay...) kèm link đăng ký API key miễn phí cho từng nguồn dữ liệu nằm trong `backend/.env.example` — copy sang `.env` rồi điền giá trị thật, file `.env` không được commit vào git.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy ở `http://localhost:3000`, gọi API qua biến `NEXT_PUBLIC_API_URL` (mặc định trỏ về `http://localhost:8080`, cấu hình trong `.env.local`).

## Triển khai (Deployment)

Cả hai service deploy độc lập trên Railway, mỗi thư mục có `railway.toml` riêng:
- **Backend**: build jar bằng Maven, chạy `java -jar target/backend-0.0.1-SNAPSHOT.jar`, health check tại `/actuator/health/liveness`.
- **Frontend**: build Next.js standalone, chạy `node .next/standalone/server.js`.

## Tài liệu kỹ thuật chuyên sâu

Các phần trên đã đủ để hiểu toàn bộ nghiệp vụ và cách chạy dự án. Nếu cần đào sâu hơn về mặt kỹ thuật:

- [README_contract_verification_feature.md](./README_contract_verification_feature.md) — chi tiết implementation tính năng xác minh hợp đồng (P7): schema, API, luồng AI extraction
- [CTO_HANDOFF.md](./CTO_HANDOFF.md) — bàn giao kỹ thuật, quyết định kiến trúc

---

Được phát triển bởi **Team ARAM #278**.
