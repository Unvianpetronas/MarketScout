"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useLanguage } from "@/providers/language-provider";

const SECTIONS_VI = [
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

Để thực hiện bất kỳ quyền nào trên, vui lòng liên hệ: unviantruong26@gmail.com`,
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
Email: unviantruong26@gmail.com
Địa chỉ: Mai Văn Vĩnh, Tân Hưng, Thành Phố Hồ Chí Minh

Chúng tôi cam kết phản hồi trong vòng 5 ngày làm việc.`,
  },
];

const SECTIONS_EN = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: `Welcome to MarketScout ("we", "our", "us"). We provide an AI-powered platform for international trade partner verification. This Privacy Policy explains how we collect, use, protect, and share your information when you use MarketScout's services at marketscout.aram.vn and related applications.

By accessing or using our services, you confirm that you have read, understood, and agreed to this Privacy Policy.`,
  },
  {
    id: "information-collected",
    title: "2. Information We Collect",
    content: `**Information you provide directly:**
• Account information: full name, email address, company name, encrypted password.
• Payment information: we do not store credit card data; transactions are processed through secure third-party payment gateways (VietQR, Stripe).
• Content you submit: company name, tax ID, country in verification requests; messages in the AI chat system.

**Information collected automatically:**
• Usage data: number of visits, features used, time on page, verification query history.
• Device information: IP address, browser type, operating system, session information.
• Cookies and similar tracking technologies: used for session authentication and performance analytics.

**Data from third-party sources (for verification purposes):**
When you request a verification of an organization, we collect data from public sources including: GLEIF, OpenSanctions, business registries, and public legal records. This data is processed and stored in order to provide you with a report.`,
  },
  {
    id: "how-we-use",
    title: "3. How We Use Information",
    content: `We use the information we collect to:

• **Provide the service:** process verification requests, generate 8-pillar reports, operate the AI chatbot assistant.
• **Manage accounts:** authenticate identity, manage quotas and service plans.
• **Handle payment & billing:** process transactions, issue invoices.
• **Improve the service:** analyze aggregated data to improve the accuracy of our verification algorithms.
• **Ensure security:** detect and prevent fraud and unauthorized access.
• **Communicate:** send technical notices, policy updates, and customer support.
• **Comply with legal requirements:** respond to requests from competent regulatory authorities.`,
  },
  {
    id: "data-sharing",
    title: "4. Information Sharing",
    content: `We do not sell your personal information. We only share information in the following cases:

• **Service providers:** technical partners who support our operations (cloud services, data analytics, payment gateways) all sign confidentiality agreements and only process data as instructed by us.
• **Public data sources:** during verification, we query third-party databases (GLEIF, OpenSanctions, etc.) using the company name/tax ID you provide.
• **Legal requests:** we may disclose information when required by law, court order, or a competent government authority.
• **Business transfers:** in the event of a merger, acquisition, or sale of assets, user information may be transferred, with the commitment that it will continue to be handled in accordance with this policy.`,
  },
  {
    id: "data-retention",
    title: "5. Data Retention and Security",
    content: `**Retention periods:**
• Account data: retained for the entire time the account is active, plus 30 days after account deletion.
• Verification reports: retained for 12 months from the creation date, after which they are anonymized or deleted.
• System logs: retained for up to 90 days.

**Security measures:**
• Data in transit is encrypted using TLS 1.3.
• Passwords are hashed using the bcrypt algorithm.
• Role-based access control (RBAC).
• JWT tokens with short expiration times and a secure refresh mechanism.
• Continuous monitoring and periodic security audits.

While we apply security measures consistent with industry standards, no method of data transmission or storage can be guaranteed to be 100% secure.`,
  },
  {
    id: "user-rights",
    title: "6. Your Rights",
    content: `You have the following rights regarding your personal data:

• **Right of access:** request a copy of the data we hold about you.
• **Right to rectification:** update inaccurate information via your account profile page.
• **Right to erasure:** request deletion of your account and related data (except data required for legal obligations).
• **Right to object:** object to the processing of your data for marketing purposes.
• **Right to restriction:** request that processing be restricted in certain circumstances.
• **Right to data portability:** receive your data in a machine-readable format.

To exercise any of the rights above, please contact: unviantruong26@gmail.com`,
  },
  {
    id: "cookies",
    title: "7. Cookies and Tracking Technologies",
    content: `We use the following types of cookies:

• **Essential cookies:** necessary to operate the service (session authentication, CSRF protection). Cannot be disabled.
• **Performance cookies:** help us understand how users interact with the service (aggregated, anonymized analytics). Can be disabled.
• **Functional cookies:** remember your preferences (language, interface settings). Can be disabled.

You can manage cookies in your browser settings. Note that disabling essential cookies may affect the service's functionality.`,
  },
  {
    id: "international",
    title: "8. International Data Transfers",
    content: `MarketScout operates in Vietnam and may use cloud service providers with servers located abroad. When data is transferred outside of Vietnam, we ensure:

• Appropriate contractual data protection clauses are applied.
• Data is only transferred to countries or organizations with an equivalent or higher level of data protection.
• Compliance with Decree 13/2023/ND-CP on personal data protection of Vietnam.`,
  },
  {
    id: "children",
    title: "9. Children's Privacy",
    content: `MarketScout's services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with information, please contact us so that we can delete it immediately.`,
  },
  {
    id: "changes",
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. When material changes are made, we will:
• Update the "Effective from" date at the top of the page.
• Send a notification via email or in-app notice to registered account holders.

Continued use of the service after changes are posted constitutes your acceptance of the new policy.`,
  },
  {
    id: "contact",
    title: "11. Contact",
    content: `If you have any questions, complaints, or wish to exercise your rights, please contact us:

**MarketScout — Team ARAM #278**
Email: unviantruong26@gmail.com
Address: Mai Văn Vĩnh, Tân Hưng, Thành Phố Hồ Chí Minh

We are committed to responding within 5 business days.`,
  },
];

export default function PrivacyPolicyPage() {
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
          {t("privacy.backLink")}
        </Link>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0b1120] to-[#10162b] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#059669]/15 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-[#059669]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{t("privacy.title")}</h1>
          <p className="text-gray-400 text-sm">
            {t("privacy.subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-10">
          {/* TOC sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t("privacy.toc")}</p>
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
            <div className="bg-[#E7F6EF] border border-[#059669]/20 rounded-2xl p-5 mb-10">
              <p className="text-sm text-[#047857] leading-relaxed">
                <strong>{t("privacy.summaryLabel")}</strong> {t("privacy.summaryText")}
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
        <p>&copy; {new Date().getFullYear()} MarketScout. {t("privacy.footerCredit")}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <Link href="/terms-of-service" className="hover:text-gray-600 transition-colors">{t("privacy.footerTerms")}</Link>
          <span>·</span>
          <Link href="/privacy-policy" className="text-[#059669]">{t("privacy.footerPrivacy")}</Link>
          <span>·</span>
          <Link href="/support-desk" className="hover:text-gray-600 transition-colors">{t("privacy.footerSupport")}</Link>
        </div>
      </footer>
    </div>
  );
}
