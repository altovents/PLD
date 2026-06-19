// ─── Types ────────────────────────────────────────────────────────────────────

export interface Transaction {
  date: Date;
  description: string;
  vendor: string;
  amount: number;
  currency: string;
  raw: string;
}

export type LeakType =
  | "duplicate"
  | "unused_subscription"
  | "price_increase"
  | "bank_fees"
  | "overlapping_services"
  | "annual_optimization"
  | "progressive_drift"
  | "currency_fees"
  | "ghost_reactivation"
  | "late_fees";

export type Priority = "high" | "medium" | "low";

export interface DetectedLeak {
  id: string;
  type: LeakType;
  title: string;
  description: string;
  amount: number;
  priority: Priority;
  vendor: string;
  transactions: Transaction[];
  actionItems?: string[];
  timeToFix?: string;
}

export type BankFormat = "postfinance" | "ubs" | "raiffeisen" | "generic";

// ─── Format detection ─────────────────────────────────────────────────────────

export function detectFormat(header: string): BankFormat {
  const h = header.toLowerCase();
  if (h.includes("buchungsdatum") || h.includes("date de comptabilisation")) return "postfinance";
  if (h.includes("booking date") && h.includes("description 1")) return "ubs";
  if (h.includes("datum") && h.includes("buchungstext")) return "raiffeisen";
  return "generic";
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  const dmy = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const dmy2 = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy2) return new Date(+dmy2[3], +dmy2[2] - 1, +dmy2[1]);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/\s/g, "").replace(/'/g, "").replace(",", ".")) || 0;
}

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (!inQuotes && line.slice(i, i + sep.length) === sep) {
      result.push(current.trim());
      current = "";
      i += sep.length - 1;
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectSeparator(line: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0, "|": 0 };
  for (const sep of Object.keys(counts)) counts[sep] = (line.match(new RegExp("\\" + sep, "g")) || []).length;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Vendor normalization ─────────────────────────────────────────────────────

const VENDOR_PATTERNS: Array<[RegExp, string]> = [
  // Adobe
  [/adobe/i, "Adobe"],
  // Microsoft
  [/microsoft|office\s?365|ms\s?365|o365/i, "Microsoft 365"],
  // Google
  [/google\s*(workspace|apps)/i, "Google Workspace"],
  [/google\s*(drive|one)/i, "Google Drive"],
  [/google\s*meet/i, "Google Meet"],
  [/google/i, "Google"],
  // Communication & Video
  [/slack/i, "Slack"],
  [/zoom/i, "Zoom"],
  [/webex|cisco\s*webex/i, "Webex"],
  [/gotomeeting|goto/i, "GoToMeeting"],
  // Cloud storage
  [/dropbox/i, "Dropbox"],
  [/box\.com|box\.net|\bbox\b/i, "Box"],
  [/onedrive/i, "OneDrive"],
  // CRM & Sales
  [/salesforce/i, "Salesforce"],
  [/hubspot/i, "HubSpot"],
  [/pipedrive/i, "Pipedrive"],
  [/zoho/i, "Zoho"],
  // Project management
  [/notion/i, "Notion"],
  [/monday\.com/i, "Monday.com"],
  [/asana/i, "Asana"],
  [/trello/i, "Trello"],
  [/jira|atlassian/i, "Atlassian"],
  [/basecamp/i, "Basecamp"],
  [/clickup/i, "ClickUp"],
  // Design
  [/figma/i, "Figma"],
  [/sketch/i, "Sketch"],
  [/invision/i, "InVision"],
  [/canva/i, "Canva"],
  // Dev & Hosting
  [/github/i, "GitHub"],
  [/gitlab/i, "GitLab"],
  [/bitbucket/i, "Bitbucket"],
  [/aws|amazon\s*web/i, "AWS"],
  [/digitalocean/i, "DigitalOcean"],
  [/heroku/i, "Heroku"],
  [/vercel/i, "Vercel"],
  [/netlify/i, "Netlify"],
  [/cloudflare/i, "Cloudflare"],
  // Monitoring
  [/datadog/i, "Datadog"],
  [/sentry/i, "Sentry"],
  [/new\s*relic/i, "New Relic"],
  [/pagerduty/i, "PagerDuty"],
  [/grafana/i, "Grafana"],
  // Marketing & Email
  [/mailchimp/i, "Mailchimp"],
  [/sendgrid/i, "SendGrid"],
  [/mailgun/i, "Mailgun"],
  [/brevo|sendinblue/i, "Brevo"],
  [/activecampaign/i, "ActiveCampaign"],
  [/klaviyo/i, "Klaviyo"],
  // Customer support
  [/zendesk/i, "Zendesk"],
  [/intercom/i, "Intercom"],
  [/freshdesk/i, "Freshdesk"],
  // HR & Payroll
  [/bamboohr/i, "BambooHR"],
  [/personio/i, "Personio"],
  [/workday/i, "Workday"],
  // Accounting
  [/quickbooks/i, "QuickBooks"],
  [/xero/i, "Xero"],
  [/bexio/i, "Bexio"],
  [/sage/i, "Sage"],
  [/banana/i, "Banana Comptabilité"],
  // Payments & Finance
  [/stripe/i, "Stripe"],
  [/paypal/i, "PayPal"],
  [/wise|transferwise/i, "Wise"],
  [/revolut/i, "Revolut"],
  // E-commerce
  [/shopify/i, "Shopify"],
  [/woocommerce/i, "WooCommerce"],
  [/wix/i, "Wix"],
  [/squarespace/i, "Squarespace"],
  [/wordpress|wp\.com/i, "WordPress"],
  [/webflow/i, "Webflow"],
  // AI & Data
  [/openai|chatgpt/i, "OpenAI"],
  [/anthropic|claude/i, "Anthropic"],
  [/midjourney/i, "Midjourney"],
  // Entertainment
  [/netflix/i, "Netflix"],
  [/spotify/i, "Spotify"],
  [/linkedin/i, "LinkedIn"],
  // Swiss telcos
  [/swisscom/i, "Swisscom"],
  [/sunrise/i, "Sunrise"],
  [/salt\s*(mobile)?/i, "Salt Mobile"],
  [/upc/i, "UPC"],
  [/quickline/i, "Quickline"],
  // Swiss banks & services
  [/postfinance/i, "PostFinance"],
  [/sbb|cff|ffs/i, "SBB"],
  [/twint/i, "TWINT"],
  [/swiss\s*post|la\s*poste/i, "La Poste"],
  [/mobilezone/i, "Mobilezone"],
  [/digitec/i, "Digitec"],
  [/galaxus/i, "Galaxus"],
  [/coop/i, "Coop"],
  [/migros/i, "Migros"],
  // Office & supplies
  [/staples|office\s*depot/i, "Fournitures bureau"],
  [/ikea/i, "IKEA"],
];

// Cross-vendor alias normalization (same company, different display names)
const VENDOR_ALIASES: Record<string, string> = {
  "Adobe Systems": "Adobe",
  "Adobe Inc": "Adobe",
  "Adobe Creative": "Adobe",
  "AMZN": "AWS",
  "Amazon Web Services": "AWS",
  "Amazon AWS": "AWS",
  "Microsoft Corp": "Microsoft 365",
  "MSFT": "Microsoft 365",
  "Alphabet": "Google",
  "GOOG": "Google Workspace",
};

export function normalizeVendor(description: string): string {
  // Check aliases first
  for (const [alias, canonical] of Object.entries(VENDOR_ALIASES)) {
    if (description.toLowerCase().includes(alias.toLowerCase())) return canonical;
  }
  // Then pattern matching
  for (const [pattern, name] of VENDOR_PATTERNS) {
    if (pattern.test(description)) return name;
  }
  // Generic: take first 3 meaningful words
  const words = description
    .replace(/\d{4,}/g, "")
    .replace(/[\/\-_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);
  return words.join(" ") || description.slice(0, 30);
}

// ─── Service category map (for overlap detection) ─────────────────────────────

const SERVICE_CATEGORIES: Record<string, string[]> = {
  "Vidéoconférence":      ["Zoom", "Microsoft 365", "Webex", "Google Meet", "GoToMeeting"],
  "Stockage cloud":       ["Dropbox", "Box", "OneDrive", "Google Drive"],
  "CRM":                  ["Salesforce", "HubSpot", "Pipedrive", "Zoho"],
  "Design":               ["Adobe", "Figma", "Sketch", "InVision", "Canva"],
  "Gestion de projet":    ["Asana", "Monday.com", "Trello", "Atlassian", "ClickUp", "Basecamp", "Notion"],
  "Communication":        ["Slack", "Microsoft 365", "Google Workspace"],
  "Cloud & Hosting":      ["AWS", "DigitalOcean", "Heroku", "Vercel", "Netlify", "Cloudflare"],
  "Comptabilité":         ["QuickBooks", "Xero", "Bexio", "Sage", "Banana Comptabilité"],
  "Support client":       ["Zendesk", "Intercom", "Freshdesk"],
  "Email marketing":      ["Mailchimp", "Brevo", "SendGrid", "ActiveCampaign", "Klaviyo"],
};

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseCSV(content: string): { transactions: Transaction[]; format: BankFormat; errors: string[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { transactions: [], format: "generic", errors: ["Fichier trop court ou vide."] };

  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes("date") || l.includes("datum") || l.includes("montant") || l.includes("amount") || l.includes("betrag")) {
      headerIdx = i;
      break;
    }
  }

  const sep = detectSeparator(lines[headerIdx]);
  const format = detectFormat(lines[headerIdx]);
  const headers = splitCSVLine(lines[headerIdx], sep).map((h) => h.toLowerCase().replace(/['"]/g, ""));

  const transactions: Transaction[] = [];
  const errors: string[] = [];

  const idxOf = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = headers.findIndex((h) => h.includes(c));
      if (i !== -1) return i;
    }
    return -1;
  };

  const dateIdx     = idxOf("date", "datum", "buchungsdatum", "booking date", "valor");
  const descIdx     = idxOf("libell", "description", "buchungstext", "text", "purpose", "detail", "motif");
  const amountIdx   = idxOf("montant", "amount", "betrag", "credit", "débit", "debit", "solde partiel");
  const creditIdx   = idxOf("credit", "gutschrift", "avoir");
  const debitIdx    = idxOf("debit", "débit", "lastschrift");
  const currencyIdx = idxOf("currency", "monnaie", "währung", "devise");

  if (dateIdx === -1 || (amountIdx === -1 && creditIdx === -1)) {
    errors.push("Format non reconnu — tentative de lecture automatique.");
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCSVLine(line, sep);
    if (cols.length < 2) continue;

    const rawDate = dateIdx >= 0 ? (cols[dateIdx] || "") : (cols[0] || "");
    const date = parseDate(rawDate);
    if (!date) continue;

    const desc     = descIdx >= 0 ? (cols[descIdx] || "") : (cols[1] || "");
    const currency = currencyIdx >= 0 ? (cols[currencyIdx] || "CHF") : "CHF";

    let amount = 0;
    if (amountIdx >= 0) {
      amount = parseAmount(cols[amountIdx] || "0");
    } else if (creditIdx >= 0 && debitIdx >= 0) {
      const credit = parseAmount(cols[creditIdx] || "0");
      const debit  = parseAmount(cols[debitIdx]  || "0");
      amount = credit > 0 ? credit : -Math.abs(debit);
    }

    if (amount === 0 && desc === "") continue;

    transactions.push({ date, description: desc, vendor: normalizeVendor(desc), amount, currency, raw: line });
  }

  return { transactions, format, errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

let leakCounter = 0;
function nextId(): string {
  return `leak_${++leakCounter}`;
}

// ─── Detector 1: Duplicates ───────────────────────────────────────────────────

function detectDuplicates(byVendor: Map<string, Transaction[]>): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  for (const [vendor, txs] of byVendor.entries()) {
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const used = new Set<number>();
    for (let i = 0; i < sorted.length - 1; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        const diffDays = (sorted[j].date.getTime() - sorted[i].date.getTime()) / 86400000;
        if (diffDays > 7) break;
        if (Math.abs(sorted[i].amount - sorted[j].amount) < 0.01) {
          used.add(i); used.add(j);
          const amt = Math.abs(sorted[i].amount);
          leaks.push({
            id: nextId(), type: "duplicate",
            title: `Double facturation — ${vendor}`,
            description: `${vendor} vous a facturé ${amt.toFixed(2)} CHF deux fois en ${Math.round(diffDays)} jour(s). L'un de ces paiements est probablement une erreur.`,
            amount: amt, priority: "high", vendor,
            transactions: [sorted[i], sorted[j]],
            actionItems: [
              `Contactez ${vendor} et demandez le remboursement du doublon en citant les dates ${sorted[i].date.toLocaleDateString("fr-CH")} et ${sorted[j].date.toLocaleDateString("fr-CH")}`,
              "Conservez les deux relevés comme preuve",
              "Mettez en place une vérification mensuelle des doublons",
            ],
            timeToFix: "30 minutes",
          });
        }
      }
    }
  }
  return leaks;
}

// ─── Detector 2: Unused subscriptions ────────────────────────────────────────

function detectUnusedSubscriptions(byVendor: Map<string, Transaction[]>): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  for (const [vendor, txs] of byVendor.entries()) {
    const debits = txs.filter((t) => t.amount < 0);
    const byMonth = new Map<string, Transaction[]>();
    for (const t of debits) {
      const k = monthKey(t.date);
      byMonth.set(k, [...(byMonth.get(k) ?? []), t]);
    }
    const monthCount = byMonth.size;
    if (monthCount < 3) continue;

    const amounts  = debits.map((t) => Math.abs(t.amount));
    const avgAmt   = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const minAmt   = Math.min(...amounts);
    const maxAmt   = Math.max(...amounts);
    const isConsistent = avgAmt > 0 && (maxAmt - minAmt) / avgAmt < 0.05;

    if (isConsistent && avgAmt >= 30) {
      leaks.push({
        id: nextId(), type: "unused_subscription",
        title: `Abonnement récurrent — ${vendor}`,
        description: `${vendor} facture ${avgAmt.toFixed(2)} CHF/mois depuis ${monthCount} mois (total : ${(avgAmt * monthCount).toFixed(0)} CHF). Vérifiez si cet abonnement est encore activement utilisé.`,
        amount: avgAmt,
        priority: avgAmt >= 100 ? "high" : "medium",
        vendor, transactions: debits,
        actionItems: [
          `Vérifiez les accès actifs sur le portail ${vendor}`,
          "Si non utilisé, résiliez via Paramètres → Abonnement → Annuler",
          "Demandez un remboursement au prorata si résiliation en cours de période",
        ],
        timeToFix: "15 minutes",
      });
    }
  }
  return leaks;
}

// ─── Detector 3: Price increases ──────────────────────────────────────────────

function detectPriceIncreases(
  byVendor: Map<string, Transaction[]>,
  skipVendors: Set<string>
): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  for (const [vendor, txs] of byVendor.entries()) {
    if (skipVendors.has(vendor)) continue;
    const debits = txs.filter((t) => t.amount < 0);
    if (debits.length < 4) continue;

    const amounts  = debits.map((t) => Math.abs(t.amount));
    const minAmt   = Math.min(...amounts);
    const maxAmt   = Math.max(...amounts);
    const avgAmt   = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const isConsistent = avgAmt > 0 && (maxAmt - minAmt) / avgAmt < 0.05;
    if (isConsistent) continue;

    const half     = Math.ceil(amounts.length / 2);
    const firstAvg = amounts.slice(0, half).reduce((s, a) => s + a, 0) / half;
    const lastAvg  = amounts.slice(-half).reduce((s, a) => s + a, 0) / half;
    const pct      = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    if (pct > 10) {
      const increase = lastAvg - firstAvg;
      leaks.push({
        id: nextId(), type: "price_increase",
        title: `Hausse de prix — ${vendor}`,
        description: `${vendor} a augmenté ses frais de +${pct.toFixed(0)}% (${firstAvg.toFixed(2)} → ${lastAvg.toFixed(2)} CHF/mois). Cette hausse n'a peut-être pas été communiquée clairement.`,
        amount: increase, priority: pct > 25 ? "high" : "medium",
        vendor, transactions: debits,
        actionItems: [
          `Vérifiez la notification de hausse dans vos emails de ${vendor}`,
          "Contactez votre gestionnaire de compte pour négocier un tarif préférentiel",
          `Comparez avec les offres concurrentes — ${pct.toFixed(0)}% d'augmentation justifie une remise en concurrence`,
        ],
        timeToFix: "1 heure",
      });
    }
  }
  return leaks;
}

