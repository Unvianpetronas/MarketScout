import Link from "next/link";
import { BarChart2, Shield, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    id: "introduction",
    title: "1. Giới thiệu",
    content: `Chào mừng bạn đến với MarketScout ("chúng tôi", "của chúng tôi"). Chúng tôi cung cấp nền tảng thẩm định đối tác thương mại quốc tế dựa trên trí tuệ nhân tạo. Chính sách quyền riêng tư này giải thích cách chúng tôi thu thập, sử dụng, bảo vệ và chia sẻ thông tin của bạn khi bạn sử dụng dịch vụ MarketScout tại marketscout.aram.vn và các ứng dụng liên quan.

Bằng cách truy cập hoặc sử dụng dịch vụ của chúng tôi, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý với Chính sách quyền riêng tư này.`,
  },
  {
    id: "information-collected",
    title: "2. Thông tin chúng tôi thu thập",
    content: `**Thông tin bạn cung cấp trực tiếp:**
• Thông tin tài khoản: họ và tên, địa chỉ email, tên công ty, mật khẩu đã được mã hóa.
• Thông tin thanh toán: chúng tôi không lưu trữ dữ liệu thẻ tín dụng; các giao dịch được xử lý qua cổng thanh toán bên thứ ba an toàn (VietQR, Stripe).
• Nội dung bạn gửi: tên công ty, mã số thuế, quốc gia trong các yêu cầu thẩm định; tin nhắn trong hệ thống chat AI.

**Thông tin thu thập tự động:**
• Dữ liệu sử dụng: số lần truy cập, tính năng được sử dụng, thời gian trên trang, lịch sử truy vấn thẩm định.
• Thông tin thiết bị: địa chỉ IP, loại trình duyệt, hệ điều hành, thông tin phiên.
• Cookie và công nghệ theo dõi tương tự: dùng cho xác thực phiên và phân tích hiệu suất.

**Dữ liệu từ nguồn bên thứ ba (phục vụ thẩm định):**
Khi bạn yêu cầu thẩm định một tổ chức, chúng tôi thu thập dữ liệu từ các nguồn công khai bao gồm: GLEIF, OpenSanctions, cơ quan đăng ký kinh doanh, hồ sơ pháp lý công khai. Dữ liệu này được xử lý và lưu trữ để cung cấp báo cáo cho bạn.`,
  },
  {
    id: "how-we-use",
    title: "3. Cách chúng tôi sử dụng thông tin",
    content: `Chúng tôi sử dụng thông tin thu thập được để:

• **Cung cấp dịch vụ:** xử lý yêu cầu thẩm định, tạo báo cáo 8 trụ cột, vận hành chatbot AI hỗ trợ.
• **Quản lý tài khoản:** xác thực danh tính, quản lý hạn ngạch và gói dịch vụ.
• **Thanh toán & hóa đơn:** xử lý giao dịch, phát hành hóa đơn.
• **Cải thiện dịch vụ:** phân tích dữ liệu tổng hợp để nâng cao độ chính xác của thuật toán thẩm định.
• **Bảo mật:** phát hiện và ngăn chặn gian lận, truy cập trái phép.
• **Liên lạc:** gửi thông báo kỹ thuật, cập nhật chính sách, hỗ trợ khách hàng.
• **Tuân thủ pháp lý:** đáp ứng các yêu cầu của cơ quan quản lý có thẩm quyền.`,
  },
  {
    id: "data-sharing",
    title: "4. Chia sẻ thông tin",
    content: `Chúng tôi không bán thông tin cá nhân của bạn. Chúng tôi chỉ chia sẻ thông tin trong các trường hợp sau:

• **Nhà cung cấp dịch vụ:** các đối tác kỹ thuật hỗ trợ vận hành (dịch vụ đám mây, phân tích dữ liệu, cổng thanh toán) đều ký thỏa thuận bảo mật và chỉ xử lý dữ liệu theo chỉ định của chúng tôi.
• **Nguồn dữ liệu công khai:** trong quá trình thẩm định, chúng tôi truy vấn các cơ sở dữ liệu bên thứ ba (GLEIF, OpenSanctions, v.v.) bằng tên công ty/mã số thuế bạn cung cấp.
• **Yêu cầu pháp lý:** chúng tôi có thể tiết lộ thông tin khi được yêu cầu bởi pháp luật, lệnh của tòa án, hoặc cơ quan nhà nước có thẩm quyền.
• **Chuyển nhượng doanh nghiệp:** trong trường hợp sáp nhập, mua lại hoặc bán tài sản, thông tin người dùng có thể được chuyển giao với cam kết tiếp tục tuân thủ chính sách này.`,
  },
  {
    id: "data-retention",
    title: "5. Lưu trữ và bảo mật dữ liệu",
    content: `**Thời gian lưu trữ:**
• Dữ liệu tài khoản: lưu trữ trong suốt thời gian tài khoản hoạt động và 30 ngày sau khi xóa tài khoản.
• Báo cáo thẩm định: lưu trữ 12 tháng kể từ ngày tạo, sau đó bị ẩn danh hóa hoặc xóa.
• Nhật ký hệ thống: lưu trữ tối đa 90 ngày.

**Biện pháp bảo mật:**
• Mã hóa dữ liệu truyền tải bằng TLS 1.3.
• Mã hóa mật khẩu bằng thuật toán bcrypt.
• Kiểm soát truy cập theo vai trò (RBAC).
• Token JWT với thời gian hết hạn ngắn và cơ chế làm mới an toàn.
• Giám sát liên tục và kiểm tra bảo mật định kỳ.

Mặc dù chúng tôi áp dụng các biện pháp bảo mật phù hợp với tiêu chuẩn ngành, không có phương thức truyền tải hoặc lưu trữ dữ liệu nào đảm bảo an toàn tuyệt đối 100%.`,
  },
  {
    id: "user-rights",
    title: "6. Quyền của bạn",
    content: `Bạn có các quyền sau đối với dữ liệu cá nhân của mình:

• **Quyền truy cập:** yêu cầu bản sao dữ liệu chúng tôi lưu trữ về bạn.
• **Quyền chỉnh sửa:** cập nhật thông tin không chính xác qua trang hồ sơ tài khoản.
• **Quyền xóa:** yêu cầu xóa tài khoản và dữ liệu liên quan (ngoại trừ dữ liệu cần thiết cho nghĩa vụ pháp lý).
• **Quyền phản đối:** phản đối việc xử lý dữ liệu cho mục đích tiếp thị.
• **Quyền hạn chế:** yêu cầu hạn chế xử lý trong một số trường hợp nhất định.
• **Quyền di chuyển dữ liệu:** nhận dữ liệu của bạn dưới định dạng có thể đọc máy.

Để thực hiện bất kỳ quyền nào trên, vui lòng liên hệ: compliance@marketscout.aram.vn`,
  },
  {
    id: "cookies",
    title: "7. Cookie và công nghệ theo dõi",
    content: `Chúng tôi sử dụng các loại cookie sau:

• **Cookie thiết yếu:** cần thiết để vận hành dịch vụ (xác thực phiên, bảo mật CSRF). Không thể tắt.
• **Cookie hiệu suất:** giúp chúng tôi hiểu cách người dùng tương tác với dịch vụ (phân tích tổng hợp, ẩn danh). Có thể tắt.
• **Cookie chức năng:** ghi nhớ tùy chọn của bạn (ngôn ngữ, cài đặt giao diện). Có thể tắt.

Bạn có thể quản lý cookie trong cài đặt trình duyệt. Lưu ý rằng tắt cookie thiết yếu có thể ảnh hưởng đến chức năng dịch vụ.`,
  },
  {
    id: "international",
    title: "8. Chuyển dữ liệu quốc tế",
    content: `MarketScout hoạt động tại Việt Nam và có thể sử dụng các nhà cung cấp dịch vụ đám mây có máy chủ ở nước ngoài. Khi dữ liệu được chuyển ra ngoài Việt Nam, chúng tôi đảm bảo:

• Áp dụng các điều khoản bảo vệ dữ liệu hợp đồng phù hợp.
• Chỉ chuyển đến các quốc gia hoặc tổ chức có mức độ bảo vệ dữ liệu tương đương hoặc cao hơn.
• Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân của Việt Nam.`,
  },
  {
    id: "children",
    title: "9. Quyền riêng tư của trẻ em",
    content: `Dịch vụ MarketScout không dành cho người dưới 18 tuổi. Chúng tôi không cố ý thu thập thông tin cá nhân từ trẻ em. Nếu bạn phát hiện rằng trẻ em đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ để chúng tôi xóa ngay lập tức.`,
  },
  {
    id: "changes",
    title: "10. Thay đổi chính sách",
    content: `Chúng tôi có thể cập nhật Chính sách quyền riêng tư này theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ:
• Cập nhật ngày "Có hiệu lực từ" ở đầu trang.
• Gửi thông báo qua email hoặc thông báo trong ứng dụng cho người dùng có tài khoản.

Việc tiếp tục sử dụng dịch vụ sau khi thay đổi được đăng tải đồng nghĩa với việc bạn chấp nhận chính sách mới.`,
  },
  {
    id: "contact",
    title: "11. Liên hệ",
    content: `Nếu bạn có câu hỏi, khiếu nại hoặc muốn thực hiện quyền của mình, vui lòng liên hệ:

**MarketScout — Team ARAM #278**
Email: compliance@marketscout.aram.vn
Địa chỉ: Suite 1803, PetroVietnam Tower, Quận 1, TP. Hồ Chí Minh, Việt Nam

Chúng tôi cam kết phản hồi trong vòng 5 ngày làm việc.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00D26A] flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">MarketScout</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0A1A12] to-[#0D2218] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00D26A]/15 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-[#00D26A]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Chính sách quyền riêng tư</h1>
          <p className="text-gray-400 text-sm">
            Có hiệu lực từ: 01 tháng 6 năm 2026 &nbsp;·&nbsp; Cập nhật lần cuối: 30 tháng 6 năm 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-10">
          {/* TOC sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Nội dung</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-gray-500 hover:text-[#00A859] py-1 transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <article className="flex-1 min-w-0">
            <div className="bg-[#E6F9F0] border border-[#00D26A]/20 rounded-2xl p-5 mb-10">
              <p className="text-sm text-[#00843F] leading-relaxed">
                <strong>Tóm tắt:</strong> MarketScout thu thập dữ liệu cần thiết để cung cấp dịch vụ thẩm định đối tác. Chúng tôi không bán dữ liệu của bạn. Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình.
              </p>
            </div>

            <div className="space-y-10">
              {SECTIONS.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    {s.title}
                  </h2>
                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {s.content.split(/\*\*(.*?)\*\*/).map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-gray-800">{part}</strong> : part
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} MarketScout. Phát triển bởi Team ARAM #278.</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <Link href="/terms-of-service" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="text-[#00A859]">Privacy Policy</Link>
          <span>·</span>
          <Link href="/support-desk" className="hover:text-gray-600 transition-colors">Support Desk</Link>
        </div>
      </footer>
    </div>
  );
}
