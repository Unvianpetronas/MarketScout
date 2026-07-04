import Link from "next/link";
import { BarChart2, FileText, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    id: "agreement",
    title: "1. Chấp nhận điều khoản",
    content: `Bằng cách truy cập hoặc sử dụng nền tảng MarketScout ("Dịch vụ"), bạn ("Người dùng") đồng ý bị ràng buộc bởi các Điều khoản Dịch vụ này ("Điều khoản"). Nếu bạn không đồng ý với bất kỳ phần nào của Điều khoản, bạn không được phép truy cập hoặc sử dụng Dịch vụ.

Các Điều khoản này tạo thành toàn bộ thỏa thuận giữa bạn và MarketScout (vận hành bởi Team ARAM #278) liên quan đến Dịch vụ và thay thế tất cả các thỏa thuận trước đó.`,
  },
  {
    id: "service-description",
    title: "2. Mô tả dịch vụ",
    content: `MarketScout cung cấp nền tảng thẩm định đối tác thương mại quốc tế sử dụng trí tuệ nhân tạo, bao gồm:

• **Hệ thống thẩm định 8 trụ cột:** phân tích pháp lý, dấu vết số, lịch sử thương mại, nhận dạng, tài chính/thuế, kiểm tra danh sách trừng phạt, cấu trúc giao dịch và bằng chứng vận hành.
• **MarketScout AI Chat:** trợ lý AI hỗ trợ tư vấn thẩm định đối tác, tra cứu thông tin doanh nghiệp.
• **Báo cáo thẩm định:** hồ sơ đánh giá rủi ro chi tiết, có thể chia sẻ và xuất khẩu.
• **Tìm kiếm đối tác:** công cụ tìm kiếm và sàng lọc đối tác tiềm năng.

Chúng tôi bảo lưu quyền sửa đổi, tạm ngừng hoặc ngừng bất kỳ phần nào của Dịch vụ mà không cần thông báo trước.`,
  },
  {
    id: "accounts",
    title: "3. Tài khoản người dùng",
    content: `**Đăng ký tài khoản:**
Bạn phải đăng ký tài khoản để truy cập hầu hết tính năng của Dịch vụ. Bạn cam kết cung cấp thông tin chính xác, đầy đủ và cập nhật trong quá trình đăng ký.

**Bảo mật tài khoản:**
Bạn chịu trách nhiệm duy trì tính bảo mật của thông tin đăng nhập và tất cả hoạt động xảy ra dưới tài khoản của bạn. Bạn phải thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép.

**Một tài khoản — một người:**
Mỗi tài khoản chỉ dành cho một người dùng. Không được chia sẻ thông tin đăng nhập hoặc tạo nhiều tài khoản cho cùng một tổ chức trừ khi sử dụng gói Enterprise có hỗ trợ đa tài khoản.

**Chấm dứt tài khoản:**
Chúng tôi có thể tạm ngừng hoặc chấm dứt tài khoản của bạn nếu vi phạm các Điều khoản này.`,
  },
  {
    id: "acceptable-use",
    title: "4. Sử dụng hợp lệ",
    content: `**Bạn được phép:**
• Sử dụng Dịch vụ cho mục đích thương mại hợp pháp của tổ chức bạn.
• Truy cập và tải xuống báo cáo thẩm định theo hạn ngạch gói dịch vụ.
• Chia sẻ báo cáo với đồng nghiệp trong cùng tổ chức.

**Bạn không được phép:**
• Sử dụng Dịch vụ cho mục đích bất hợp pháp hoặc vi phạm pháp luật của bất kỳ quốc gia nào.
• Tự động hóa truy cập (web scraping, bot) mà không có sự cho phép bằng văn bản.
• Bán lại, tái phân phối hoặc cấp phép lại dữ liệu từ Dịch vụ cho bên thứ ba.
• Phá vỡ, vô hiệu hóa hoặc cố gắng vi phạm các biện pháp bảo mật của Dịch vụ.
• Mạo danh bất kỳ cá nhân hoặc tổ chức nào.
• Thực hiện thẩm định đối tác cạnh tranh trực tiếp với MarketScout để xây dựng dịch vụ tương tự.`,
  },
  {
    id: "intellectual-property",
    title: "5. Sở hữu trí tuệ",
    content: `**Quyền của MarketScout:**
Dịch vụ, bao gồm phần mềm, thuật toán, giao diện, nội dung và thương hiệu, là tài sản độc quyền của MarketScout và được bảo vệ bởi luật sở hữu trí tuệ. Chúng tôi cấp cho bạn giấy phép có giới hạn, không độc quyền, không thể chuyển nhượng để truy cập và sử dụng Dịch vụ theo Điều khoản này.

**Quyền của bạn:**
Bạn giữ quyền sở hữu đối với dữ liệu bạn cung cấp cho Dịch vụ. Bạn cấp cho chúng tôi giấy phép sử dụng dữ liệu đó để cung cấp và cải thiện Dịch vụ.

**Dữ liệu báo cáo:**
Báo cáo thẩm định được tạo ra từ Dịch vụ là kết quả xử lý của MarketScout. Bạn có quyền sử dụng các báo cáo này cho mục đích nội bộ của tổ chức.`,
  },
  {
    id: "payment",
    title: "6. Thanh toán và gói dịch vụ",
    content: `**Gói miễn phí:**
Người dùng đăng ký lần đầu nhận hạn ngạch thẩm định miễn phí theo chính sách hiện hành. Sau khi hết hạn ngạch, cần nâng cấp lên gói trả phí để tiếp tục sử dụng.

**Gói trả phí:**
• Phí dịch vụ được tính theo chu kỳ đăng ký (tháng hoặc năm) hoặc theo lượt sử dụng.
• Giá được hiển thị tại trang /pricing và có thể thay đổi với thông báo trước.
• Tất cả giao dịch được xử lý qua cổng thanh toán bảo mật.

**Hoàn tiền:**
Các khoản phí đã thanh toán không được hoàn lại trừ khi có lỗi kỹ thuật nghiêm trọng từ phía chúng tôi hoặc theo quy định pháp luật hiện hành.

**Thuế:**
Giá hiển thị chưa bao gồm thuế VAT. Người dùng chịu trách nhiệm về các nghĩa vụ thuế theo pháp luật địa phương.`,
  },
  {
    id: "disclaimer",
    title: "7. Tuyên bố miễn trừ trách nhiệm",
    content: `**Thông tin mang tính xác suất:**
Các báo cáo, điểm số và khuyến nghị do MarketScout cung cấp dựa trên dữ liệu công khai và được phân tích bởi AI. Đây là **khuyến nghị xác suất**, không phải kết luận pháp lý tuyệt đối và không cấu thành tư vấn pháp lý, tài chính hoặc tuân thủ chính thức.

**Không đảm bảo:**
Dịch vụ được cung cấp "nguyên trạng" và "tùy theo khả năng hiện có". Chúng tôi không bảo đảm:
• Tính chính xác tuyệt đối hoặc đầy đủ của dữ liệu thẩm định.
• Dịch vụ hoạt động liên tục không gián đoạn.
• Kết quả thẩm định phù hợp với mọi mục đích kinh doanh cụ thể của bạn.

**Quyết định của bạn:**
Bạn hoàn toàn chịu trách nhiệm về các quyết định kinh doanh dựa trên thông tin từ MarketScout. Luôn bổ sung bằng thẩm định thực địa và tư vấn chuyên môn trước các giao dịch quan trọng.`,
  },
  {
    id: "limitation",
    title: "8. Giới hạn trách nhiệm",
    content: `Trong phạm vi tối đa cho phép bởi pháp luật, MarketScout và các cộng sự, nhân viên, đối tác sẽ không chịu trách nhiệm về bất kỳ:
• Thiệt hại gián tiếp, ngẫu nhiên, đặc biệt, hậu quả hoặc trừng phạt.
• Mất lợi nhuận, doanh thu, dữ liệu hoặc cơ hội kinh doanh.
• Thiệt hại phát sinh từ việc tin tưởng vào thông tin từ Dịch vụ.

Tổng trách nhiệm của chúng tôi không vượt quá số tiền bạn đã thanh toán cho Dịch vụ trong 12 tháng trước khi xảy ra sự kiện gây thiệt hại.`,
  },
  {
    id: "governing-law",
    title: "9. Luật áp dụng và giải quyết tranh chấp",
    content: `Các Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh từ hoặc liên quan đến các Điều khoản này sẽ được giải quyết tại Tòa án nhân dân có thẩm quyền tại TP. Hồ Chí Minh, Việt Nam.

Trước khi khởi kiện, các bên đồng ý nỗ lực giải quyết tranh chấp thông qua thương lượng thiện chí trong vòng 30 ngày.`,
  },
  {
    id: "changes",
    title: "10. Thay đổi điều khoản",
    content: `Chúng tôi bảo lưu quyền sửa đổi các Điều khoản này bất cứ lúc nào. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo qua email hoặc thông báo nổi bật trong Dịch vụ ít nhất 7 ngày trước khi có hiệu lực.

Việc tiếp tục sử dụng Dịch vụ sau ngày thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các Điều khoản đã sửa đổi.`,
  },
  {
    id: "contact",
    title: "11. Liên hệ",
    content: `Mọi câu hỏi về Điều khoản Dịch vụ, vui lòng liên hệ:

**MarketScout — Team ARAM #278**
Email: compliance@marketscout.aram.vn
Địa chỉ: Suite 1803, PetroVietnam Tower, Quận 1, TP. Hồ Chí Minh, Việt Nam`,
  },
];

export default function TermsOfServicePage() {
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
            <FileText className="w-6 h-6 text-[#00D26A]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Điều khoản Dịch vụ</h1>
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
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-10">
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Lưu ý quan trọng:</strong> Báo cáo thẩm định từ MarketScout là khuyến nghị xác suất dựa trên dữ liệu công khai và phân tích AI. Không cấu thành tư vấn pháp lý hoặc tài chính chính thức. Vui lòng bổ sung bằng thẩm định thực địa trước các quyết định quan trọng.
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
          <Link href="/terms-of-service" className="text-[#00A859]">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/support-desk" className="hover:text-gray-600 transition-colors">Support Desk</Link>
        </div>
      </footer>
    </div>
  );
}
