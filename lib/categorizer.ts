// ─── Swiss accounting categorizer ────────────────────────────────────────────
// Categorizes bank transactions with estimated Swiss VAT rates.
// VAT rates as of 2024: standard 8.1%, reduced 2.6%, hotel 3.8%, exempt 0%
//
// Key Swiss VAT rules:
// - Restaurant meals (sit-down): 8.1% standard
// - Takeaway food / groceries: 2.6% reduced
// - Public transport (SBB, TPG, etc.): 2.6% reduced
// - Taxi, parking, car-sharing: 8.1% standard
// - Fuel: 8.1% standard
// - Hotel accommodation: 3.8% special hotel rate
// - Insurance, rent (unwaived), social charges: 0% exempt

export interface CategoryInfo {
  label: string
  vat: number | null  // null = unknown/to verify
  icon: string
  group: string
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  saas_etranger:      { label: "Logiciels & SaaS (étranger)", vat: 0,     icon: "💻", group: "Frais généraux" },
  saas_suisse:        { label: "Logiciels & SaaS (Suisse)",   vat: 0.081, icon: "💻", group: "Frais généraux" },
  telecom:            { label: "Téléphonie & Internet",        vat: 0.081, icon: "📡", group: "Frais généraux" },
  transport:          { label: "Transport public",             vat: 0.026, icon: "🚆", group: "Déplacements" },
  deplacement_route:  { label: "Taxi / Parking / Carsharing", vat: 0.081, icon: "🚗", group: "Déplacements" },
  carburant:          { label: "Carburant & Péages",           vat: 0.081, icon: "⛽", group: "Déplacements" },
  hotel:              { label: "Hébergement & Hôtel",          vat: 0.038, icon: "🏨", group: "Déplacements" },
  restaurant:         { label: "Repas d'affaires",             vat: 0.081, icon: "🍽️", group: "Frais généraux" },
  fournitures:        { label: "Fournitures & Matériel",       vat: 0.081, icon: "📦", group: "Frais généraux" },
  charges_sociales:   { label: "Charges sociales (AVS/AI)",    vat: 0,     icon: "👥", group: "Charges RH" },
  salaires:           { label: "Salaires",                     vat: 0,     icon: "💼", group: "Charges RH" },
  honoraires:         { label: "Honoraires & Conseils",        vat: 0.081, icon: "📋", group: "Services" },
  loyer:              { label: "Loyer & Locaux",               vat: 0,     icon: "🏢", group: "Immobilier" },
  assurance:          { label: "Assurances",                   vat: 0,     icon: "🛡️", group: "Assurances" },
  energie:            { label: "Énergie & Utilities",          vat: 0.081, icon: "⚡", group: "Frais généraux" },
  marketing:          { label: "Marketing & Publicité",        vat: 0.081, icon: "📢", group: "Frais généraux" },
  banque:             { label: "Frais bancaires",              vat: 0.081, icon: "🏦", group: "Frais financiers" },
  impots:             { label: "Impôts & Taxes",               vat: 0,     icon: "📊", group: "Fiscal" },
  matieres_premieres: { label: "Matières premières",           vat: 0.026, icon: "🏭", group: "Production" },
  remboursement:      { label: "Remboursement / Crédit",       vat: 0,     icon: "↩️", group: "Revenus" },
  virement_interne:   { label: "Virement interne",             vat: 0,     icon: "🔄", group: "Interne" },
  inconnu:            { label: "Non catégorisé",               vat: null,  icon: "❓", group: "À traiter" },
}

export type CategoryKey = keyof typeof CATEGORIES

export interface CategorizationResult {
  category: CategoryKey
  confidence: "high" | "medium" | "low"
  vatRate: number | null
  vatAmount: number | null
  amountHT: number | null
}

// ─── Recognition rules ────────────────────────────────────────────────────────

interface Rule {
  pattern: RegExp
  category: CategoryKey
  confidence: "high" | "medium"
}

