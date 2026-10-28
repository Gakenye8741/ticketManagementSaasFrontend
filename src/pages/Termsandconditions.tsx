import { Link } from "react-router-dom";
import { FileText, Mail, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async"; // 👈 Added for SEO
import usePageTitle from "../hooks/usePageTitle";

/* -------------------------------------------------------------------------- */
/* EDIT THESE DETAILS BEFORE PUBLISHING                                       */
/* -------------------------------------------------------------------------- */
const PLATFORM_NAME = "TicketStream";
const COMPANY_NAME = "TicketStream Limited";
const COMPANY_ADDRESS = "Tech Hub, Nairobi, Kenya";
const SUPPORT_EMAIL = "support@ticketstream.io";
const LEGAL_EMAIL = "legal@ticketstream.io";
const LAST_UPDATED = "15 October 2026";
const PRIVACY_ROUTE = "/privacy-policy";

type Block = string | { list: string[] };
type Section = { id: string; title: string; blocks: Block[] };

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of these terms",
    blocks: [
      `These Terms and Conditions ("Terms") form a binding agreement between you and ${COMPANY_NAME} ("${PLATFORM_NAME}", "we", "us" or "our"). They govern your access to and use of our website, mobile experience, APIs and related services (together, the "Platform"), which allow organizers to list and sell tickets to events and allow attendees to discover events and buy tickets.`,
      `By creating an account, buying a ticket, listing an event or otherwise using the Platform, you confirm that you have read, understood and agreed to these Terms and to our Privacy Policy. If you do not agree, you must not use the Platform.`,
      `If you use the Platform on behalf of a company, organization or other legal entity, you confirm that you have authority to bind that entity, and "you" includes that entity.`,
    ],
  },
  {
    id: "definitions",
    title: "2. Definitions",
    blocks: [
      {
        list: [
          `"Attendee" means any person who browses the Platform, buys a ticket or attends an event.`,
          `"Organizer" means any person or entity that creates an organization profile, lists events or sells tickets through the Platform.`,
          `"Event" means any gathering, show, conference, workshop, festival, match, exhibition or other activity listed on the Platform.`,
          `"Ticket" means a digital entitlement, including any QR code or reference number, that allows entry to an Event.`,
          `"Venue" means the place where an Event is held, as listed on the Platform.`,
          `"Content" means text, images, videos, logos, descriptions and any other material uploaded to or displayed on the Platform.`,
          `"Fees" means the service, processing and other charges described in section 7.`,
        ],
      },
    ],
  },
  {
    id: "our-role",
    title: "3. Our role on the Platform",
    blocks: [
      `${PLATFORM_NAME} is a technology platform and ticketing intermediary. We provide the tools that let Organizers create Events, define ticket types, take payments and manage attendance, and that let Attendees find Events and buy Tickets.`,
      `Unless we expressly state otherwise for a specific Event, we are not the organizer, producer, promoter or venue operator of any Event. The contract for attending an Event is between the Attendee and the Organizer. We are not responsible for the content, quality, safety, legality, scheduling or delivery of any Event.`,
      `We do not guarantee that any Event will take place as described, that any Organizer is who they claim to be, or that any Venue is suitable, safe or accessible.`,
    ],
  },
  {
    id: "accounts",
    title: "4. Accounts and eligibility",
    blocks: [
      {
        list: [
          `You must be at least 18 years old, or the age of majority where you live, to create an account, list an Event or buy a Ticket. Younger people may attend Events only where the Organizer allows it and with the consent of a parent or guardian.`,
          `You must give accurate, current and complete information when you register and keep it up to date, including your email address and phone number.`,
          `You are responsible for keeping your login details confidential and for all activity under your account. Tell us immediately at ${SUPPORT_EMAIL} if you suspect unauthorized use.`,
          `You may hold only one personal account. We may merge, suspend or close duplicate accounts.`,
          `Organizers must create an organization profile before they can list Events. Venues, Events, ticket types and media belong to that organization and must only be managed by people authorized to act for it.`,
        ],
      },
    ],
  },
  {
    id: "attendee-terms",
    title: "5. Terms for Attendees",
    blocks: [
      `**Buying tickets.** When you place an order you make an offer to buy the Ticket(s) at the displayed price. Your order is accepted only when payment is confirmed and we issue the Ticket. We may refuse or cancel an order if we suspect fraud, an error in pricing or availability, or a breach of these Terms.`,
      `**Prices and currency.** Prices are shown in Kenya Shillings (KSH) unless stated otherwise and are set by the Organizer. Any applicable Fees and taxes are shown before you pay.`,
      `**Ticket delivery.** Tickets are delivered digitally to your account and the contact details you provide. You are responsible for checking that the Event name, date, time, Venue and ticket type are correct before you pay.`,
      `**Entry conditions.** Entry is subject to the Organizer's and Venue's rules, including age limits, dress codes, security checks, bag policies and capacity limits. An Organizer or Venue may refuse or remove anyone who breaks these rules without a refund.`,
      `**One-time use.** Each Ticket is valid for a single entry. A Ticket that has been scanned cannot be reused. Duplicated, altered or counterfeit Tickets are void.`,
      `**Resale and transfer.** You must not resell Tickets above face value, advertise them on unauthorized channels, or use automated tools to buy Tickets in bulk. Tickets obtained or resold in breach of this rule may be cancelled without a refund. Transfers are allowed only where the Platform or the Organizer permits them.`,
      `**Your safety and conduct.** You attend Events at your own risk and must follow the instructions of staff and security. You must keep your Ticket safe, as anyone who presents it may be admitted.`,
    ],
  },
  {
    id: "organizer-terms",
    title: "6. Terms for Organizers",
    blocks: [
      `**Your obligations.** By listing an Event you confirm that:`,
      {
        list: [
          `you have the legal right to hold the Event and to sell Tickets for it, including any licenses, permits, venue agreements and insurance the law requires;`,
          `all Event information (title, description, category, date, time, Venue, ticket types, prices and quantities) is accurate, complete and not misleading;`,
          `you will keep that information up to date and tell Attendees promptly about any change, postponement or cancellation;`,
          `you will not sell more Tickets than the legal or safe capacity of the Venue;`,
          `you will honor every valid Ticket you sell and provide the Event substantially as described;`,
          `you are responsible for health, safety, crowd control, security and accessibility at your Event, and for complying with all applicable laws, county by-laws and licensing rules.`,
        ],
      },
      `**Venues.** Venues you add must be real, accurately described and used with the owner's permission. A Venue that is linked to an Event cannot be deleted until those Events are moved or removed.`,
      `**Ticket types.** You decide ticket tiers, prices and quantities. Once Tickets have been sold you must not change a ticket type in a way that unfairly harms existing buyers. We may restrict deleting or changing ticket types that have sales attached.`,
      `**Publishing.** An Event is visible to Attendees only when it is published. We may require that an Event has the essential details, at least one ticket type and suitable media before it can be published, and we may unpublish any Event that breaks these Terms.`,
      `**Prohibited Events.** You must not list Events that are illegal, promote violence or hatred, exploit or endanger children, involve unlicensed gambling, sell prohibited goods or services, or are fraudulent or deceptive.`,
      `**Attendee data.** Where you receive Attendee information through the Platform, you act as an independent controller of that information and must handle it lawfully, only for running the Event, and in line with the Data Protection Act, 2019 of Kenya.`,
    ],
  },
  {
    id: "fees-payments",
    title: "7. Fees, payments and payouts",
    blocks: [
      `**Platform Fees.** We charge Organizers a service fee on Tickets sold, and payment providers may charge a processing fee. The Fees that apply are shown in your organizer dashboard or agreed in writing, and may be passed on to Attendees where the Platform displays them at checkout. We will tell you before any change to Fees takes effect, and a change will not apply to Tickets already sold.`,
      `**Payment methods.** Payments are processed by third-party payment providers, which may include mobile money and card processors. We do not store full card numbers. Your use of a payment provider is also subject to that provider's terms.`,
      `**Payouts.** We hold ticket proceeds on behalf of the Organizer and release them, after deducting Fees, refunds, chargebacks and any amounts you owe us, on the schedule shown in your dashboard or agreed with you. We may delay or withhold payouts where we reasonably suspect fraud, where there is a dispute or cancellation, where verification is incomplete, or where the law requires it.`,
      `**Verification.** Before paying out, we may ask Organizers for identity, business registration, tax and bank or mobile money details. Payouts are made only to accounts in the Organizer's own name.`,
      `**Taxes.** Prices may include or exclude value added tax and other taxes as stated. Organizers are responsible for their own tax obligations, including reporting income and, where required, charging and remitting taxes such as VAT and excise duty on entertainment services.`,
      `**Errors.** If a payment is made in error or in the wrong amount, we may correct it by adjusting a later payout or by requesting repayment.`,
    ],
  },
  {
    id: "refunds",
    title: "8. Refunds, cancellations and postponements",
    blocks: [
      `**General rule.** Unless the Organizer's refund policy for the Event says otherwise, or the law requires it, all Ticket sales are final. A change of mind, a change of plans or a failure to attend is not a reason for a refund.`,
      `**Cancelled Events.** If an Event is cancelled, Attendees are entitled to a refund of the Ticket price. We will refund the face value of the Ticket through the original payment method where possible. Platform and payment processing Fees may be refunded or retained as shown at checkout or in the Organizer's agreement.`,
      `**Postponed or rescheduled Events.** If an Event is moved to a new date, Tickets stay valid for the new date. If you cannot attend the new date, you may request a refund within the period the Organizer sets, or within 14 days of the announcement if no period is set.`,
      `**Material changes.** If the Venue, headline performer or other essential feature changes in a way that substantially alters the Event, Attendees may ask for a refund within 14 days of the change being announced.`,
      `**Who pays.** Because the Organizer receives the proceeds, refunds for cancelled or materially changed Events are funded by the Organizer. We may deduct refund amounts from the Organizer's future payouts, or request repayment where there are no payouts to deduct from.`,
      `**Processing time.** Approved refunds are normally sent within 14 business days, but the time they take to arrive depends on the payment provider.`,
      `**Refund requests.** Send requests to ${SUPPORT_EMAIL} with your order reference. We may need to confirm your identity and the Ticket details.`,
    ],
  },
  {
    id: "content",
    title: "9. Content and intellectual property",
    blocks: [
      `**Our rights.** The Platform, including its software, design, trademarks, logos and underlying technology, belongs to us or our licensors and is protected by intellectual property laws. You receive a limited, personal, non-exclusive, non-transferable and revocable right to use the Platform in line with these Terms.`,
      `**Your Content.** You keep ownership of the Content you upload, such as Event descriptions, photos, videos and logos. You give us a worldwide, royalty-free, non-exclusive license to host, store, reproduce, resize, display and distribute that Content on and in connection with the Platform and our marketing of your Event, for as long as the Content is on the Platform and for a reasonable period afterwards.`,
      `**Your promises about Content.** You confirm that you own the Content or have permission to use it, that it does not infringe anyone's copyright, trademark, privacy or other rights, and that it is lawful, truthful and not offensive. People who appear in images or videos must have agreed to their use where the law requires it.`,
      `**Takedown.** We may remove or disable Content that we believe breaks these Terms or the law. If you believe Content on the Platform infringes your rights, contact ${LEGAL_EMAIL} with details of the work and where it appears.`,
      `**Feedback.** If you send us ideas or suggestions, we may use them without obligation to you.`,
    ],
  },
  {
    id: "conduct",
    title: "10. Acceptable use",
    blocks: [
      `You agree not to:`,
      {
        list: [
          `break any law or regulation, or help anyone else to do so;`,
          `provide false, misleading or impersonating information, or create fake Events or fake accounts;`,
          `use the Platform to commit fraud, launder money, or finance unlawful activity;`,
          `use bots, scrapers or other automated tools to buy Tickets, collect data or overload the Platform without our written permission;`,
          `attempt to access accounts, systems or data that you are not authorized to access, or probe, scan or test the security of the Platform;`,
          `upload viruses, malware or any code designed to damage or interfere with the Platform;`,
          `copy, modify, reverse engineer or resell any part of the Platform except as the law permits;`,
          `harass, threaten, discriminate against or abuse other users or our staff;`,
          `use the Platform to send spam or unsolicited promotional messages;`,
          `circumvent the Platform by redirecting Attendees to complete a purchase elsewhere in order to avoid Fees.`,
        ],
      },
    ],
  },
  {
    id: "fraud",
    title: "11. Fraud, chargebacks and disputes with payments",
    blocks: [
      `We use reasonable measures to detect fraud and may cancel orders, hold payouts, freeze accounts or share information with payment providers and law enforcement where we suspect fraudulent or unlawful activity.`,
      `If a payment is reversed or charged back, we may cancel the related Tickets and recover the amount, plus any fees the payment provider charges us, from the Organizer. If you dispute a payment, please contact us first at ${SUPPORT_EMAIL} so we can try to resolve it quickly.`,
    ],
  },
  {
    id: "availability",
    title: "12. Availability and changes to the Platform",
    blocks: [
      `We work to keep the Platform available, but we do not promise that it will be uninterrupted, error-free or secure at all times. We may carry out maintenance, add or remove features, or change how the Platform works. Where a change will significantly affect you, we will give reasonable notice where we can.`,
      `The Platform may contain links to third-party websites or services. We do not control them and are not responsible for their content, policies or practices.`,
    ],
  },
  {
    id: "disclaimers",
    title: "13. Disclaimers",
    blocks: [
      `The Platform is provided "as is" and "as available". To the fullest extent the law allows, we do not give any warranty, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement.`,
      `We do not warrant that Event information provided by Organizers is accurate, that Events will occur as described, or that Tickets will be accepted at the door where an Organizer or Venue fails to honor them. Nothing in these Terms excludes any right you have under Kenyan consumer protection law that cannot lawfully be excluded.`,
    ],
  },
  {
    id: "liability",
    title: "14. Limitation of liability",
    blocks: [
      `To the fullest extent the law allows, we are not liable for any indirect, incidental, special, consequential or punitive loss, or for loss of profits, revenue, goodwill, data or business opportunity, arising from your use of the Platform or from any Event.`,
      `We are not liable for the acts or omissions of Organizers, Venues, artists, security personnel or other Attendees, or for any injury, loss or damage that happens at or in connection with an Event.`,
      `Our total liability to you for any claim related to the Platform is limited to the greater of (a) the amount you paid us in Fees in the 12 months before the claim arose, and (b) KSH 10,000. This does not limit liability that cannot be limited by law, such as liability for fraud or for death or personal injury caused by our negligence.`,
    ],
  },
  {
    id: "indemnity",
    title: "15. Indemnity",
    blocks: [
      `You agree to defend, indemnify and hold harmless ${PLATFORM_NAME}, its directors, employees and partners from any claim, loss, liability, penalty and expense (including reasonable legal fees) arising from your breach of these Terms, your Content, your Event, your violation of any law or the rights of others, or any dispute between you and an Attendee, Organizer, Venue or other third party.`,
    ],
  },
  {
    id: "termination",
    title: "16. Suspension and termination",
    blocks: [
      `You may close your account at any time by contacting ${SUPPORT_EMAIL}. Organizers must first honor or refund all valid Tickets for upcoming Events.`,
      `We may suspend, restrict or end your access, unpublish Events, or withhold payouts where we reasonably believe you have broken these Terms, put users or the Platform at risk, or where the law requires it. Where practical, we will tell you why.`,
      `Sections that by their nature should continue after termination will do so, including those on fees owed, refunds, intellectual property, disclaimers, liability, indemnity and governing law.`,
    ],
  },
  {
    id: "privacy",
    title: "17. Privacy",
    blocks: [
      `Our Privacy Policy explains how we collect, use, share and protect personal data. It forms part of these Terms. You can read it at ${PRIVACY_ROUTE}.`,
    ],
  },
  {
    id: "changes",
    title: "18. Changes to these Terms",
    blocks: [
      `We may update these Terms from time to time. When we make material changes we will post the new version with a new "last updated" date and, where appropriate, notify you by email or in the dashboard. Changes apply from the date they are posted and do not affect Tickets you already bought. By continuing to use the Platform after the change, you accept the updated Terms.`,
    ],
  },
  {
    id: "law",
    title: "19. Governing law and disputes",
    blocks: [
      `These Terms are governed by the laws of the Republic of Kenya. Before starting formal proceedings, the parties agree to try in good faith to settle any dispute by contacting each other and negotiating for at least 30 days.`,
      `If a dispute is not resolved, it shall be referred to arbitration in Nairobi under the Arbitration Act, 1995 of Kenya, before a single arbitrator agreed by the parties (or appointed in line with the Act), conducted in English. Either party may still ask the courts of Kenya for urgent interim relief, and the courts of Kenya have exclusive jurisdiction over anything that cannot be arbitrated. Nothing here limits any right you have as a consumer under Kenyan law.`,
    ],
  },
  {
    id: "general",
    title: "20. General",
    blocks: [
      {
        list: [
          `**Entire agreement.** These Terms and the Privacy Policy are the whole agreement between you and us about the Platform.`,
          `**Severability.** If any part is found unenforceable, the rest stays in force.`,
          `**No waiver.** If we do not enforce a right, that is not a waiver of it.`,
          `**Assignment.** You may not transfer your rights under these Terms without our consent. We may transfer ours as part of a merger, sale or reorganization.`,
          `**Force majeure.** Neither party is liable for failure caused by events beyond reasonable control, including natural disasters, power or network failure, government action, epidemics and civil unrest.`,
          `**Notices.** We may notify you by email, in the dashboard, or by posting on the Platform. You may contact us at the details below.`,
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "21. Contact us",
    blocks: [
      `${COMPANY_NAME}, ${COMPANY_ADDRESS}.`,
      `General support and refunds: ${SUPPORT_EMAIL}. Legal and copyright notices: ${LEGAL_EMAIL}.`,
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

export const TermsAndConditions = () => {
  usePageTitle("Terms and Conditions");

  return (
    <>
      {/* 👇 ADDED SEO TAGS FOR GOOGLE */}
      <Helmet>
        <title>Terms and Conditions | TicketStream</title>
        <meta 
          name="description" 
          content="Read the TicketStream Terms and Conditions. Understand the rules for buying tickets, running events, refunds, and using our ticketing platform." 
        />
      </Helmet>

      <div className="font-sans max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-base-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <FileText size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-base-content">Terms and Conditions</h1>
          </div>
          <p className="text-xs text-base-content/60">
            Last updated: <span className="font-bold text-base-content">{LAST_UPDATED}</span>
          </p>
          <p className="text-sm text-base-content/70 leading-relaxed max-w-3xl">
            Please read these terms carefully. They explain the rules for buying tickets and running events on {PLATFORM_NAME}, what you can expect from us, and
            what we expect from you.
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
                {s.blocks.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i} className="text-sm text-base-content/75 leading-relaxed">
                      <RichText text={b} />
                    </p>
                  ) : (
                    <ul key={i} className="list-disc pl-5 flex flex-col gap-1.5 text-sm text-base-content/75 leading-relaxed marker:text-primary">
                      {b.list.map((li, j) => (
                        <li key={j}>
                          <RichText text={li} />
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </section>
            ))}

            {/* Footer links */}
            <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-base-200 pt-6">
              <Link to={PRIVACY_ROUTE} className="btn btn-ghost btn-sm bg-base-200 rounded-xl text-xs font-bold gap-1.5 w-fit">
                <ShieldCheck size={14} />
                Read our Privacy Policy
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary btn-sm rounded-xl text-xs font-bold gap-1.5 w-fit">
                <Mail size={14} />
                Questions? Contact us
              </a>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
};

export default TermsAndConditions;