// ─── Detector 4: Bank fees ────────────────────────────────────────────────────

function detectBankFees(byVendor: Map<string, Transaction[]>): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  for (const [vendor, txs] of byVendor.entries()) {
    const debits = txs.filter((t) => t.amount < 0);
    const isFee  = /frais|gebühr|fee|commission|prélèvement/i.test(vendor)
      || /frais|gebühr|fee/i.test(debits[0]?.description ?? "");
    if (!isFee) continue;
    const byMonth    = new Set(debits.map((t) => monthKey(t.date))).size;
    const total      = debits.reduce((s, t) => s + Math.abs(t.amount), 0);
    const monthly    = total / Math.max(1, byMonth);
    if (monthly < 20) continue;
    leaks.push({
      id: nextId(), type: "bank_fees",
      title: `Frais bancaires élevés — ${vendor}`,
      description: `Moyenne de ${monthly.toFixed(2)} CHF/mois en frais bancaires. Des offres alternatives existent pour les PME suisses.`,
      amount: monthly * 0.5, priority: "low",
      vendor, transactions: debits,
      actionItems: [
        "Comparez avec les comptes PME de Neon Business, Raiffeisen ou UBS KeyClub",
        "Demandez une suppression des frais de tenue de compte à votre banque actuelle",
        "Activez les virements SEPA gratuits si vous payez en EUR",
      ],
      timeToFix: "2 heures",
    });
  }
  return leaks;
}

