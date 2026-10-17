import { Link } from "react-router-dom";
import { ShieldCheck, Mail, FileText } from "lucide-react";
import usePageTitle from "../hooks/usePageTitle";

/* -------------------------------------------------------------------------- */
/* EDIT THESE DETAILS BEFORE PUBLISHING                                       */
/* -------------------------------------------------------------------------- */
const PLATFORM_NAME = "[Platform Name]";
const COMPANY_NAME = "[Registered Company Name] Limited";
const COMPANY_ADDRESS = "[Street, Building, Nairobi, Kenya]";
const PRIVACY_EMAIL = "privacy@yourdomain.com";
const SUPPORT_EMAIL = "support@yourdomain.com";
const LAST_UPDATED = "15 October 2026";
const TERMS_ROUTE = "/terms-and-conditions";

type Table = { head: string[]; rows: string[][] };
type Block = string | { list: string[] } | { table: Table };
type Section = { id: string; title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    blocks: [
      `${COMPANY_NAME} ("${PLATFORM_NAME}", "we", "us" or "our") runs a ticketing platform where organizers list events and attendees buy tickets. We respect your privacy and are committed to protecting your personal data.`,
      `This Privacy Policy explains what personal data we collect, why we collect it, how we use, share and protect it, how long we keep it, and the rights you have. It applies to everyone who uses our website, apps and related services (the "Platform"), including visitors, attendees and organizers.`,
      `We process personal data in line with the Data Protection Act, 2019 of Kenya and its regulations. This policy is part of our Terms and Conditions, available at ${TERMS_ROUTE}.`,
    ],
  },
  {
    id: "who-we-are",
    title: "2. Who is responsible for your data",
    blocks: [
      `For most of the data described in this policy, ${COMPANY_NAME} is the data controller. Our address is ${COMPANY_ADDRESS}. You can reach our data protection contact at ${PRIVACY_EMAIL}.`,
      `When an attendee buys a ticket, the organizer of that event also receives some of the attendee's information so they can run the event. The organizer is a separate data controller for that information and is responsible for how they use it. Please read the organizer's own notices for details.`,
    ],
  },
  {
    id: "data-we-collect",
    title: "3. The personal data we collect",
    blocks: [
      `**Information you give us**`,
      {
        list: [
          `**Account details:** your name, email address, phone number, password (stored in hashed form), and role (attendee or organizer).`,
          `**Organizer details:** your organization's name, logo, description, contact details, and, where we require verification, business registration, tax number, identity document details, and bank or mobile money details for payouts.`,
          `**Event and venue information:** event titles, descriptions, dates, times, categories, venue names, addresses and capacities, ticket types and prices.`,
          `**Media you upload:** images, videos and alt text, which may show people. You are responsible for having permission to upload them.`,
          `**Orders and attendance:** the tickets you buy, order references, quantities, amounts paid and ticket check-in status.`,
          `**Communications:** messages you send to our support team, survey answers and feedback.`,
        ],
      },
      `**Information we collect automatically**`,
      {
        list: [
          `**Device and usage data:** IP address, browser type, operating system, device identifiers, language, pages viewed, links clicked, time spent, referring pages and error logs.`,
          `**Approximate location:** derived from your IP address, used to show relevant events and to detect fraud. We only use precise location if you give permission in your device.`,
          `**Cookies and similar technologies:** described in section 9.`,
        ],
      },
      `**Information from others**`,
      {
        list: [
          `**Payment providers:** confirmation that a payment succeeded or failed, a transaction reference, the payment method type, and (for mobile money) the phone number used. We do not receive or store full card numbers.`,
          `**Organizers:** information an organizer adds about attendees, for example when sending complimentary tickets.`,
          `**Address search services:** when you type a venue address, the text is sent to a mapping provider to give suggestions.`,
        ],
      },
      `We do not knowingly collect special categories of personal data (such as health, religion, ethnicity or biometric data). Some events, for example religious gatherings, may by their nature indicate such information about attendees. We process that only as needed to provide the ticket you asked for.`,
    ],
  },
  {
    id: "how-we-use",
    title: "4. How we use your data and our legal basis",
    blocks: [
      `We only use personal data where the law allows it. The table below sets out each purpose and the legal basis we rely on under the Data Protection Act.`,
      {
        table: {
          head: ["Purpose", "What we do", "Legal basis"],
          rows: [
            ["Provide the Platform", "Create and manage accounts, process ticket orders, deliver tickets and QR codes, run check-in, enable organizers to manage events, venues, tickets and media.", "Performance of a contract"],
            ["Payments and payouts", "Take payments, issue refunds, calculate fees, verify organizers and pay out proceeds.", "Performance of a contract; legal obligation"],
            ["Communications about your orders", "Send confirmations, receipts, reminders, changes, cancellations and security alerts.", "Performance of a contract; legitimate interest"],
            ["Security and fraud prevention", "Detect and prevent fraud, duplicate or counterfeit tickets, bot buying, abuse and unauthorized access.", "Legitimate interest; legal obligation"],
            ["Support", "Answer your questions and resolve disputes.", "Performance of a contract; legitimate interest"],
            ["Improve the Platform", "Analyze usage, fix bugs, test features and understand what events people enjoy.", "Legitimate interest; consent for non-essential cookies"],
            ["Marketing", "Send you news about events you may like, where you have opted in, or where the law allows it for similar services.", "Consent; legitimate interest"],
            ["Legal and regulatory", "Keep records for tax and accounting, respond to lawful requests, enforce our terms and establish or defend legal claims.", "Legal obligation; legitimate interest"],
          ],
        },
      },
      `Where we rely on consent, you can withdraw it at any time. Withdrawing does not affect what we did before. Where we rely on legitimate interests, we balance them against your rights and you can object as described in section 8.`,
      `We do not sell your personal data. We do not use your data for automated decisions that have legal or similarly significant effects on you.`,
    ],
  },
  {
    id: "sharing",
    title: "5. Who we share your data with",
    blocks: [
      `We share personal data only where needed and with appropriate safeguards:`,
      {
        list: [
          `**Event organizers:** when you buy a ticket, we share your name, contact details, ticket type and order details with the organizer of that event so they can manage entry, communicate about the event and meet safety obligations.`,
          `**Payment providers:** to process payments, refunds and payouts, and to prevent fraud. These may include mobile money operators, banks and card processors.`,
          `**Service providers:** companies that help us run the Platform, such as cloud hosting, file and media storage (including image and video hosting), email and SMS delivery, analytics, customer support tools and mapping and address-search services. They may only use the data to provide services to us.`,
          `**Professional advisers:** lawyers, auditors, accountants and insurers, under confidentiality duties.`,
          `**Authorities:** the Kenya Revenue Authority, law enforcement, courts, regulators or other bodies where we are legally required to, or where it is needed to protect rights, safety or property.`,
          `**Business transfers:** a buyer or investor if we are involved in a merger, acquisition or sale of assets. We will tell you if your data becomes subject to a different privacy policy.`,
          `**Public information:** event details, venue information and media that organizers publish are visible to anyone who visits the Platform.`,
        ],
      },
    ],
  },
  {
    id: "transfers",
    title: "6. Transfers outside Kenya",
    blocks: [
      `Some of our service providers store or process data on servers outside Kenya. When we transfer personal data abroad, we do so only where the Data Protection Act allows, for example where the recipient country or provider offers adequate protection, where we have put in place contractual or other safeguards, or where you have consented. You can contact us for more information about these safeguards.`,
    ],
  },
  {
    id: "retention",
    title: "7. How long we keep your data and how we keep it safe",
    blocks: [
      `We keep personal data only as long as we need it for the purposes in this policy, and to meet legal, tax, accounting and dispute-resolution requirements. Typical periods are:`,
      {
        list: [
          `**Account data:** for as long as your account is open, and for a short period afterwards to deal with queries or disputes.`,
          `**Order, payment and payout records:** up to seven years after the transaction, to meet tax and accounting rules.`,
          `**Support messages:** up to two years after the matter is closed.`,
          `**Security and access logs:** up to 12 months, unless needed to investigate an incident.`,
          `**Marketing preferences:** until you unsubscribe, plus a record that you did so, so we do not contact you again.`,
          `**Event pages and media:** until the organizer removes them or the account is closed, subject to backups that are cleared on a regular cycle.`,
        ],
      },
      `When data is no longer needed we delete it or anonymize it so it can no longer identify you.`,
      `**Security.** We use appropriate technical and organizational measures, including encrypted connections (HTTPS), hashed passwords, role-based access, regular updates, and limits on who within our team can see personal data. No system is completely secure, so please use a strong, unique password and keep your login details private.`,
      `**Data breaches.** If a breach is likely to put your rights and freedoms at risk, we will notify the Office of the Data Protection Commissioner and, where required, affected people, within the time the law sets.`,
    ],
  },
  {
    id: "rights",
    title: "8. Your rights",
    blocks: [
      `Under the Data Protection Act, 2019 you have the right to:`,
      {
        list: [
          `be informed about how your personal data is used;`,
          `access the personal data we hold about you;`,
          `object to the processing of all or part of your personal data, including for direct marketing;`,
          `correct inaccurate or incomplete data;`,
          `ask us to delete data that is false, misleading, no longer needed or unlawfully processed;`,
          `receive your data in a structured, commonly used format and, where possible, have it sent to another controller (data portability);`,
          `withdraw consent at any time where we rely on it.`,
        ],
      },
      `To use these rights, email ${PRIVACY_EMAIL}. We may need to confirm your identity first. We will respond within the time set by law, normally within 30 days. There is normally no charge, but we may refuse requests that are clearly unfounded, and we may be unable to delete data that we must keep by law, such as transaction records.`,
      `If you think we have not handled your data properly, please contact us first so we can put it right. You also have the right to complain to the Office of the Data Protection Commissioner (ODPC) of Kenya.`,
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies and similar technologies",
    blocks: [
      `Cookies are small files placed on your device. We use them to keep you signed in, remember your preferences, protect against fraud and understand how the Platform is used. We use the following types:`,
      {
        list: [
          `**Essential:** needed for the Platform to work, for example login sessions, security and checkout. These cannot be switched off.`,
          `**Preferences:** remember choices such as view mode (grid or table) or dismissed notices.`,
          `**Analytics:** help us understand which pages and features are used so we can improve them.`,
          `**Marketing:** where used, show relevant event promotions. We set these only with your consent.`,
        ],
      },
      `You can control cookies through your browser settings or the cookie choices we show on the Platform. Blocking essential cookies may stop parts of the Platform from working.`,
    ],
  },
  {
    id: "attendee-organizer",
    title: "10. Information about attendees held by organizers",
    blocks: [
      `Organizers who receive attendee data through the Platform must use it only to run and communicate about their event, keep it secure, and follow the Data Protection Act. They must not sell it or use it to send unrelated marketing without a lawful basis. If you are an attendee and want to exercise your rights over data held by an organizer, contact the organizer directly. You may also contact us and we will help pass on your request.`,
    ],
  },
  {
    id: "photos",
    title: "11. Photos and videos at events",
    blocks: [
      `Organizers may photograph or film events and may publish images that show attendees. Organizers should tell attendees about this on the event page or at the entrance. If you do not wish to appear in event media, tell the organizer. If you see content on the Platform showing you that you want removed, email ${PRIVACY_EMAIL} with the page address and we will review it promptly.`,
    ],
  },
  {
    id: "children",
    title: "12. Children",
    blocks: [
      `The Platform is not meant for people under 18, and we do not knowingly collect personal data from children through account sign-up. Younger people may attend events where an organizer allows it, but tickets must be bought by a parent or guardian. If you believe a child has given us personal data without a parent's or guardian's consent, contact ${PRIVACY_EMAIL} and we will delete it.`,
    ],
  },
  {
    id: "marketing",
    title: "13. Marketing messages",
    blocks: [
      `With your consent, or as the law allows, we may email, text or notify you about events and offers. You can unsubscribe at any time using the link in a message or by contacting ${PRIVACY_EMAIL}. We will still send service messages that are essential, such as ticket confirmations, changes to an event you booked, and security alerts.`,
    ],
  },
  {
    id: "third-party",
    title: "14. Third-party links and services",
    blocks: [
      `The Platform may link to websites or services run by others, including mapping and payment services and organizer websites. We do not control them and this policy does not cover them. Please read their privacy notices before sharing personal data with them.`,
    ],
  },
  {
    id: "changes",
    title: "15. Changes to this policy",
    blocks: [
      `We may update this Privacy Policy from time to time to reflect changes in our practices, technology or the law. We will post the updated version with a new "last updated" date and, for material changes, tell you by email or in your dashboard before the changes take effect.`,
    ],
  },
  {
    id: "contact",
    title: "16. Contact us",
    blocks: [
      `Data protection contact: ${PRIVACY_EMAIL}`,
      `General support: ${SUPPORT_EMAIL}`,
      `Post: ${COMPANY_NAME}, ${COMPANY_ADDRESS}`,
      `Regulator: Office of the Data Protection Commissioner (ODPC), Kenya.`,
    ],
  },
];

