/**
 * Charges structurelles — exclues de toute détection d'anomalie.
 *
 * Ces dépenses sont récurrentes par nature, obligatoires ou normales.
 * Les signaler comme "fuites" n'apporte aucune valeur et crée du bruit.
 *
 * Exemples : salaires, loyer, charges sociales, assurances, impôts, énergie.
 */

const STRUCTURAL_PATTERNS: RegExp[] = [
  // ── Salaires & charges RH ───────────────────────────────────────────────
  /salaire|lohn|virement\s+salaire|paie\b|payroll/i,

  // ── Charges sociales obligatoires ──────────────────────────────────────
  /caisse\s+(avs|de\s+compensation|de\s+pension)|ahv|lpp\b|prévoyance|prevoyance/i,
  /suva|caisse\s+nationale/i,
  /seco|service\s+de\s+l.emploi/i,

  // ── Assurances ──────────────────────────────────────────────────────────
  /\baxa\b|allianz|zurich\s+(assurance|insurance|vie)|swiss\s+life/i,
  /baloise|bâloise|generali|helvetia|la\s+mobilière|mobiliere|vaudoise/i,
  /serafe/i,
  /assurance|versicherung/i,

  // ── Loyer & immobilier ──────────────────────────────────────────────────
  /loyer|bail|gérance|régie|mietaufwand|miete\b/i,

  // ── Impôts & taxes obligatoires ────────────────────────────────────────
  /administration\s+fiscale|\bafc\b|décompte\s+tva|\bmwst\b|impôts?\b/i,
  /patente|taxe\s+professionnelle|lsva|redevance\s+poids/i,

  // ── Énergie & utilities ─────────────────────────────────────────────────
  /romande\s+énergie|romande\s+energie|services\s+industriels|\bsig\b/i,
  /ewz\b|aev\b|energie\s+wasser|\bbkw\b|\bckw\b|gaz\s+naturel|gaznat/i,

  // ── Virements internes ──────────────────────────────────────────────────
  /virement\s+interne|transfert\s+propre|ordre\s+de\s+virement/i,
]

/**
 * Retourne true si cette transaction représente une charge structurelle
 * qui ne doit jamais être signalée comme anomalie.
 */
export function isStructuralCost(vendor: string, description: string): boolean {
  const text = `${vendor} ${description}`.trim()
  return STRUCTURAL_PATTERNS.some((pattern) => pattern.test(text))
}