// ─── Detector 5: Overlapping services ────────────────────────────────────────

function detectOverlappingServices(byVendor: Map<string, Transaction[]>): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  const activeVendors = new Set(Array.from(byVendor.keys()));

  for (const [category, vendors] of Object.entries(SERVICE_CATEGORIES)) {
    const active = vendors.filter((v) => activeVendors.has(v));
    if (active.length < 2) continue;

    const allTxs = active.flatMap((v) => (byVendor.get(v) ?? []).filter((t) => t.amount < 0));
    const monthlyPerVendor = active.map((v) => {
      const debits = (byVendor.get(v) ?? []).filter((t) => t.amount < 0);
      const months = new Set(debits.map((t) => monthKey(t.date))).size;
      const total  = debits.reduce((s, t) => s + Math.abs(t.amount), 0);
      return { vendor: v, monthly: months > 0 ? total / months : 0 };
    });
    const totalMonthly = monthlyPerVendor.reduce((s, x) => s + x.monthly, 0);
    const cheapest     = monthlyPerVendor.sort((a, b) => a.monthly - b.monthly)[0];
    const savings      = totalMonthly - cheapest.monthly;

    if (savings < 15) continue;

    leaks.push({
      id: nextId(), type: "overlapping_services",
      title: `Services en doublon — ${category}`,
      description: `Vous payez ${active.join(" + ")} pour le même usage (${category}). En consolidant sur ${cheapest.vendor}, vous économiseriez ~${savings.toFixed(0)} CHF/mois.`,
      amount: savings,
      priority: savings > 100 ? "high" : "medium",
      vendor: active[0], transactions: allTxs,
      actionItems: [
        `Évaluez lequel entre ${active.join(", ")} couvre le mieux vos besoins`,
        `Résiliez les abonnements superflus en gardant uniquement ${cheapest.vendor}`,
        "Exportez vos données avant résiliation",
      ],
      timeToFix: "2 heures",
    });
  }
  return leaks;
}

