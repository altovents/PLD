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
    "TVA estimée (%)",
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
    const needsReview = tx.confidence === "low" || tx.category === "inconnu"

    return [
      tx.date,
      escapeCsv(tx.vendor),
      escapeCsv(tx.description),
      isCredit ? `+${absAmount.toFixed(2)}` : `-${absAmount.toFixed(2)}`,
      tx.vatRate !== null ? `${(tx.vatRate * 100).toFixed(1)}%` : "?",
      tx.vatAmount !== null ? tx.vatAmount.toFixed(2) : "?",
      tx.amountHT !== null ? tx.amountHT.toFixed(2) : "?",
      escapeCsv(info.label),
      needsReview ? "⚠ À vérifier" : tx.isManual ? "✓ Corrigé" : "✓ Auto",
      needsReview ? "TVA et catégorie à confirmer" : "TVA estimée automatiquement — à confirmer par votre fiduciaire",
    ]
  })

  const lines = [headers, ...rows]
    .map((row) => row.join(";"))
    .join("\r\n")

  return BOM + lines
}

// ─── Bexio-compatible export ──────────────────────────────────────────────────
// Based on Bexio's manual journal entry import format.
// NOTE: Bexio account numbers use the Swiss KMU chart of accounts.

const CATEGORY_TO_BEXIO_ACCOUNT: Record<string, string> = {
  saas_etranger:      "6510",  // Informatik / Lizenzen
  saas_suisse:        "6510",
  telecom:            "6520",  // Telefon / Internet
  transport:          "6530",  // Reisekosten
  restaurant:         "6540",  // Repräsentation
  fournitures:        "6000",  // Büromaterial
  charges_sociales:   "5200",  // Sozialversicherungen
  salaires:           "5000",  // Löhne und Gehälter
  honoraires:         "6800",  // Beratungs- und Buchführungskosten
  loyer:              "6100",  // Mietaufwand
  assurance:          "6300",  // Versicherungsaufwand
  energie:            "6210",  // Energie- und Wasserversorgung
  marketing:          "6600",  // Werbung und Marketing
  banque:             "6860",  // Bankspesen
  impots:             "8000",  // Direkte Steuern
  matieres_premieres: "4000",  // Materialaufwand
  remboursement:      "3000",  // Erlöse
  virement_interne:   "1000",  // Kasse
  inconnu:            "9999",  // À classifier
}

export function generateBexioCSV(transactions: CategorizedTransaction[]): string {
  const BOM = "\uFEFF"

  const headers = [
    "Datum",           // Date
    "Belegnummer",     // Document number (leave empty)
    "Buchungstext",    // Description
    "Betrag",          // Amount (positive)
    "Konto",           // Account debit
    "Gegenkonto",      // Account credit (bank account = 1020)
    "MwSt-Code",       // VAT code
    "Bemerkung",       // Notes
  ]

  const debits = transactions.filter((tx) => tx.amount < 0)

  const rows = debits.map((tx, i) => {
    const absAmount = Math.abs(tx.amount)
    const account = CATEGORY_TO_BEXIO_ACCOUNT[tx.category] ?? "9999"
    const vatCode = tx.vatRate === 0.081 ? "MV81" : tx.vatRate === 0.026 ? "MV26" : tx.vatRate === 0 ? "IMP" : ""
    const noteStr = tx.category === "inconnu" ? "À catégoriser manuellement" : "TVA estimée — à confirmer"

    return [
      formatDateDMY(tx.date),
      String(i + 1).padStart(4, "0"),
      escapeCsv(`${tx.vendor} — ${tx.description}`.slice(0, 80)),
      absAmount.toFixed(2),
      account,
      "1020",   // Main bank account in Swiss KMU plan
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
  // dateStr is YYYY-MM-DD, convert to DD.MM.YYYY
  const parts = dateStr.split("-")
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return dateStr
}