const RULES: Rule[] = [
  // ── SaaS étrangers (0% TVA — B2B hors périmètre TVA suisse) ─────────────
  { pattern: /microsoft|office\s?365|azure|m365/i,             category: "saas_etranger", confidence: "high" },
  { pattern: /adobe|acrobat|creative\s?cloud/i,                 category: "saas_etranger", confidence: "high" },
  { pattern: /slack\s?tech/i,                                   category: "saas_etranger", confidence: "high" },
  { pattern: /zoom\s?video|zoom\.us/i,                          category: "saas_etranger", confidence: "high" },
  { pattern: /dropbox/i,                                        category: "saas_etranger", confidence: "high" },
  { pattern: /salesforce/i,                                     category: "saas_etranger", confidence: "high" },
  { pattern: /hubspot/i,                                        category: "saas_etranger", confidence: "high" },
  { pattern: /google\s+(workspace|llc|ireland|cloud)/i,         category: "saas_etranger", confidence: "high" },
  { pattern: /amazon\s+web\s+services|aws/i,                    category: "saas_etranger", confidence: "high" },
  { pattern: /github|atlassian|jira/i,                          category: "saas_etranger", confidence: "high" },
  { pattern: /notion\s+labs|figma|canva/i,                      category: "saas_etranger", confidence: "high" },
  { pattern: /mailchimp|sendgrid|twilio|resend/i,               category: "saas_etranger", confidence: "high" },
  { pattern: /shopify|stripe\s+payments/i,                      category: "saas_etranger", confidence: "high" },
  { pattern: /meta\s+(platforms|ads)|facebook\s+ads/i,          category: "saas_etranger", confidence: "high" },
  { pattern: /linkedin\s+(ireland|premium)/i,                   category: "saas_etranger", confidence: "high" },
  { pattern: /apple\s+(services|one)/i,                         category: "saas_etranger", confidence: "medium" },
  { pattern: /netflix|spotify/i,                                category: "saas_etranger", confidence: "medium" },
  { pattern: /vercel|netlify|heroku|digitalocean/i,             category: "saas_etranger", confidence: "high" },
  { pattern: /openai|anthropic|mistral/i,                       category: "saas_etranger", confidence: "high" },

  // ── Télécom suisse (8.1%) ─────────────────────────────────────────────────
  { pattern: /swisscom/i,                                       category: "telecom", confidence: "high" },
  { pattern: /sunrise/i,                                        category: "telecom", confidence: "high" },
  { pattern: /salt\s+mobile/i,                                  category: "telecom", confidence: "high" },
  { pattern: /init7|vtx\s+network|infomaniak/i,                 category: "telecom", confidence: "high" },
  { pattern: /quickline|upc\s+suisse/i,                         category: "telecom", confidence: "high" },

  // ── Transport public (2.6%) ───────────────────────────────────────────────
  { pattern: /\bsbb\b|\bcff\b|\bffs\b/i,                        category: "transport", confidence: "high" },
  { pattern: /tpg|transports\s+publics\s+genevois/i,            category: "transport", confidence: "high" },
  { pattern: /postauto|postbus/i,                               category: "transport", confidence: "high" },
  { pattern: /bls\s+ag|rnv\s+ag|mob\s+ag/i,                    category: "transport", confidence: "high" },
  { pattern: /tl\s+(lausanne)|transports\s+(lausannois|vaudois)/i, category: "transport", confidence: "high" },
  { pattern: /bvb\s+basel|bernmobil|vbz\s+zürich/i,            category: "transport", confidence: "high" },
  { pattern: /swiss\s+(travel\s+pass|half\s+fare|ga\b)/i,       category: "transport", confidence: "high" },

  // ── Taxi / Parking / Carsharing (8.1%) ───────────────────────────────────
  { pattern: /\buber\b|\bbolt\b|\bfreenow\b|\btaxi\b/i,         category: "deplacement_route", confidence: "high" },
  { pattern: /parking|parkhaus|park\s?&\s?ride|parkomètre/i,    category: "deplacement_route", confidence: "high" },
  { pattern: /\bmobility\b/i,                                   category: "deplacement_route", confidence: "medium" },
  { pattern: /sixt|europcar|hertz|avis\b/i,                     category: "deplacement_route", confidence: "high" },

  // ── Carburant & Péages (8.1%) ─────────────────────────────────────────────
  { pattern: /migrol|avia\b|tamoil/i,                           category: "carburant", confidence: "high" },
  { pattern: /\bbp\b|shell\b|esso\b|q8\b|agrola/i,              category: "carburant", confidence: "high" },
  { pattern: /\bviatoll\b|lsva|redevance\s+poids\s+lourds/i,   category: "carburant", confidence: "high" },

  // ── Hébergement / Hôtel (3.8%) ───────────────────────────────────────────
  { pattern: /\bhôtel\b|\bhotel\b|\bauberge\b/i,                category: "hotel", confidence: "medium" },
  { pattern: /mövenpick|marriott|hilton|ibis\b|novotel/i,       category: "hotel", confidence: "high" },
  { pattern: /airbnb|booking\.com|expedia/i,                    category: "hotel", confidence: "high" },
  { pattern: /accor\s+(hotels?|group)/i,                        category: "hotel", confidence: "high" },
  { pattern: /\bbnb\b|bed\s+and\s+breakfast/i,                  category: "hotel", confidence: "medium" },

  // ── Charges sociales (0%) ─────────────────────────────────────────────────
  { pattern: /caisse\s+avs|caisse\s+de\s+compensation|\bahv\b/i, category: "charges_sociales", confidence: "high" },
  { pattern: /caisse\s+de\s+pension|\blpp\b|prévoyance|prevoyance/i, category: "charges_sociales", confidence: "high" },
  { pattern: /suva|caisse\s+nationale/i,                        category: "charges_sociales", confidence: "high" },
  { pattern: /service\s+de\s+l.emploi|seco/i,                   category: "charges_sociales", confidence: "high" },

  // ── Assurances (0%) ──────────────────────────────────────────────────────
  { pattern: /\baxa\b/i,                                        category: "assurance", confidence: "high" },
  { pattern: /allianz\s+suisse/i,                               category: "assurance", confidence: "high" },
  { pattern: /zurich\s+(assurance|insurance|vie)/i,             category: "assurance", confidence: "high" },
  { pattern: /swiss\s+life/i,                                   category: "assurance", confidence: "high" },
  { pattern: /baloise|bâloise/i,                                category: "assurance", confidence: "high" },
  { pattern: /generali/i,                                       category: "assurance", confidence: "high" },
  { pattern: /helvetia/i,                                       category: "assurance", confidence: "high" },
  { pattern: /la\s+mobilière|mobiliere/i,                       category: "assurance", confidence: "high" },
  { pattern: /serafe/i,                                         category: "assurance", confidence: "high" },
  { pattern: /vaudoise/i,                                       category: "assurance", confidence: "high" },

  // ── Frais bancaires (8.1%) ────────────────────────────────────────────────
  { pattern: /frais\s+(de\s+)?(tenue|compte|virement|carte|bancaire)/i, category: "banque", confidence: "high" },
  { pattern: /agios|intérêts?\s+débiteurs|zinsen/i,             category: "banque", confidence: "high" },
  { pattern: /commission\s+(de\s+)?(change|virement)/i,         category: "banque", confidence: "high" },

  // ── Restaurants (8.1%) — repas sur place ─────────────────────────────────
  { pattern: /mcdonalds|mcdonald.s|burger\s+king|kfc\b/i,       category: "restaurant", confidence: "high" },
  { pattern: /starbucks|caffè\s+nero|costa\s+coffee/i,          category: "restaurant", confidence: "high" },
  { pattern: /restaurant|brasserie|bistro|bistrot|auberge/i,    category: "restaurant", confidence: "medium" },

  // ── Fournitures & Matériel (8.1%) ─────────────────────────────────────────
  { pattern: /staples|buro\s+plus|office\s+world/i,             category: "fournitures", confidence: "high" },
  { pattern: /amazon(?!\s+(web\s+services|aws))/i,               category: "fournitures", confidence: "medium" },
  { pattern: /digitec|galaxus/i,                                category: "fournitures", confidence: "medium" },
  { pattern: /\bikea\b/i,                                       category: "fournitures", confidence: "medium" },
  { pattern: /\bcoop\b|\bmigros\b/i,                            category: "fournitures", confidence: "medium" },
  { pattern: /dosenbach|ochsner|sport\s+xx|interdiscount/i,     category: "fournitures", confidence: "medium" },

  // ── Énergie (8.1%) ────────────────────────────────────────────────────────
  { pattern: /romande\s+énergie|romande\s+energie/i,            category: "energie", confidence: "high" },
  { pattern: /services\s+industriels|sig\s+genève|\bsig\b/i,    category: "energie", confidence: "high" },
  { pattern: /ewz\b|energie\s+wasser\s+zürich/i,                category: "energie", confidence: "high" },
  { pattern: /aev\b|energie\s+valais/i,                         category: "energie", confidence: "high" },
  { pattern: /gaz\s+naturel|gaznat/i,                           category: "energie", confidence: "high" },
  { pattern: /\bbkw\b|\bckw\b/i,                                category: "energie", confidence: "high" },

  // ── Impôts (0%) ───────────────────────────────────────────────────────────
  { pattern: /\bafc\b|administration\s+fiscale|impôts?\s+/i,    category: "impots", confidence: "high" },
  { pattern: /\btva\b|\bmwst\b|décompte\s+tva/i,                category: "impots", confidence: "high" },
  { pattern: /patente|taxe\s+professionnelle/i,                 category: "impots", confidence: "high" },

  // ── Honoraires (8.1%) ─────────────────────────────────────────────────────
  { pattern: /fiduciaire|étude\s+(d.avocats?|notarial)/i,       category: "honoraires", confidence: "high" },
  { pattern: /avocat|notaire|expert\s+comptable/i,              category: "honoraires", confidence: "medium" },

  // ── Remboursements / crédits entrants ────────────────────────────────────
  { pattern: /remboursement|rembours\.|refund|crédit\s+note/i,  category: "remboursement", confidence: "medium" },

  // ── Virements internes ────────────────────────────────────────────────────
  { pattern: /virement\s+interne|transfert\s+propre|ordre\s+de\s+virement/i, category: "virement_interne", confidence: "high" },

  // ── Loyer (0%) ────────────────────────────────────────────────────────────
  { pattern: /loyer|bail|gérance|régie/i,                       category: "loyer", confidence: "medium" },

  // ── Marketing (8.1%) ──────────────────────────────────────────────────────
  { pattern: /google\s+ads|adwords/i,                           category: "marketing", confidence: "high" },
  { pattern: /linkedin\s+ads|twitter\s+ads|instagram\s+ads/i,  category: "marketing", confidence: "high" },
]

