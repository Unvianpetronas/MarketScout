"use client";

import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useLanguage } from "@/providers/language-provider";

const SECTIONS_VI = [
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
Các báo cáo, điểm số và khuyến nghị do MarketScout cung cấp dựa trên dữ liệu công khai và được phân tích bởi AI. Đây là **khuyến nghị xác suất**, không phải kết luận pháp lý tuyệt đối và không cấu thành tư vấn pháp lý, tài chính, kế toán hoặc tuân thủ chính thức. MarketScout không phải là công ty luật, công ty kiểm toán hay tổ chức tư vấn tuân thủ được cấp phép.

**Sàng lọc trừng phạt (sanctions screening) — giới hạn quan trọng:**
Trụ cột sàng lọc trừng phạt của Dịch vụ đối chiếu tự động tên đối tác với các danh sách trừng phạt công khai của bên thứ ba (ví dụ OFAC SDN và các nguồn tương tự). Kết quả này:
• Có thể xảy ra **báo nhầm dương tính** (false positive — gắn cờ một công ty không thực sự bị trừng phạt) hoặc **báo sót** (false negative — bỏ lọt một công ty thực sự nằm trong danh sách), do sai khác tên gọi, dữ liệu nguồn chưa cập nhật, hoặc giới hạn của thuật toán đối chiếu.
• **Không phải** là xác nhận tuân thủ (compliance clearance) chính thức. Một báo cáo "không có cảnh báo trừng phạt" **không** đồng nghĩa đối tác chắc chắn không nằm trong bất kỳ danh sách trừng phạt, cấm vận hoặc hạn chế thương mại nào.
• Trước khi thực hiện giao dịch có rủi ro pháp lý/tuân thủ đáng kể (đặc biệt giao dịch xuất nhập khẩu quốc tế), bạn phải tự thực hiện — hoặc thuê đơn vị tư vấn tuân thủ/luật sư được cấp phép thực hiện — sàng lọc tuân thủ chính thức, độc lập với Dịch vụ.

**Không đảm bảo:**
Dịch vụ được cung cấp "nguyên trạng" và "tùy theo khả năng hiện có". Chúng tôi không bảo đảm:
• Tính chính xác tuyệt đối hoặc đầy đủ của dữ liệu thẩm định, bao gồm cả kết quả sàng lọc trừng phạt nêu trên.
• Dịch vụ hoạt động liên tục không gián đoạn.
• Kết quả thẩm định phù hợp với mọi mục đích kinh doanh cụ thể của bạn.

**Quyết định của bạn:**
Bạn hoàn toàn chịu trách nhiệm về các quyết định kinh doanh dựa trên thông tin từ MarketScout. Luôn bổ sung bằng thẩm định thực địa và tư vấn chuyên môn trước các giao dịch quan trọng.

**Nếu bạn cho rằng kết quả sai:**
Sử dụng chức năng "Báo kết quả sai" ngay trên trang báo cáo để gửi yêu cầu xem xét thủ công — đặc biệt quan trọng với các cảnh báo liên quan đến trừng phạt. Đội ngũ MarketScout sẽ xem xét và có thể điều chỉnh kết quả hiển thị; mọi điều chỉnh đều được ghi nhận lại (audit trail) kèm lý do.`,
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
Email: unviantruong26@gmail.com
Địa chỉ: Mai Văn Vĩnh, Tân Hưng, Thành Phố Hồ Chí Minh`,
  },
];