// ─── Detector 6: Annual optimization ─────────────────────────────────────────

function detectAnnualOptimization(
  byVendor: Map<string, Transaction[]>,
  alreadyFlagged: Set<string>
): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  const ANNUAL_DISCOUNT = 0.18; // 18% typical SaaS annual discount

  for (const [vendor, txs] of byVendor.entries()) {
    if (alreadyFlagged.has(vendor)) continue;
    const debits   = txs.filter((t) => t.amount < 0);
    const months   = new Set(debits.map((t) => monthKey(t.date))).size;
    if (months < 10) continue;

    const amounts  = debits.map((t) => Math.abs(t.amount));
    const avgAmt   = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const minAmt   = Math.min(...amounts);
    const maxAmt   = Math.max(...amounts);
    const isConsistent = avgAmt > 0 && (maxAmt - minAmt) / avgAmt < 0.08;
    if (!isConsistent || avgAmt < 25) continue;

    const annualSavings = avgAmt * 12 * ANNUAL_DISCOUNT;
    leaks.push({
      id: nextId(), type: "annual_optimization",
      title: `Optimisation annuelle — ${vendor}`,
      description: `${vendor} facture ${avgAmt.toFixed(0)} CHF/mois depuis ${months} mois. En passant à la facturation annuelle, vous économiseriez ~${annualSavings.toFixed(0)} CHF/an (remise typique 15–20%).`,
      amount: annualSavings / 12, priority: annualSavings > 500 ? "medium" : "low",
      vendor, transactions: debits,
      actionItems: [
        `Connectez-vous à ${vendor} → Paramètres → Abonnement → Passer en annuel`,
        "Vérifiez que le montant annuel est bien inférieur à votre tarif mensuel × 12",
        "Notez la date de renouvellement pour éviter un auto-renouvellement non désiré",
      ],
      timeToFix: "10 minutes",
    });
  }
  return leaks;
}