// ─── Main categorizer ─────────────────────────────────────────────────────────

export function categorizeTransaction(
  vendor: string,
  description: string,
  amount: number,
  learnedMappings?: Record<string, string>
): CategorizationResult {
  const text = `${vendor} ${description}`.trim()

  // 1. Check user-learned mappings first
  const vendorKey = normalizeVendorKey(vendor)
  if (learnedMappings?.[vendorKey]) {
    const cat = learnedMappings[vendorKey] as CategoryKey
    return buildResult(cat, "high", Math.abs(amount))
  }

  // 2. Credits > 0: likely remboursement or virement
  if (amount > 0) {
    return buildResult("remboursement", "medium", amount)
  }

  // 3. Run rules
  let bestMatch: { category: CategoryKey; confidence: "high" | "medium" } | null = null

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      if (!bestMatch || (rule.confidence === "high" && bestMatch.confidence !== "high")) {
        bestMatch = { category: rule.category, confidence: rule.confidence }
      }
      if (bestMatch.confidence === "high") break
    }
  }

  if (bestMatch) {
    return buildResult(bestMatch.category, bestMatch.confidence, Math.abs(amount))
  }

  // 4. Fallback: unknown
  return {
    category: "inconnu",
    confidence: "low",
    vatRate: null,
    vatAmount: null,
    amountHT: null,
  }
}