const SECTIONS_EN = [
  {
    id: "agreement",
    title: "1. Acceptance of Terms",
    content: `By accessing or using the MarketScout platform ("Service"), you ("User") agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of the Terms, you may not access or use the Service.

These Terms constitute the entire agreement between you and MarketScout (operated by Team ARAM #278) regarding the Service and supersede all prior agreements.`,
  },
  {
    id: "service-description",
    title: "2. Service Description",
    content: `MarketScout provides an AI-powered international trade partner verification platform, including:

• **8-Pillar Verification System:** legal, digital footprint, trade history, identity, financial/tax, sanctions screening, transaction structure, and operational evidence analysis.
• **MarketScout AI Chat:** an AI assistant that supports partner verification consultation and business information lookup.
• **Verification Reports:** detailed, shareable, and exportable risk assessment profiles.
• **Partner Search:** tools for finding and screening potential partners.

We reserve the right to modify, suspend, or discontinue any part of the Service without prior notice.`,
  },
  {
    id: "accounts",
    title: "3. User Accounts",
    content: `**Account Registration:**
You must register an account to access most features of the Service. You agree to provide accurate, complete, and up-to-date information during registration.

**Account Security:**
You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately if you detect unauthorized access.

**One Account — One Person:**
Each account is intended for a single user. You may not share login credentials or create multiple accounts for the same organization unless using an Enterprise plan that supports multiple accounts.

**Account Termination:**
We may suspend or terminate your account if you violate these Terms.`,
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable Use",
    content: `**You may:**
• Use the Service for your organization's legitimate commercial purposes.
• Access and download verification reports within your plan's quota.
• Share reports with colleagues within the same organization.

**You may not:**
• Use the Service for any unlawful purpose or in violation of any country's laws.
• Automate access to the Service (web scraping, bots) without written permission.
• Resell, redistribute, or relicense data from the Service to third parties.
• Break, disable, or attempt to circumvent the Service's security measures.
• Impersonate any individual or organization.
• Perform partner verification in direct competition with MarketScout to build a similar service.`,
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property",
    content: `**MarketScout's Rights:**
The Service, including its software, algorithms, interface, content, and branding, is the exclusive property of MarketScout and is protected by intellectual property law. We grant you a limited, non-exclusive, non-transferable license to access and use the Service in accordance with these Terms.

**Your Rights:**
You retain ownership of the data you provide to the Service. You grant us a license to use that data to provide and improve the Service.

**Report Data:**
Verification reports generated by the Service are the output of MarketScout's processing. You may use these reports for your organization's internal purposes.`,
  },
  {
    id: "payment",
    title: "6. Payment and Plans",
    content: `**Free Plan:**
First-time users receive a free verification quota under the current policy. Once the quota is exhausted, you must upgrade to a paid plan to continue using the Service.

**Paid Plans:**
• Service fees are charged on a subscription cycle (monthly or annual) or on a per-use basis.
• Pricing is shown on the /pricing page and may change with prior notice.
• All transactions are processed through a secure payment gateway.

**Refunds:**
Fees already paid are non-refundable, except in cases of a serious technical error on our part or as required by applicable law.

**Taxes:**
Displayed prices do not include VAT. Users are responsible for tax obligations under local law.`,
  },
  {
    id: "disclaimer",
    title: "7. Disclaimer",
    content: `**Probabilistic Information:**
Reports, scores, and recommendations provided by MarketScout are based on publicly available data and analyzed by AI. These are **probabilistic recommendations**, not absolute legal conclusions, and do not constitute formal legal, financial, accounting, or compliance advice. MarketScout is not a licensed law firm, audit firm, or compliance advisory organization.

**Sanctions Screening — Important Limitations:**
The Service's sanctions-screening pillar automatically matches a partner's name against third-party public sanctions lists (e.g. the OFAC SDN list and similar sources). This result:
• May produce **false positives** (flagging a company that is not actually sanctioned) or **false negatives** (missing a company that is actually listed), due to name variations, outdated source data, or matching-algorithm limitations.
• Is **not** a formal compliance clearance. A report with "no sanctions warning" does **not** mean the partner is confirmed clear of every sanctions, embargo, or trade-restriction list.
• Before entering into any transaction with meaningful legal/compliance exposure (especially cross-border import/export deals), you must independently perform — or engage a licensed compliance advisor or attorney to perform — formal compliance screening separate from the Service.

**No Warranty:**
The Service is provided "as is" and "as available." We do not warrant:
• The absolute accuracy or completeness of verification data, including the sanctions-screening results described above.
• Uninterrupted, continuous operation of the Service.
• That verification results are suitable for every specific business purpose of yours.

**Your Decisions:**
You are solely responsible for business decisions made based on information from MarketScout. Always supplement with on-the-ground due diligence and professional advice before important transactions.

**If you believe a result is wrong:**
Use the "Flag as incorrect" action on the report page to request manual review — this matters most for sanctions-related warnings. Our team reviews flagged reports and may correct the displayed result; every correction is logged with a reason (audit trail).`,
  },
  {
    id: "limitation",
    title: "8. Limitation of Liability",
    content: `To the maximum extent permitted by law, MarketScout and its associates, employees, and partners shall not be liable for any:
• Indirect, incidental, special, consequential, or punitive damages.
• Loss of profits, revenue, data, or business opportunities.
• Damages arising from reliance on information from the Service.

Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the event giving rise to the damages.`,
  },
  {
    id: "governing-law",
    title: "9. Governing Law and Dispute Resolution",
    content: `These Terms are governed by the laws of Vietnam. Any dispute arising from or related to these Terms shall be resolved at the competent People's Court in Ho Chi Minh City, Vietnam.

Before initiating legal proceedings, the parties agree to make good-faith efforts to resolve the dispute through negotiation within 30 days.`,
  },
  {
    id: "changes",
    title: "10. Changes to Terms",
    content: `We reserve the right to amend these Terms at any time. When material changes occur, we will notify you via email or a prominent notice within the Service at least 7 days before the change takes effect.

Continued use of the Service after the effective date of a change constitutes your acceptance of the revised Terms.`,
  },
  {
    id: "contact",
    title: "11. Contact",
    content: `For any questions about these Terms of Service, please contact:

**MarketScout — Team ARAM #278**
Email: unviantruong26@gmail.com
Address: Mai Văn Vĩnh, Tân Hưng, Thành Phố Hồ Chí Minh`,
  },
];

export default function TermsOfServicePage() {
  const { t, lang } = useLanguage();
  const SECTIONS = lang === "en" ? SECTIONS_EN : SECTIONS_VI;
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="font-display font-bold text-gray-900 text-lg">MarketScout</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("terms.back")}
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0b1120] to-[#10162b] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#059669]/15 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-[#059669]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t("terms.title")}</h1>
          <p className="text-gray-400 text-sm">
            {t("terms.effectiveDate")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-10">
          {/* TOC sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t("terms.toc")}</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-gray-500 hover:text-[#059669] py-1 transition-colors"
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
                <strong>{t("terms.noticeLabel")}</strong> {t("terms.noticeText")}
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
        <p>&copy; {new Date().getFullYear()} MarketScout. {t("terms.footerCredit")}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <Link href="/terms-of-service" className="text-[#059669]">{t("terms.footerTos")}</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="hover:text-gray-600 transition-colors">{t("terms.footerPrivacy")}</Link>
          <span>·</span>
          <Link href="/support-desk" className="hover:text-gray-600 transition-colors">{t("terms.footerSupport")}</Link>
        </div>
      </footer>
    </div>
  );
}
