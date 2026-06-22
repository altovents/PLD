import type { CategorizedTransaction } from "./categorizer"
import { CATEGORIES } from "./categorizer"

// ─── Standard export (Excel-compatible CSV with UTF-8 BOM) ────────────────────

export function generateStandardCSV(transactions: CategorizedTransaction[]): string {
  const BOM = "\uFEFF"

  const headers = [
    "Date",
    "Bénéficiaire",
    "Description",
    "Montant TTC (CHF)",
    "Taux TVA (%)",
    "TVA estimée (CHF)",
    "Montant HT estimé (CHF)",
    "Catégorie",
    "Statut",
    "Note",
  ]

  const rows = transactions.map((tx) => {
    const info = CATEGORIES[tx.category]
    const absAmount = Math.abs(tx.amount)
    const isCredit = tx.amount >= 0
    const effectiveVat = tx.vatOverride !== undefined && tx.vatOverride !== null
      ? tx.vatOverride
      : tx.vatRate
    const needsReview = tx.confidence === "low" || tx.category === "inconnu"

    // Recalculate if override
    const vatAmount = effectiveVat && effectiveVat > 0
      ? Math.round((absAmount - absAmount / (1 + effectiveVat)) * 100) / 100
      : (tx.vatAmount ?? 0)
    const amountHT = effectiveVat && effectiveVat > 0
      ? Math.round((absAmount / (1 + effectiveVat)) * 100) / 100
      : (tx.amountHT ?? absAmount)

    return [
      tx.date,
      escapeCsv(tx.vendor),
      escapeCsv(tx.description),
      isCredit ? `+${absAmount.toFixed(2)}` : `-${absAmount.toFixed(2)}`,
      effectiveVat !== null && effectiveVat !== undefined ? `${(effectiveVat * 100).toFixed(1)}%` : "?",
      vatAmount.toFixed(2),
      amountHT.toFixed(2),
      escapeCsv(info.label),
      needsReview ? "⚠ À vérifier" : tx.isManual ? "✓ Corrigé" : "✓ Auto",
      tx.vatOverride !== undefined && tx.vatOverride !== null
        ? "TVA corrigée manuellement"
        : needsReview
          ? "TVA et catégorie à confirmer"
          : "TVA estimée automatiquement — à confirmer par votre fiduciaire",
    ]
  })

  const lines = [headers, ...rows]
    .map((row) => row.join(";"))
    .join("\r\n")

  return BOM + lines
}

// ─── Bexio-compatible export ──────────────────────────────────────────────────
// Based on Bexio's manual journal entry import format.
// Swiss KMU chart of accounts (Käfer / PME standard)

const CATEGORY_TO_BEXIO_ACCOUNT: Record<string, string> = {
  saas_etranger:      "6510",  // Informatik / Lizenzen
  saas_suisse:        "6510",  // Informatik / Lizenzen
  telecom:            "6520",  // Telefon / Internet
  transport:          "6530",  // Reisekosten (transport public 2.6%)
  deplacement_route:  "6530",  // Reisekosten (taxi, parking 8.1%)
  carburant:          "6560",  // Fahrzeugaufwand (carburant 8.1%)
  hotel:              "6540",  // Repräsentation / Bewirtung (hébergement 3.8%)
  restaurant:         "6540",  // Repräsentation / Bewirtung
  fournitures:        "6000",  // Büromaterial
  charges_sociales:   "5200",  // Sozialversicherungen
  salaires:           "5000",  // Löhne und Gehälter
  honoraires:         "6800",  // Beratungs- und Buchführungskosten
  loyer:              "6100",  // Mietaufwand
  assurance:          "6300",  // Versicherungsaufwand
  energie:            "6210",  // Energie- und Wasserversorgung
  marketing:          "6600",  // Werbung und Marketing
  banque:             "6860",  // Bankspesen
  impots:             "2100",  // Verbindlichkeiten gegenüber Behörden (dette fiscale, pas charge)
  matieres_premieres: "4000",  // Materialaufwand
  remboursement:      "3000",  // Erlöse
  virement_interne:   "1000",  // Kasse / Interne
  inconnu:            "9999",  // À classifier
}

// Bexio VAT codes (Swiss):
// MV81 = TVA 8.1% (standard)
// MV26 = TVA 2.6% (réduit, nourriture, transport public)
// MV38 = TVA 3.8% (hébergement hôtelier)
// IMP  = Exempt de TVA / hors champ
// MPOS = TVA sur acquisition (reverse charge, services étrangers)
function getBexioVatCode(vatRate: number | null, category: string): string {
  if (category === "saas_etranger") return "MPOS"  // reverse charge B2B
  if (vatRate === null) return ""
  if (vatRate === 0.081) return "MV81"
  if (vatRate === 0.026) return "MV26"
  if (vatRate === 0.038) return "MV38"
  if (vatRate === 0) return "IMP"
  return ""
}

export function generateBexioCSV(
  transactions: CategorizedTransaction[],
  bankAccount = "1020"  // Configurable: 1020=UBS/PostFinance default, 1021=Raiffeisen, etc.
): string {
  const BOM = "\uFEFF"

  const headers = [
    "Datum",           // Date DD.MM.YYYY
    "Belegnummer",     // Document number
    "Buchungstext",    // Description (max 80 chars)
    "Betrag",          // Amount (positive, always debit side)
    "Konto",           // Expense account
    "Gegenkonto",      // Bank/cash account
    "MwSt-Code",       // VAT code
    "Bemerkung",       // Notes
  ]

  const debits = transactions.filter((tx) => tx.amount < 0)

  const rows = debits.map((tx, i) => {
    const absAmount = Math.abs(tx.amount)
    const account = CATEGORY_TO_BEXIO_ACCOUNT[tx.category] ?? "9999"

    // Use override if set
    const effectiveVat = tx.vatOverride !== undefined && tx.vatOverride !== null
      ? tx.vatOverride
      : tx.vatRate

    const vatCode = getBexioVatCode(effectiveVat, tx.category)
    const noteStr = tx.vatOverride !== undefined && tx.vatOverride !== null
      ? "TVA corrigée manuellement"
      : tx.category === "inconnu"
        ? "À catégoriser manuellement"
        : "TVA estimée — à confirmer"

    return [
      formatDateDMY(tx.date),
      String(i + 1).padStart(4, "0"),
      escapeCsv(`${tx.vendor} — ${tx.description}`.slice(0, 80)),
      absAmount.toFixed(2),
      account,
      bankAccount,
      vatCode,
      escapeCsv(noteStr),
    ]
  })

  const lines = [headers, ...rows]
    .map((row) => row.join(";"))
    .join("\r\n")

  return BOM + lines
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDateDMY(dateStr: string): string {
  const parts = dateStr.split("-")
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return dateStr
}