function buildResult(
  category: CategoryKey,
  confidence: "high" | "medium" | "low",
  absAmount: number
): CategorizationResult {
  const info = CATEGORIES[category]
  const vatRate = info.vat

  if (vatRate === null || vatRate === 0) {
    return {
      category,
      confidence,
      vatRate: vatRate,
      vatAmount: 0,
      amountHT: absAmount,
    }
  }

  // Swiss VAT: amount TTC → HT = TTC / (1 + vatRate)
  const amountHT = absAmount / (1 + vatRate)
  const vatAmount = absAmount - amountHT

  return {
    category,
    confidence,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    amountHT: Math.round(amountHT * 100) / 100,
  }
}

export function normalizeVendorKey(vendor: string): string {
  return vendor.toLowerCase().trim().replace(/\s+/g, "_").slice(0, 60)
}

// ─── Summary builder ──────────────────────────────────────────────────────────

export interface CategorizedTransaction {
  id: string
  date: string
  vendor: string
  description: string
  amount: number
  currency: string
  category: CategoryKey
  confidence: "high" | "medium" | "low"
  vatRate: number | null
  vatAmount: number | null
  amountHT: number | null
  isManual: boolean
  vatOverride?: number | null  // user-set VAT rate override
}

export interface CategorySummary {
  category: CategoryKey
  label: string
  icon: string
  totalTTC: number
  totalHT: number
  totalVAT: number
  count: number
}

export function buildCategorySummary(transactions: CategorizedTransaction[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>()

  for (const tx of transactions) {
    if (tx.amount >= 0) continue // skip credits in summary

    const info = CATEGORIES[tx.category]
    if (!map.has(tx.category)) {
      map.set(tx.category, {
        category: tx.category,
        label: info.label,
        icon: info.icon,
        totalTTC: 0,
        totalHT: 0,
        totalVAT: 0,
        count: 0,
      })
    }
    const entry = map.get(tx.category)!
    const ttc = Math.abs(tx.amount)
    entry.totalTTC += ttc
    entry.totalHT  += tx.amountHT  ?? ttc
    entry.totalVAT += tx.vatAmount ?? 0
    entry.count    += 1
  }

  return Array.from(map.values()).sort((a, b) => b.totalTTC - a.totalTTC)
}