/** Renders **bold** lead-ins inside a paragraph or list item. */
const RichText = ({ text }: { text: string }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i} className="font-bold text-base-content">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )}
  </>
);

export const PrivacyPolicy = () => {
  usePageTitle("Privacy Policy");

  return (
    <div className="font-sans max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-base-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">Privacy Policy</h1>
        </div>
        <p className="text-xs text-base-content/60">
          Last updated: <span className="font-bold text-base-content">{LAST_UPDATED}</span>
        </p>
        <p className="text-sm text-base-content/70 leading-relaxed max-w-3xl">
          Your privacy matters to us. This page explains what we collect when you use {PLATFORM_NAME}, what we do with it, who we share it with, and the
          choices and rights you have.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Table of contents */}
        <nav aria-label="Contents" className="lg:sticky lg:top-6 bg-base-200/30 border border-base-200 rounded-2xl p-4 max-h-[70vh] overflow-y-auto">
          <h2 className="text-xs font-black text-base-content mb-2">On this page</h2>
          <ol className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block text-[11px] text-base-content/70 hover:text-primary py-0.5 leading-snug">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <article className="flex flex-col gap-8 min-w-0">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 flex flex-col gap-3">
              <h2 className="text-lg font-black tracking-tight text-base-content">{s.title}</h2>
              {s.blocks.map((b, i) => {
                if (typeof b === "string") {
                  return (
                    <p key={i} className="text-sm text-base-content/75 leading-relaxed">
                      <RichText text={b} />
                    </p>
                  );
                }
                if ("list" in b) {
                  return (
                    <ul key={i} className="list-disc pl-5 flex flex-col gap-1.5 text-sm text-base-content/75 leading-relaxed marker:text-primary">
                      {b.list.map((li, j) => (
                        <li key={j}>
                          <RichText text={li} />
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <div key={i} className="border border-base-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table table-sm w-full text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-base-200/50 text-base-content/70 border-b border-base-200">
                            {b.table.head.map((h) => (
                              <th key={h} className="py-2.5 px-3 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {b.table.rows.map((row, r) => (
                            <tr key={r} className="border-b border-base-100 align-top">
                              {row.map((cell, c) => (
                                <td key={c} className={`py-2.5 px-3 leading-relaxed ${c === 0 ? "font-bold text-base-content" : "text-base-content/75"}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {/* Footer links */}
          <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-base-200 pt-6">
            <Link to={TERMS_ROUTE} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5 w-fit">
              <FileText size={14} />
              Read our Terms and Conditions
            </Link>
            <a href={`mailto:${PRIVACY_EMAIL}`} className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5 w-fit">
              <Mail size={14} />
              Privacy questions? Contact us
            </a>
          </footer>
        </article>
      </div>
    </div>
  );
};

export default PrivacyPolicy;