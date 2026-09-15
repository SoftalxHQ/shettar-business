/**
 * Build and download a multi-page A4 PDF of the current business partner agreement.
 *
 * Uses a self-contained HTML document with plain CSS (no Tailwind), then rasterizes
 * it — avoids lab()/oklch() parse errors and broken word spacing from style inlining.
 */

export type PartnerAgreementPdfInput = {
  businessName: string
  businessId: string
  address?: string | null
  effectiveDateLabel: string
  agreementId?: string
  signed?: boolean
  signedByName?: string | null
  signedByRole?: string | null
  commissionRate?: number | null
  maximumWithdrawalCommission?: number | null
  primaryContactName?: string | null
  primaryContactTitle?: string | null
  primaryContactEmail?: string | null
  primaryContactPhone?: string | null
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

function toSignatureScript(fullName: string): string {
  return fullName.replace(/\s+/g, "")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function metaRow(label: string, value: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
}

function buildAgreementHtml(input: PartnerAgreementPdfInput, logoUrl: string): string {
  const tradingName = input.businessName.trim() || "[TRADING / PROPERTY NAME]"
  const addressLabel = input.address?.trim() || "[BUSINESS REGISTERED / OPERATING ADDRESS]"
  const businessId = input.businessId.trim() || "[BUSINESS UNIQUE ID]"
  const refId = input.agreementId?.trim() || businessId
  const commissionLabel =
    input.commissionRate != null && !Number.isNaN(Number(input.commissionRate))
      ? `${Number(input.commissionRate)}%`
      : "[X%]"
  const maxCommissionLabel =
    input.maximumWithdrawalCommission != null &&
    !Number.isNaN(Number(input.maximumWithdrawalCommission))
      ? `NGN ${Number(input.maximumWithdrawalCommission).toLocaleString("en-NG")}`
      : null
  const contactLine =
    [input.primaryContactName?.trim() || null, input.primaryContactTitle?.trim() || null]
      .filter(Boolean)
      .join(", ") || "[NAME, TITLE]"
  const emailPhoneLine =
    [input.primaryContactEmail?.trim() || null, input.primaryContactPhone?.trim() || null]
      .filter(Boolean)
      .join(" / ") || "[EMAIL] / [PHONE]"
  const signatureText = input.signed
    ? toSignatureScript(input.signedByName || "")
    : ""
  const roleLine = input.signed
    ? [input.signedByRole?.trim() || null, tradingName].filter(Boolean).join(", ")
    : tradingName

  const header = (subtitle: string) => `
    <div class="header">
      <div class="header-left">
        <img class="header-logo" src="${escapeHtml(logoUrl)}" alt="Shettar" />
      </div>
      <div class="header-right">
        <div class="header-meta">
          <strong>Shettar Ltd</strong><br />
          ${escapeHtml(subtitle)}<br />
          Document v1.0 · legal@shettar.com
        </div>
      </div>
    </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      letter-spacing: normal;
      word-spacing: normal;
      color: #0f172a;
      margin: 0;
      padding: 28px 32px 48px;
      background: #ffffff;
      width: 794px;
    }
    .header {
      display: table;
      width: 100%;
      margin-bottom: 14px;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
    }
    .header-left, .header-right {
      display: table-cell;
      vertical-align: middle;
    }
    .header-left { width: 55%; }
    .header-right { width: 45%; text-align: right; }
    .header-logo { height: 42px; width: auto; display: block; }
    .header-meta { font-size: 8.5pt; color: #64748b; line-height: 1.35; }
    .header-meta strong { color: #0f172a; }
    h1 { font-size: 16pt; margin: 10px 0 4px; color: #0f172a; font-weight: 600; }
    h2 {
      font-size: 11.5pt;
      margin: 16px 0 8px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      font-weight: 600;
    }
    h3 { font-size: 10.5pt; margin: 12px 0 4px; font-weight: 600; }
    p { margin: 0 0 8px; }
    /* Absolute markers keep numbers flush with the first line of each sentence. */
    ol {
      list-style: none;
      margin: 0 0 10px;
      padding: 0;
      counter-reset: item;
    }
    ol > li {
      position: relative;
      margin: 0 0 8px;
      padding-left: 1.85em;
      counter-increment: item;
    }
    ol > li::before {
      position: absolute;
      left: 0;
      top: 0;
      width: 1.55em;
      content: counter(item) ".";
      text-align: right;
      font-variant-numeric: tabular-nums;
      line-height: 1.5;
    }
    ol ol {
      margin: 6px 0 0;
      padding: 0;
      counter-reset: subitem;
    }
    ol ol > li { counter-increment: subitem; }
    ol ol > li::before {
      content: counter(subitem) ".";
      width: 1.4em;
    }
    ul {
      list-style: none;
      margin: 0 0 10px;
      padding: 0;
    }
    ul > li {
      position: relative;
      margin: 0 0 6px;
      padding-left: 1.25em;
    }
    ul > li::before {
      position: absolute;
      left: 0;
      top: 0;
      width: 0.9em;
      content: "•";
      text-align: right;
      line-height: 1.5;
    }
    li > ul, li > ol {
      margin-top: 6px;
      margin-bottom: 0;
    }
    .muted { color: #64748b; font-size: 9.5pt; }
    .meta { margin-bottom: 12px; }
    .meta table { width: 100%; border-collapse: collapse; }
    .meta td { padding: 3px 0; vertical-align: top; }
    .meta td:first-child { width: 140px; color: #64748b; }
    .small { font-size: 9pt; color: #64748b; }
    strong { font-weight: 600; }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 18px 20px 14px;
      max-width: 360px;
      margin-top: 18px;
      background: #ffffff;
    }
    .sig-script {
      font-family: "Alex Brush", cursive;
      font-size: 28pt;
      font-weight: 400;
      letter-spacing: -0.04em;
      color: #0f172a;
      line-height: 1.1;
      margin: 0 0 6px;
      min-height: 1.2em;
    }
    .sig-title {
      font-family: Inter, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #334155;
      margin: 0;
      font-weight: 500;
      letter-spacing: normal;
      word-spacing: normal;
    }
    .schedules { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  ${header("Business Partner Agreement")}

  <h1>Business Partner Agreement</h1>
  <p class="muted">Between Shettar Ltd and the Property / Business Partner</p>

  <div class="meta">
    <table>
      ${metaRow("Effective date", input.effectiveDateLabel)}
      ${metaRow("Agreement ID", refId)}
      ${metaRow("Governing law", "Laws of the Federal Republic of Nigeria")}
      ${metaRow("Contact", "legal@shettar.com")}
    </table>
  </div>

  <h2>1. Parties</h2>
  <p>This Business Partner Agreement (the <strong>“Agreement”</strong>) is entered into between:</p>
  <ol>
    <li>
      <strong>Shettar Ltd</strong> (trading as <strong>Shettar</strong>), a company incorporated
      under the laws of Nigeria, RC No. <strong>9752808</strong>
      (the <strong>“Company”</strong>, <strong>“Shettar”</strong>, <strong>“we”</strong>, or
      <strong>“us”</strong>); and
    </li>
    <li>
      <strong>${escapeHtml(tradingName)}</strong>, trading as <strong>${escapeHtml(tradingName)}</strong>,
      of <strong>${escapeHtml(addressLabel)}</strong>, Shettar Business ID
      <strong>${escapeHtml(businessId)}</strong>
      (the <strong>“Partner”</strong>, <strong>“Property”</strong>, or <strong>“you”</strong>).
    </li>
  </ol>
  <p>Each a <strong>“Party”</strong> and together the <strong>“Parties”</strong>.</p>

  <h2>2. Background and purpose</h2>
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

  <h2>3. Definitions</h2>
  <ul>
    <li><strong>Platform</strong> means Shettar’s websites, mobile apps, APIs, Business portal, and related services.</li>
    <li><strong>Listing</strong> means a property, room type, rate, photo, amenity, policy, or other content published for guests.</li>
    <li><strong>Booking</strong> means a confirmed reservation of accommodation facilitated through the Platform.</li>
    <li><strong>Guest</strong> means an end user who discovers, books, or stays at the Partner’s property via Shettar.</li>
    <li><strong>Fees</strong> means commissions, service fees, payment processing charges, and any other amounts payable under this Agreement or the then-current fee schedule.</li>
    <li><strong>Confidential Information</strong> means non-public commercial, technical, or personal information disclosed by either Party.</li>
  </ul>

  <h2>4. Appointment and scope</h2>
  <ol>
    <li>Shettar appoints the Partner as a non-exclusive accommodation partner for the Property described in Schedule A (or as later registered in the Business portal).</li>
    <li>Shettar may market, display, and promote Listings to Guests, and process Bookings and payments through its payment partners (including Paystack).</li>
    <li>Shettar is an intermediary and technology provider. Unless expressly stated otherwise, Shettar is not the owner or operator of the Partner’s property and is not a party to the accommodation contract between Partner and Guest, except as required to facilitate payment and Platform rules.</li>
    <li>This Agreement does not create a partnership, joint venture, employment, or agency relationship beyond what is necessary to market Listings and collect/settle payments.</li>
  </ol>

  <h2>5. Shettar’s obligations</h2>
  <p>Subject to this Agreement, Shettar will use reasonable efforts to:</p>
  <ol>
    <li>Provide access to the Business portal and related Platform features for which the Partner is enabled.</li>
    <li>Display approved Listings to Guests and facilitate Bookings.</li>
    <li>Process Guest payments through approved payment partners and settle Partner payouts according to Section 8.</li>
    <li>Provide reasonable Partner support for Platform issues.</li>
    <li>Maintain commercially reasonable security and availability for the Platform, without guaranteeing uninterrupted service.</li>
  </ol>

  <h2>6. Partner’s obligations</h2>
  <h3>6.1 Legal capacity and verification</h3>
  <ol>
    <li>The Partner warrants that it is duly authorised to operate the Property and to enter this Agreement.</li>
    <li>The Partner will complete Shettar’s business verification / KYC process and keep registration, ownership, tax, and bank details accurate and up to date.</li>
    <li>Shettar may suspend Listings, payouts, or portal access until verification is satisfactory.</li>
  </ol>
  <h3>6.2 Listings, rates, and inventory</h3>
  <ol>
    <li>The Partner is solely responsible for the accuracy of all Listing content, including photos, amenities, house rules, check-in/out times, and cancellation policies.</li>
    <li>The Partner will keep rates, taxes/fees shown to Guests, and room availability accurate in real time (or as near as reasonably practicable).</li>
    <li>The Partner will not engage in bait pricing, discriminatory pricing prohibited by law, or misleading promotions.</li>
  </ol>
  <h3>6.3 Guest service and stay fulfilment</h3>
  <ol>
    <li>The Partner is solely responsible for providing the accommodation and related on-property services to the standard described in the Listing.</li>
    <li>The Partner will honour confirmed Bookings, honour stated cancellation policies, and respond promptly to Guest and Shettar communications.</li>
    <li>The Partner will comply with all applicable health, safety, licensing, tax, and hospitality laws.</li>
  </ol>
  <h3>6.4 Staff and portal security</h3>
  <ol>
    <li>The Partner is responsible for all activity under its Business portal accounts, including staff users it invites.</li>
    <li>The Partner will keep credentials confidential, apply least-privilege staff permissions, and notify Shettar promptly of suspected unauthorised access.</li>
  </ol>
  <h3>6.5 Offline / direct diversion</h3>
  <ol>
    <li>The Partner will not solicit Guests who discovered or booked via Shettar to complete the same stay outside the Platform for the purpose of avoiding Fees, except where Shettar expressly permits cash/POS on arrival and such payment is recorded as required.</li>
  </ol>

  <h2>7. Bookings, cancellations, and refunds</h2>
  <ol>
    <li>A Booking is confirmed when Shettar notifies the Partner (via portal, email, or other channel) after successful payment or accepted cash/POS flow, as applicable.</li>
    <li>The Partner’s published cancellation policy applies to Guests, provided it is clear, lawful, and consistent with Platform rules.</li>
    <li>Where a refund is due to a Guest under the applicable policy or a mutual resolution, Shettar may process the refund through the Guest wallet or original payment method and adjust Partner settlement accordingly.</li>
    <li>No-shows, overbookings, and property closures are the Partner’s responsibility. Shettar may, acting reasonably, cancel affected Bookings, refund Guests, and recover related amounts from the Partner.</li>
  </ol>

  <h2>8. Fees, payments, and payouts</h2>
  <ol>
    <li>
      The Partner agrees to pay Shettar the Fees set out in Schedule B (or the fee schedule then
      published in the Business portal), including:
      <ul>
        <li>Platform / payout commission of <strong>${escapeHtml(commissionLabel)}</strong> of eligible withdrawal amounts (or as otherwise agreed in writing); and</li>
        <li>any applicable payment-processing or payout fees charged by payment partners, as disclosed.</li>
      </ul>
    </li>
    <li>Guest payments collected by Shettar (or its payment partner) are held and settled to the Partner’s verified bank account after deduction of Fees, refunds, chargebacks, and other authorised adjustments.</li>
    <li>
      Payout timing is subject to verification, fraud checks, and payment-partner settlement cycles
      ${maxCommissionLabel ? `. Platform commission on a single withdrawal is capped at <strong>${escapeHtml(maxCommissionLabel)}</strong> where a maximum applies` : ""}.
    </li>
    <li>The Partner must maintain a verified company bank account in the portal. Shettar is not liable for payouts sent to incorrect details supplied by the Partner.</li>
    <li>Chargebacks, payment disputes, and fraud losses attributable to the Partner’s acts or Listing may be deducted from future payouts or invoiced to the Partner.</li>
    <li>Unless otherwise stated, amounts are in Nigerian Naira (₦). The Partner is responsible for its own taxes.</li>
  </ol>

  <h2>9. Intellectual property and marketing</h2>
  <ol>
    <li>Shettar retains all rights in the Platform, trademarks, and software.</li>
    <li>The Partner grants Shettar a non-exclusive, worldwide, royalty-free licence to use Listing content, property name, and logos to operate, market, and improve the Platform.</li>
    <li>The Partner warrants it owns or has rights to all content it uploads.</li>
    <li>Neither Party may use the other’s marks in a misleading way or imply endorsement beyond this commercial relationship.</li>
  </ol>

  <h2>10. Data protection and confidentiality</h2>
  <ol>
    <li>Each Party will comply with applicable data protection laws in Nigeria (including the NDPR as applicable) when processing Guest or staff personal data.</li>
    <li>The Partner will use Guest personal data only to fulfil Bookings and lawful hospitality obligations, and not for unrelated marketing without a lawful basis.</li>
    <li>Each Party will keep the other’s Confidential Information confidential and use it only to perform this Agreement, except where disclosure is required by law.</li>
  </ol>

  <h2>11. Acceptable use and Platform rules</h2>
  <ol>
    <li>The Partner will not misuse the Platform, attempt unauthorised access, scrape Guest data unlawfully, or upload malware or illegal content.</li>
    <li>Shettar may remove Listings, restrict features, or suspend accounts for policy, fraud, safety, or legal risk, with notice where reasonably practicable.</li>
  </ol>

  <h2>12. Term and termination</h2>
  <ol>
    <li>This Agreement starts on the Effective Date and continues until terminated.</li>
    <li>Either Party may terminate for convenience on <strong>[30]</strong> days’ written notice.</li>
    <li>Either Party may terminate immediately if the other materially breaches this Agreement and fails to cure within <strong>[14]</strong> days of notice (or immediately for fraud, illegality, or insolvency).</li>
    <li>On termination, Shettar may delist the Property. Confirmed future Bookings remain the Partner’s responsibility to fulfil or lawfully cancel/refund. Accrued payment obligations survive.</li>
  </ol>

  <h2>13. Warranties and disclaimer</h2>
  <ol>
    <li>Each Party warrants it has authority to enter this Agreement.</li>
    <li>Except as expressly stated, the Platform is provided “as is” and “as available”. Shettar does not warrant uninterrupted or error-free service.</li>
  </ol>

  <h2>14. Liability</h2>
  <ol>
    <li>The Partner remains fully responsible for the Property, Guest stays, and on-site incidents.</li>
    <li>To the fullest extent permitted by law, Shettar is not liable for indirect, incidental, special, or consequential loss, or loss of profits, revenue, or goodwill.</li>
    <li>Shettar’s aggregate liability arising out of this Agreement in any 12-month period is limited to the total Fees actually retained by Shettar from the Partner’s Bookings in that period (or ₦<strong>[CAP AMOUNT]</strong>, whichever is higher), except for liability that cannot be limited by law (including fraud).</li>
    <li>The Partner will indemnify Shettar against claims arising from the Partner’s Property, Listing content, Guest stays, tax failures, or breach of this Agreement, except to the extent caused by Shettar’s wilful misconduct.</li>
  </ol>

  <h2>15. Changes</h2>
  <ol>
    <li>Shettar may update Platform features and policies from time to time.</li>
    <li>Material changes to Fees or this Agreement will be notified via the Business portal and/or email. Continued use after the effective date of a notified change constitutes acceptance, unless the Partner terminates under Section 12.</li>
  </ol>

  <h2>16. General</h2>
  <ol>
    <li><strong>Notices.</strong> Formal notices may be sent to the emails and addresses in Schedule A (and legal@shettar.com for Shettar).</li>
    <li><strong>Assignment.</strong> The Partner may not assign this Agreement without Shettar’s prior written consent. Shettar may assign to an affiliate or successor.</li>
    <li><strong>Entire agreement.</strong> This Agreement (including Schedules and portal fee schedule) is the entire agreement on its subject and supersedes prior proposals on the same subject, except Guest-facing Terms that continue to apply to Guests.</li>
    <li><strong>Severability.</strong> If any clause is unenforceable, the remainder continues in force.</li>
    <li><strong>Governing law and disputes.</strong> Nigerian law applies. The Parties will first attempt good-faith negotiation; failing that, the courts of Nigeria that have competent jurisdiction over the dispute shall hear the matter.</li>
    <li><strong>Counterparts.</strong> This Agreement may be signed in counterparts, including electronic signature / acceptance in the Business portal.</li>
  </ol>

  <div class="schedules">
    <h2>Schedule A — Partner and Property details</h2>
    <div class="meta">
      <table>
        ${metaRow("Legal name", tradingName)}
        ${metaRow("Trading / property name", tradingName)}
        ${metaRow("Shettar Business ID", businessId)}
        ${metaRow("Property address", addressLabel)}
        ${metaRow("Primary contact", contactLine)}
        ${metaRow("Email / phone", emailPhoneLine)}
        ${metaRow("Bank account (payout)", "as verified in portal")}
      </table>
    </div>

    <h2>Schedule B — Fees</h2>
    <div class="meta">
      <table>
        ${metaRow("Platform commission", `${commissionLabel} of eligible withdrawal amounts`)}
        ${metaRow("Payment processing", "As charged by Paystack / payment partner and disclosed in portal")}
        ${metaRow("Commission cap", maxCommissionLabel || "As configured on the platform")}
        ${metaRow("Other fees", "Ads, AI points, and other portal products as disclosed")}
      </table>
    </div>

    <h2>Authority and acceptance</h2>
    <p>
      If you are accepting the terms of this Agreement on behalf of your employer or another entity,
      you represent and warrant that you have full legal authority to bind your employer or such
      entity to these terms. If you do not have the legal authority to bind that entity, do not sign
      or accept this Agreement.
    </p>
    <p>
      By signing below (or by clicking Accept in the Shettar Business portal when this Agreement is
      presented electronically), I am accepting these terms on behalf of the Partner named in
      Schedule A. I represent and warrant that (a) I have the full authority to bind the entity to
      these terms, (b) I have read and understand the terms of this Agreement, and (c) I agree to
      all the terms of this Agreement on behalf of the entity that I represent.
    </p>

    <div class="sig-box">
      <p class="small" style="margin-bottom:10px"><strong>Partner signature</strong></p>
      <p class="sig-script">${escapeHtml(signatureText || " ")}</p>
      <p class="sig-title">${escapeHtml(roleLine)}</p>
    </div>

    <p class="small" style="margin-top:22px">
      © Shettar Ltd. Official Business Partner Agreement — Document version 1.0.
      Questions: legal@shettar.com
    </p>
  </div>
</body>
</html>`
}

async function waitForAssets(doc: Document): Promise<void> {
  const waits: Promise<unknown>[] = Array.from(doc.images).map((img) =>
    img.decode?.().catch(() => undefined) ??
    new Promise<void>((resolve) => {
      if (img.complete) return resolve()
      img.addEventListener("load", () => resolve(), { once: true })
      img.addEventListener("error", () => resolve(), { once: true })
    })
  )
  if (doc.fonts?.ready) waits.push(doc.fonts.ready.catch(() => undefined))
  await Promise.race([
    Promise.all(waits),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ])
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )
}

async function rasterizeHtml(html: string): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas")

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.left = "0"
  iframe.style.top = "0"
  iframe.style.width = "850px"
  iframe.style.height = "1200px"
  iframe.style.opacity = "0"
  iframe.style.pointerEvents = "none"
  iframe.style.zIndex = "-1"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error("Could not create PDF render frame")
    doc.open()
    doc.write(html)
    doc.close()

    await waitForAssets(doc)

    const target = doc.body
    iframe.style.height = `${Math.max(target.scrollHeight + 40, 1200)}px`

    await new Promise((resolve) => setTimeout(resolve, 120))

    return await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: target.scrollWidth,
      height: target.scrollHeight,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    })
  } finally {
    iframe.remove()
  }
}