// ─── Detector 7: Progressive drift ───────────────────────────────────────────

function detectProgressiveDrift(
  byVendor: Map<string, Transaction[]>,
  alreadyFlagged: Set<string>
): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];

  for (const [vendor, txs] of byVendor.entries()) {
    if (alreadyFlagged.has(vendor)) continue;
    const debits = txs
      .filter((t) => t.amount < 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (debits.length < 6) continue;

    const third     = Math.ceil(debits.length / 3);
    const firstAvg  = debits.slice(0, third).reduce((s, t) => s + Math.abs(t.amount), 0) / third;
    const lastAvg   = debits.slice(-third).reduce((s, t) => s + Math.abs(t.amount), 0) / third;
    const drift     = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    if (drift < 15 || lastAvg - firstAvg < 8) continue;

    leaks.push({
      id: nextId(), type: "progressive_drift",
      title: `Dérive progressive — ${vendor}`,
      description: `${vendor} a augmenté progressivement de +${drift.toFixed(0)}% sur la période (${firstAvg.toFixed(0)} → ${lastAvg.toFixed(0)} CHF/mois). Cette dérive lente passe souvent inaperçue dans les relevés.`,
      amount: lastAvg - firstAvg,
      priority: drift > 30 ? "high" : "medium",
      vendor, transactions: debits,
      actionItems: [
        "Demandez un historique de facturation détaillé à votre fournisseur",
        "Négociez un gel tarifaire sur 12 mois en échange d'un engagement annuel",
        "Mettez en place une alerte si la prochaine facture dépasse le montant actuel",
      ],
      timeToFix: "1 heure",
    });
  }
  return leaks;
}

