"use client"

import { forwardRef, type ReactNode } from "react"
import Image from "next/image"

export type PartnerAgreementDocumentProps = {
  businessName: string
  businessId: string
  address?: string | null
  effectiveDateLabel: string
  agreementId?: string
  signed?: boolean
  signedByName?: string | null
  signedByRole?: string | null
  /** Live draft while signing (unsigned). */
  draftFullName?: string
  draftRole?: string
  onDraftFullNameChange?: (value: string) => void
  onDraftRoleChange?: (value: string) => void
  showSignInputs?: boolean
  signAction?: ReactNode
  commissionRate?: number | null
  maximumWithdrawalCommission?: number | null
  primaryContactName?: string | null
  primaryContactTitle?: string | null
  primaryContactEmail?: string | null
  primaryContactPhone?: string | null
}

/** Curly signature: full name with spaces removed. */
export function toSignatureScript(fullName: string): string {
  return fullName.replace(/\s+/g, "")
}

function DocHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-3.5 flex items-center justify-between border-b-2 border-teal-700 pb-3">
      <Image
        src="/shettar-logo.png"
        alt="Shettar"
        width={160}
        height={42}
        className="h-[42px] w-auto"
        unoptimized
      />
      <div className="text-right text-[8.5pt] leading-[1.35] text-slate-500">
        <strong className="text-slate-900">Shettar Ltd</strong>
        <br />
        {subtitle}
        <br />
        Document v1.0 · legal@shettar.com
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-[140px] py-0.5 align-top text-slate-500">{label}</td>
      <td className="py-0.5 align-top text-slate-900">{value}</td>
    </tr>
  )
}