/** Prefer breaking on a mostly-white row so text isn't sliced mid-line. */
function findPageBreakY(
  source: HTMLCanvasElement,
  startY: number,
  idealEndY: number
): number {
  const endY = Math.min(idealEndY, source.height)
  if (endY >= source.height) return source.height
  if (endY <= startY + 40) return endY

  const ctx = source.getContext("2d", { willReadFrequently: true })
  if (!ctx) return endY

  const searchStart = Math.max(startY + 40, endY - 120)
  for (let y = endY; y >= searchStart; y -= 2) {
    const row = ctx.getImageData(0, y, source.width, 1).data
    let ink = 0
    for (let i = 0; i < row.length; i += 16) {
      // Sample every 4th pixel for speed
      if (row[i] < 248 || row[i + 1] < 248 || row[i + 2] < 248) ink += 1
    }
    if (ink < source.width * 0.01) return y
  }
  return endY
}

export async function downloadPartnerAgreementPdf(
  input: PartnerAgreementPdfInput
): Promise<void> {
  const { jsPDF } = await import("jspdf")

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"
  const logoUrl = `${origin}/shettar-logo.png`
  const html = buildAgreementHtml(input, logoUrl)
  const canvas = await rasterizeHtml(html)

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = 14
  const marginTop = 14
  const marginBottom = 18
  const printableWidth = pageWidth - marginX * 2
  const printableHeight = pageHeight - marginTop - marginBottom
  const idealPageCanvasHeight = Math.floor(
    (canvas.width * printableHeight) / printableWidth
  )

  let renderedY = 0
  let pageIndex = 0

  while (renderedY < canvas.height) {
    const idealEnd = renderedY + idealPageCanvasHeight
    const breakY = findPageBreakY(canvas, renderedY, idealEnd)
    const sliceHeight = Math.max(1, breakY - renderedY)

    const pageCanvas = document.createElement("canvas")
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight

    const ctx = pageCanvas.getContext("2d")
    if (!ctx) throw new Error("Could not create PDF page canvas")

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      renderedY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    )

    const imgData = pageCanvas.toDataURL("image/jpeg", 0.95)
    const sliceMmHeight = (sliceHeight * printableWidth) / canvas.width

    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(imgData, "JPEG", marginX, marginTop, printableWidth, sliceMmHeight)

    renderedY = breakY
    pageIndex += 1

    // Safety against infinite loops on a stubborn ink row
    if (pageIndex > 40) break
  }

  const namePart = slugify(input.businessName || "business") || "business"
  const idPart = slugify(input.businessId || "") || "agreement"
  pdf.save(`Shettar-Partner-Agreement-${namePart}-${idPart}.pdf`)
}