// ─── Detector 8: Currency conversion fees ────────────────────────────────────

function detectCurrencyFees(transactions: Transaction[]): DetectedLeak[] {
  const FX_RE = /\b(fx|forex|change|conversion|foreign|devise|currency|usd|eur|gbp|commission\s*de\s*change)\b/i;
  const fxTxs = transactions.filter(
    (t) => t.amount < 0 && (t.currency !== "CHF" || FX_RE.test(t.description))
  );
  if (fxTxs.length < 2) return [];

  const months  = new Set(fxTxs.map((t) => monthKey(t.date))).size;
  const total   = fxTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  // Banks charge ~1.5–3% FX fee — estimate conservative 1.5%
  const estFees  = total * 0.015;
  const monthly  = estFees / Math.max(1, months);
  if (monthly < 15) return [];

  return [{
    id: nextId(), type: "currency_fees",
    title: "Frais de conversion devises",
    description: `${fxTxs.length} transactions en devises étrangères détectées. Les banques suisses facturent typiquement 1.5–3% de commission de change, soit ~${monthly.toFixed(0)} CHF/mois d'après vos flux.`,
    amount: monthly, priority: monthly > 80 ? "medium" : "low",
    vendor: "Frais FX", transactions: fxTxs,
    actionItems: [
      "Ouvrez un compte multi-devises (Wise Business ou Revolut Business) pour les paiements récurrents en EUR/USD",
      "Regroupez vos achats en devise étrangère sur une carte sans frais FX",
      "Demandez à vos fournisseurs de facturer en CHF si possible",
    ],
    timeToFix: "2 heures",
  }];
}