export const PartnerAgreementDocument = forwardRef<HTMLElement, PartnerAgreementDocumentProps>(
  function PartnerAgreementDocument(
    {
      businessName,
      businessId,
      address,
      effectiveDateLabel,
      agreementId,
      signed = false,
      signedByName,
      signedByRole,
      draftFullName = "",
      draftRole = "",
      onDraftFullNameChange,
      onDraftRoleChange,
      showSignInputs = false,
      signAction,
      commissionRate = null,
      maximumWithdrawalCommission = null,
      primaryContactName = null,
      primaryContactTitle = null,
      primaryContactEmail = null,
      primaryContactPhone = null,
    },
    ref
  ) {
  const tradingName = businessName.trim() || "[TRADING / PROPERTY NAME]"
  const addressLabel = address?.trim() || "[BUSINESS REGISTERED / OPERATING ADDRESS]"
  const refId = agreementId?.trim() || businessId || "[AGREEMENT / REFERENCE ID]"
  const displayName = signed ? signedByName || "" : draftFullName
  const displayRole = signed ? signedByRole || "" : draftRole
  const signatureText = toSignatureScript(displayName)
  const commissionLabel =
    commissionRate != null && !Number.isNaN(Number(commissionRate))
      ? `${Number(commissionRate)}%`
      : "[X%]"
  const maxCommissionLabel =
    maximumWithdrawalCommission != null && !Number.isNaN(Number(maximumWithdrawalCommission))
      ? `₦${Number(maximumWithdrawalCommission).toLocaleString("en-NG")}`
      : null
  const roleLine = [displayRole.trim() || null, tradingName].filter(Boolean).join(", ")
  const contactLine = [primaryContactName?.trim() || null, primaryContactTitle?.trim() || null]
    .filter(Boolean)
    .join(", ") || "[NAME, TITLE]"
  const emailPhoneLine = [primaryContactEmail?.trim() || null, primaryContactPhone?.trim() || null]
    .filter(Boolean)
    .join(" / ") || "[EMAIL] / [PHONE]"

  return (
    <article
      ref={ref}
      data-partner-agreement-doc
      className="partner-agreement-doc mx-auto max-w-3xl bg-white text-[10.5pt] leading-[1.45] text-slate-900"
    >
      <DocHeader subtitle="Business Partner Agreement" />

      <h1 className="mb-1 mt-2.5 text-[16pt] font-semibold text-slate-900">
        Business Partner Agreement
      </h1>
      <p className="mb-2 text-[9.5pt] text-slate-500">
        Between Shettar Ltd and the Property / Business Partner
      </p>

      <div className="mb-3">
        <table className="w-full border-collapse">
          <tbody>
            <MetaRow label="Effective date" value={effectiveDateLabel} />
            <MetaRow label="Agreement ID" value={refId} />
            <MetaRow label="Governing law" value="Laws of the Federal Republic of Nigeria" />
            <MetaRow label="Contact" value="legal@shettar.com" />
          </tbody>
        </table>
      </div>

      <Section title="1. Parties">
        <p>
          This Business Partner Agreement (the <strong>“Agreement”</strong>) is entered into between:
        </p>
        <ol className="mb-2.5 list-decimal space-y-2 pl-[18px]">
          <li>
            <strong>Shettar Ltd</strong> (trading as <strong>Shettar</strong>), a company incorporated
            under the laws of Nigeria, RC No. <strong>9752808</strong> (the{" "}
            <strong>“Company”</strong>, <strong>“Shettar”</strong>, <strong>“we”</strong>, or{" "}
            <strong>“us”</strong>); and
          </li>
          <li>
            <strong>{tradingName}</strong>, trading as <strong>{tradingName}</strong>, of{" "}
            <strong>{addressLabel}</strong>, Shettar Business ID{" "}
            <strong>{businessId || "[BUSINESS UNIQUE ID]"}</strong> (the <strong>“Partner”</strong>,{" "}
            <strong>“Property”</strong>, or <strong>“you”</strong>).
          </li>
        </ol>
        <p>
          Each a <strong>“Party”</strong> and together the <strong>“Parties”</strong>.
        </p>
      </Section>

      <Section title="2. Background and purpose">
        <p>
          Shettar operates an online marketplace and related software that connects guests with hotels
          and other accommodation providers in Nigeria, and provides Partners with the Shettar Business
          portal (web and desktop) to manage listings, inventory, bookings, staff, finance, and related
          operations.
        </p>
        <p>
          The Partner wishes to list and/or operate one or more properties on Shettar, and to use the
          Business portal. Shettar wishes to appoint the Partner on the terms of this Agreement.
        </p>
      </Section>

      <Section title="3. Definitions">
        <ul className="mb-2.5 list-disc space-y-1 pl-[18px]">
          <li>
            <strong>Platform</strong> means Shettar’s websites, mobile apps, APIs, Business portal, and
            related services.
          </li>
          <li>
            <strong>Listing</strong> means a property, room type, rate, photo, amenity, policy, or other
            content published for guests.
          </li>
          <li>
            <strong>Booking</strong> means a confirmed reservation of accommodation facilitated through
            the Platform.
          </li>
          <li>
            <strong>Guest</strong> means an end user who discovers, books, or stays at the Partner’s
            property via Shettar.
          </li>
          <li>
            <strong>Fees</strong> means commissions, service fees, payment processing charges, and any
            other amounts payable under this Agreement or the then-current fee schedule.
          </li>
          <li>
            <strong>Confidential Information</strong> means non-public commercial, technical, or personal
            information disclosed by either Party.
          </li>
        </ul>
      </Section>

      <Section title="4. Appointment and scope">
        <Numbered>
          <li>
            Shettar appoints the Partner as a non-exclusive accommodation partner for the Property
            described in Schedule A (or as later registered in the Business portal).
          </li>
          <li>
            Shettar may market, display, and promote Listings to Guests, and process Bookings and
            payments through its payment partners (including Paystack).
          </li>
          <li>
            Shettar is an intermediary and technology provider. Unless expressly stated otherwise,
            Shettar is not the owner or operator of the Partner’s property and is not a party to the
            accommodation contract between Partner and Guest, except as required to facilitate payment
            and Platform rules.
          </li>
          <li>
            This Agreement does not create a partnership, joint venture, employment, or agency
            relationship beyond what is necessary to market Listings and collect/settle payments.
          </li>
        </Numbered>
      </Section>

      <Section title="5. Shettar’s obligations">
        <p>Subject to this Agreement, Shettar will use reasonable efforts to:</p>
        <Numbered>
          <li>
            Provide access to the Business portal and related Platform features for which the Partner is
            enabled.
          </li>
          <li>Display approved Listings to Guests and facilitate Bookings.</li>
          <li>
            Process Guest payments through approved payment partners and settle Partner payouts according
            to Section 8.
          </li>
          <li>Provide reasonable Partner support for Platform issues.</li>
          <li>
            Maintain commercially reasonable security and availability for the Platform, without
            guaranteeing uninterrupted service.
          </li>
        </Numbered>
      </Section>

      <Section title="6. Partner’s obligations">
        <h3 className="mb-1 mt-3 text-[10.5pt] font-semibold">6.1 Legal capacity and verification</h3>
        <Numbered>
          <li>
            The Partner warrants that it is duly authorised to operate the Property and to enter this
            Agreement.
          </li>
          <li>
            The Partner will complete Shettar’s business verification / KYC process and keep
            registration, ownership, tax, and bank details accurate and up to date.
          </li>
          <li>
            Shettar may suspend Listings, payouts, or portal access until verification is satisfactory.
          </li>
        </Numbered>

        <h3 className="mb-1 mt-3 text-[10.5pt] font-semibold">6.2 Listings, rates, and inventory</h3>
        <Numbered>
          <li>
            The Partner is solely responsible for the accuracy of all Listing content, including photos,
            amenities, house rules, check-in/out times, and cancellation policies.
          </li>
          <li>
            The Partner will keep rates, taxes/fees shown to Guests, and room availability accurate in
            real time (or as near as reasonably practicable).
          </li>
          <li>
            The Partner will not engage in bait pricing, discriminatory pricing prohibited by law, or
            misleading promotions.
          </li>
        </Numbered>

        <h3 className="mb-1 mt-3 text-[10.5pt] font-semibold">6.3 Guest service and stay fulfilment</h3>
        <Numbered>
          <li>
            The Partner is solely responsible for providing the accommodation and related on-property
            services to the standard described in the Listing.
          </li>
          <li>
            The Partner will honour confirmed Bookings, honour stated cancellation policies, and respond
            promptly to Guest and Shettar communications.
          </li>
          <li>
            The Partner will comply with all applicable health, safety, licensing, tax, and hospitality
            laws.
          </li>
        </Numbered>

        <h3 className="mb-1 mt-3 text-[10.5pt] font-semibold">6.4 Staff and portal security</h3>
        <Numbered>
          <li>
            The Partner is responsible for all activity under its Business portal accounts, including
            staff users it invites.
          </li>
          <li>
            The Partner will keep credentials confidential, apply least-privilege staff permissions, and
            notify Shettar promptly of suspected unauthorised access.
          </li>
        </Numbered>

        <h3 className="mb-1 mt-3 text-[10.5pt] font-semibold">6.5 Offline / direct diversion</h3>
        <Numbered>
          <li>
            The Partner will not solicit Guests who discovered or booked via Shettar to complete the same
            stay outside the Platform for the purpose of avoiding Fees, except where Shettar expressly
            permits cash/POS on arrival and such payment is recorded as required.
          </li>
        </Numbered>
      </Section>

      <Section title="7. Bookings, cancellations, and refunds">
        <Numbered>
          <li>
            A Booking is confirmed when Shettar notifies the Partner (via portal, email, or other channel)
            after successful payment or accepted cash/POS flow, as applicable.
          </li>
          <li>
            The Partner’s published cancellation policy applies to Guests, provided it is clear, lawful,
            and consistent with Platform rules.
          </li>
          <li>
            Where a refund is due to a Guest under the applicable policy or a mutual resolution, Shettar
            may process the refund through the Guest wallet or original payment method and adjust Partner
            settlement accordingly.
          </li>
          <li>
            No-shows, overbookings, and property closures are the Partner’s responsibility. Shettar may,
            acting reasonably, cancel affected Bookings, refund Guests, and recover related amounts from
            the Partner.
          </li>
        </Numbered>
      </Section>

      <Section title="8. Fees, payments, and payouts">
        <Numbered>
          <li>
            The Partner agrees to pay Shettar the Fees set out in Schedule B (or the fee schedule then
            published in the Business portal), including:
            <ul className="mt-1 list-disc space-y-1 pl-[18px]">
              <li>
                Platform / payout commission of <strong>{commissionLabel}</strong> of eligible
                withdrawal amounts (or as otherwise agreed in writing); and
              </li>
              <li>
                any applicable payment-processing or payout fees charged by payment partners, as
                disclosed.
              </li>
            </ul>
          </li>
          <li>
            Guest payments collected by Shettar (or its payment partner) are held and settled to the
            Partner’s verified bank account after deduction of Fees, refunds, chargebacks, and other
            authorised adjustments.
          </li>
          <li>
            Payout timing is subject to verification, fraud checks, and payment-partner settlement
            cycles
            {maxCommissionLabel ? (
              <>
                . Platform commission on a single withdrawal is capped at{" "}
                <strong>{maxCommissionLabel}</strong> where a maximum applies
              </>
            ) : null}
            .
          </li>
          <li>
            The Partner must maintain a verified company bank account in the portal. Shettar is not liable
            for payouts sent to incorrect details supplied by the Partner.
          </li>
          <li>
            Chargebacks, payment disputes, and fraud losses attributable to the Partner’s acts or Listing
            may be deducted from future payouts or invoiced to the Partner.
          </li>
          <li>
            Unless otherwise stated, amounts are in Nigerian Naira (₦). The Partner is responsible for its
            own taxes.
          </li>
        </Numbered>
      </Section>

      <Section title="9. Intellectual property and marketing">
        <Numbered>
          <li>Shettar retains all rights in the Platform, trademarks, and software.</li>
          <li>
            The Partner grants Shettar a non-exclusive, worldwide, royalty-free licence to use Listing
            content, property name, and logos to operate, market, and improve the Platform.
          </li>
          <li>The Partner warrants it owns or has rights to all content it uploads.</li>
          <li>
            Neither Party may use the other’s marks in a misleading way or imply endorsement beyond this
            commercial relationship.
          </li>
        </Numbered>
      </Section>

      <Section title="10. Data protection and confidentiality">
        <Numbered>
          <li>
            Each Party will comply with applicable data protection laws in Nigeria (including the NDPR as
            applicable) when processing Guest or staff personal data.
          </li>
          <li>
            The Partner will use Guest personal data only to fulfil Bookings and lawful hospitality
            obligations, and not for unrelated marketing without a lawful basis.
          </li>
          <li>
            Each Party will keep the other’s Confidential Information confidential and use it only to
            perform this Agreement, except where disclosure is required by law.
          </li>
        </Numbered>
      </Section>

      <Section title="11. Acceptable use and Platform rules">
        <Numbered>
          <li>
            The Partner will not misuse the Platform, attempt unauthorised access, scrape Guest data
            unlawfully, or upload malware or illegal content.
          </li>
          <li>
            Shettar may remove Listings, restrict features, or suspend accounts for policy, fraud, safety,
            or legal risk, with notice where reasonably practicable.
          </li>
        </Numbered>
      </Section>

      <Section title="12. Term and termination">
        <Numbered>
          <li>This Agreement starts on the Effective Date and continues until terminated.</li>
          <li>
            Either Party may terminate for convenience on <strong>[30]</strong> days’ written notice.
          </li>
          <li>
            Either Party may terminate immediately if the other materially breaches this Agreement and
            fails to cure within <strong>[14]</strong> days of notice (or immediately for fraud,
            illegality, or insolvency).
          </li>
          <li>
            On termination, Shettar may delist the Property. Confirmed future Bookings remain the
            Partner’s responsibility to fulfil or lawfully cancel/refund. Accrued payment obligations
            survive.
          </li>
        </Numbered>
      </Section>

      <Section title="13. Warranties and disclaimer">
        <Numbered>
          <li>Each Party warrants it has authority to enter this Agreement.</li>
          <li>
            Except as expressly stated, the Platform is provided “as is” and “as available”. Shettar does
            not warrant uninterrupted or error-free service.
          </li>
        </Numbered>
      </Section>

      <Section title="14. Liability">
        <Numbered>
          <li>The Partner remains fully responsible for the Property, Guest stays, and on-site incidents.</li>
          <li>
            To the fullest extent permitted by law, Shettar is not liable for indirect, incidental,
            special, or consequential loss, or loss of profits, revenue, or goodwill.
          </li>
          <li>
            Shettar’s aggregate liability arising out of this Agreement in any 12-month period is limited
            to the total Fees actually retained by Shettar from the Partner’s Bookings in that period (or
            ₦<strong>[CAP AMOUNT]</strong>, whichever is higher), except for liability that cannot be
            limited by law (including fraud).
          </li>
          <li>
            The Partner will indemnify Shettar against claims arising from the Partner’s Property, Listing
            content, Guest stays, tax failures, or breach of this Agreement, except to the extent caused
            by Shettar’s wilful misconduct.
          </li>
        </Numbered>
      </Section>

      <Section title="15. Changes">
        <Numbered>
          <li>Shettar may update Platform features and policies from time to time.</li>
          <li>
            Material changes to Fees or this Agreement will be notified via the Business portal and/or
            email. Continued use after the effective date of a notified change constitutes acceptance,
            unless the Partner terminates under Section 12.
          </li>
        </Numbered>
      </Section>

      <Section title="16. General">
        <Numbered>
          <li>
            <strong>Notices.</strong> Formal notices may be sent to the emails and addresses in Schedule A
            (and legal@shettar.com for Shettar).
          </li>
          <li>
            <strong>Assignment.</strong> The Partner may not assign this Agreement without Shettar’s prior
            written consent. Shettar may assign to an affiliate or successor.
          </li>
          <li>
            <strong>Entire agreement.</strong> This Agreement (including Schedules and portal fee schedule)
            is the entire agreement on its subject and supersedes prior proposals on the same subject,
            except Guest-facing Terms that continue to apply to Guests.
          </li>
          <li>
            <strong>Severability.</strong> If any clause is unenforceable, the remainder continues in
            force.
          </li>
          <li>
            <strong>Governing law and disputes.</strong> Nigerian law applies. The Parties will first
            attempt good-faith negotiation; failing that, the courts of Nigeria that have competent
            jurisdiction over the dispute shall hear the matter.
          </li>
          <li>
            <strong>Counterparts.</strong> This Agreement may be signed in counterparts, including
            electronic signature / acceptance in the Business portal.
          </li>
        </Numbered>
      </Section>

      <div className="mt-10 border-t border-slate-200 pt-6">
        <Section title="Schedule A — Partner and Property details">
          <table className="mb-3 w-full border-collapse">
            <tbody>
              <MetaRow label="Legal name" value={tradingName} />
              <MetaRow label="Trading / property name" value={tradingName} />
              <MetaRow label="Shettar Business ID" value={businessId || "[BTHF… / UNIQUE ID]"} />
              <MetaRow label="Property address" value={addressLabel} />
              <MetaRow label="Primary contact" value={contactLine} />
              <MetaRow label="Email / phone" value={emailPhoneLine} />
              <MetaRow
                label="Bank account (payout)"
                value="as verified in portal"
              />
            </tbody>
          </table>
        </Section>

        <Section title="Schedule B — Fees">
          <table className="mb-3 w-full border-collapse">
            <tbody>
              <MetaRow
                label="Platform commission"
                value={`${commissionLabel} of eligible withdrawal amounts`}
              />
              <MetaRow
                label="Payment processing"
                value="As charged by Paystack / payment partner and disclosed in portal"
              />
              <MetaRow
                label="Commission cap"
                value={maxCommissionLabel || "As configured on the platform"}
              />
              <MetaRow label="Other fees" value="Ads, AI points, and other portal products as disclosed" />
            </tbody>
          </table>
        </Section>

        <Section title="Authority and acceptance">
          <div className="mt-4 pt-1">
            <p>
              If you are accepting the terms of this Agreement on behalf of your employer or another
              entity, you represent and warrant that you have full legal authority to bind your employer
              or such entity to these terms. If you do not have the legal authority to bind that entity, do
              not sign or accept this Agreement.
            </p>
            <p>
              By signing below (or by clicking Accept in the Shettar Business portal when this Agreement is
              presented electronically), I am accepting these terms on behalf of the Partner named in
              Schedule A. I represent and warrant that (a) I have the full authority to bind the entity to
              these terms, (b) I have read and understand the terms of this Agreement, and (c) I agree to
              all the terms of this Agreement on behalf of the entity that I represent.
            </p>
          </div>
        </Section>

        <div className="mt-6 max-w-md rounded border border-slate-300 bg-white px-5 pb-4 pt-4">
          <p className="mb-3 text-[9pt] text-slate-500">
            <strong className="text-slate-900">Partner signature</strong>
          </p>

          <p
            className="mb-1 min-h-[2.5rem] text-[20pt] font-normal leading-none text-slate-900"
            style={{
              fontFamily: "var(--font-alex-brush), 'Alex Brush', cursive",
              fontWeight: 400,
              letterSpacing: "-0.06em",
            }}
          >
            {signatureText || "\u00a0"}
          </p>

          <p className="m-0 text-[10pt] font-medium text-slate-700">
            {roleLine || "\u00a0"}
          </p>

          {showSignInputs && (
            <div
              data-agreement-no-print
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
            >
              <label className="block space-y-1.5">
                <span className="text-[9pt] font-medium text-slate-600">Full name (for signature)</span>
                <input
                  type="text"
                  value={draftFullName}
                  onChange={(e) => onDraftFullNameChange?.(e.target.value)}
                  placeholder="e.g. Ada Okonkwo"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-teal-700/30 focus:ring-2"
                  autoComplete="name"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[9pt] font-medium text-slate-600">Your role</span>
                <input
                  type="text"
                  value={draftRole}
                  onChange={(e) => onDraftRoleChange?.(e.target.value)}
                  placeholder="e.g. General Manager"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-teal-700/30 focus:ring-2"
                  autoComplete="organization-title"
                />
              </label>
              {signAction}
            </div>
          )}
        </div>

        <p className="mt-[22px] text-[9pt] text-slate-500">
          © Shettar Ltd. Official Business Partner Agreement — Document version 1.0. Questions:
          legal@shettar.com
        </p>
      </div>
    </article>
  )
})

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-1">
      <h2 className="mb-2 mt-4 border-b border-slate-200 pb-1 text-[11.5pt] font-semibold text-slate-900">
        {title}
      </h2>
      <div className="space-y-2 [&_p]:mb-2 [&_strong]:font-semibold">{children}</div>
    </section>
  )
}

function Numbered({ children }: { children: ReactNode }) {
  return <ol className="mb-2.5 list-decimal space-y-2 pl-[18px]">{children}</ol>
}