// ─── Detector 9: Ghost reactivation ──────────────────────────────────────────

function detectGhostReactivations(byVendor: Map<string, Transaction[]>): DetectedLeak[] {
  const leaks: DetectedLeak[] = [];
  for (const [vendor, txs] of byVendor.entries()) {
    const debits = txs
      .filter((t) => t.amount < 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (debits.length < 3) continue;

    for (let i = 1; i < debits.length; i++) {
      const gapDays = (debits[i].date.getTime() - debits[i - 1].date.getTime()) / 86400000;
      if (gapDays >= 60) {
        const resumed = debits.slice(i);
        const amt     = Math.abs(resumed[0].amount);
        leaks.push({
          id: nextId(), type: "ghost_reactivation",
          title: `Abonnement réactivé — ${vendor}`,
          description: `${vendor} était inactif ${Math.round(gapDays)} jours puis a repris les prélèvements (${amt.toFixed(0)} CHF). Vérifiez si cette réactivation était intentionnelle ou non.`,
          amount: amt, priority: "high",
          vendor, transactions: resumed,
          actionItems: [
            `Vérifiez votre compte ${vendor} — qui a réactivé l'abonnement et quand`,
            "Si non intentionnel, résiliez immédiatement et demandez le remboursement",
            "Activez les notifications de prélèvement dans votre e-banking",
          ],
          timeToFix: "20 minutes",
        });
        break;
      }
    }
  }
  return leaks;
}

// ─── Detector 10: Late fees ───────────────────────────────────────────────────

function detectLateFees(transactions: Transaction[]): DetectedLeak[] {
  const LATE_RE = /\b(retard|pénalité|rappel|intérêt|mahngebühr|verzugszins|late\s*fee|penalty|reminder|dunning)\b/i;
  const lateTxs = transactions.filter((t) => t.amount < 0 && LATE_RE.test(t.description));
  if (lateTxs.length === 0) return [];

  const months  = new Set(lateTxs.map((t) => monthKey(t.date))).size;
  const total   = lateTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthly = total / Math.max(1, months);

  return [{
    id: nextId(), type: "late_fees",
    title: "Frais de retard / pénalités",
    description: `${lateTxs.length} prélèvements pour frais de retard ou pénalités détectés (total : ${total.toFixed(0)} CHF). Ces frais sont 100% évitables.`,
    amount: monthly, priority: lateTxs.length >= 3 ? "high" : "medium",
    vendor: "Pénalités", transactions: lateTxs,
    actionItems: [
      "Activez les paiements automatiques pour toutes vos factures récurrentes",
      "Configurez des rappels de paiement 5 jours avant échéance",
      "Demandez à vos créanciers une grâce de paiement et l'annulation des pénalités",
    ],
    timeToFix: "30 minutes",
  }];
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function detectLeaks(transactions: Transaction[]): DetectedLeak[] {
  const debits = transactions.filter((t) => t.amount < 0);

  // Group by normalized vendor
  const byVendor = new Map<string, Transaction[]>();
  for (const t of debits) {
    byVendor.set(t.vendor, [...(byVendor.get(t.vendor) ?? []), t]);
  }

  // Run all detectors
  const duplicates       = detectDuplicates(byVendor);
  const subscriptions    = detectUnusedSubscriptions(byVendor);
  const overlapping      = detectOverlappingServices(byVendor);
  const ghostReactivated = detectGhostReactivations(byVendor);
  const lateFees         = detectLateFees(transactions);
  const currencyFees     = detectCurrencyFees(transactions);
  const bankFees         = detectBankFees(byVendor);

  // Vendors already flagged as subscription/duplicate — skip for price/drift detectors
  const flaggedVendors = new Set([
    ...subscriptions.map((l) => l.vendor),
    ...duplicates.map((l) => l.vendor),
  ]);

  const priceIncreases   = detectPriceIncreases(byVendor, flaggedVendors);
  const flaggedForDrift  = new Set([...flaggedVendors, ...priceIncreases.map((l) => l.vendor)]);
  const progressiveDrift = detectProgressiveDrift(byVendor, flaggedForDrift);

  const flaggedForAnnual = new Set([...flaggedVendors, ...priceIncreases.map((l) => l.vendor), ...progressiveDrift.map((l) => l.vendor)]);
  const annualOpt        = detectAnnualOptimization(byVendor, flaggedForAnnual);

  const all = [
    ...duplicates,
    ...ghostReactivated,
    ...overlapping,
    ...subscriptions,
    ...priceIncreases,
    ...progressiveDrift,
    ...lateFees,
    ...annualOpt,
    ...currencyFees,
    ...bankFees,
  ];

  return all.sort((a, b) => b.amount - a.amount);
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export interface AnalysisSummary {
  totalTransactions: number;
  totalDebits: number;
  monthsAnalyzed: number;
  leaksFound: number;
  potentialSavings: number;
  dateRange: { from: Date; to: Date } | null;
}

export function computeSummary(transactions: Transaction[], leaks: DetectedLeak[]): AnalysisSummary {
  const debits = transactions.filter((t) => t.amount < 0);
  const dates  = transactions.map((t) => t.date);
  const from   = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const to     = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  const months = from && to ? Math.max(1, Math.round((to.getTime() - from.getTime()) / (30 * 86400000))) : 1;

  return {
    totalTransactions: transactions.length,
    totalDebits: debits.reduce((s, t) => s + Math.abs(t.amount), 0),
    monthsAnalyzed: months,
    leaksFound: leaks.length,
    potentialSavings: leaks.reduce((s, l) => s + l.amount, 0),
    dateRange: from && to ? { from, to } : null,
  };
}
