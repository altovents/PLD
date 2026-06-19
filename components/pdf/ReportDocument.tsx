import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportLeak {
  type: string;
  title: string;
  description: string;
  estimated_savings: number;
  priority: string;
  vendor: string | null;
}

export interface ReportData {
  company: string;
  generatedAt: string; // ISO string
  leaks: ReportLeak[];
  totalSavings: number;
  planPrice: number;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  navy:    "#1e3a5f",
  orange:  "#e85d04",
  green:   "#16a34a",
  red:     "#dc2626",
  yellow:  "#d97706",
  blue:    "#2563eb",
  gray:    "#6b7280",
  light:   "#f9fafb",
  border:  "#e5e7eb",
  white:   "#ffffff",
} as const;

const TYPE_META: Record<string, { label: string; color: string }> = {
  duplicate:            { label: "Double paiement",     color: C.red    },
  unused_subscription:  { label: "Abonnement inutilisé",color: C.orange },
  price_increase:       { label: "Hausse soudaine",     color: C.yellow },
  progressive_increase: { label: "Hausse progressive",  color: C.blue   },
  bank_fees:            { label: "Frais bancaires",     color: C.blue   },
  overlapping_services: { label: "Services redondants", color: "#7c3aed" },
  annual_optimization:  { label: "Optim. annuelle",     color: "#0d9488" },
  progressive_drift:    { label: "Dérive progressive",  color: "#d97706" },
  currency_fees:        { label: "Frais de change",     color: "#4f46e5" },
  ghost_reactivation:   { label: "Réactivation fantôme",color: "#e11d48" },
  late_fees:            { label: "Frais de retard",     color: C.red    },
};

const PRIORITY_COLOR: Record<string, string> = {
  high:   C.red,
  medium: C.orange,
  low:    C.gray,
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "Urgent", medium: "Moyen", low: "Faible",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: C.white,
  },

  // Header
  header: { marginBottom: 24 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.navy },
  tagline: { fontSize: 8, color: C.gray, marginTop: 3 },
  headerRight: { alignItems: "flex-end" },
  headerMeta: { fontSize: 8, color: C.gray },
  headerDivider: { borderBottomWidth: 2, borderBottomColor: C.navy },

  // Summary cards
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.light,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryLabel: { fontSize: 8, color: C.gray, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  summarySubLabel: { fontSize: 7, color: C.gray, marginTop: 2 },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: C.gray,
    marginBottom: 12,
    marginTop: -6,
  },

  // Leak card
  leakCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  leakAccent: { width: 4 },
  leakBody: { flex: 1, padding: 10 },
  leakHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  leakTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  leakTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111827" },
  leakBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  leakTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    fontSize: 6.5,
    color: C.gray,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  leakDesc: { fontSize: 8, color: C.gray, lineHeight: 1.5 },
  leakAmount: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    textAlign: "right",
    minWidth: 70,
  },
  leakAmountLabel: { fontSize: 7, color: C.gray, textAlign: "right" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.gray },

  // CTA box
  ctaBox: {
    marginTop: 20,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 6,
    padding: 12,
  },
  ctaTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    marginBottom: 4,
  },
  ctaText: { fontSize: 8, color: C.gray, lineHeight: 1.6 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCHF(n: number) {
  return `CHF ${n.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Document ─────────────────────────────────────────────────────────────────

export default function ReportDocument({ data }: { data: ReportData }) {
  const roi = data.planPrice > 0 ? (data.totalSavings / data.planPrice).toFixed(1) : "—";

  return (
    <Document
      title={`Profit Leak Detection — ${data.company}`}
      author="Profit Leak Detection"
      subject="Rapport d'analyse des dépenses"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.brand}>PROFIT LEAK DETECTION</Text>
              <Text style={s.tagline}>
                Rapport d&apos;analyse des dépenses — {data.company}
              </Text>
            </View>
            <View style={s.headerRight}>
              <Text style={s.headerMeta}>Généré le {fmtDate(data.generatedAt)}</Text>
              <Text style={s.headerMeta}>Document confidentiel</Text>
            </View>
          </View>
          <View style={s.headerDivider} />
        </View>

        {/* ── Summary ── */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Fuites détectées</Text>
            <Text style={[s.summaryValue, { color: C.red }]}>
              {data.leaks.length}
            </Text>
            <Text style={s.summarySubLabel}>anomalies identifiées</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Économies potentielles</Text>
            <Text style={[s.summaryValue, { color: C.green }]}>
              {fmtCHF(data.totalSavings)}
            </Text>
            <Text style={s.summarySubLabel}>récupérables / mois</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>ROI de l&apos;abonnement</Text>
            <Text style={[s.summaryValue, { color: C.navy }]}>×{roi}</Text>
            <Text style={s.summarySubLabel}>vs {fmtCHF(data.planPrice)}/mois</Text>
          </View>
        </View>

        {/* ── Leak list ── */}
        <Text style={s.sectionTitle}>Anomalies détectées</Text>
        <Text style={s.sectionSubtitle}>Triées par impact financier décroissant</Text>

        {data.leaks.map((leak, i) => {
          const meta = TYPE_META[leak.type] ?? { label: leak.type, color: C.gray };
          const priorityColor = PRIORITY_COLOR[leak.priority] ?? C.gray;

          return (
            <View key={i} style={s.leakCard}>
              {/* Left accent bar */}
              <View style={[s.leakAccent, { backgroundColor: meta.color }]} />

              <View style={s.leakBody}>
                <View style={s.leakHeaderRow}>
                  {/* Title + badges */}
                  <View style={s.leakTitleRow}>
                    <Text style={s.leakTitle}>{leak.title}</Text>
                    <View style={[s.leakBadge, { backgroundColor: priorityColor }]}>
                      <Text>{PRIORITY_LABEL[leak.priority] ?? leak.priority}</Text>
                    </View>
                    <View style={s.leakTypeBadge}>
                      <Text>{meta.label}</Text>
                    </View>
                  </View>
                  {/* Amount */}
                  <View>
                    <Text style={s.leakAmount}>+{fmtCHF(leak.estimated_savings)}</Text>
                    <Text style={s.leakAmountLabel}>récupérables</Text>
                  </View>
                </View>
                <Text style={s.leakDesc}>{leak.description}</Text>
              </View>
            </View>
          );
        })}

        {/* ── CTA ── */}
        <View style={s.ctaBox}>
          <Text style={s.ctaTitle}>Prochaine étape</Text>
          <Text style={s.ctaText}>
            Ce rapport identifie {fmtCHF(data.totalSavings)}/mois d&apos;économies
            potentielles. Chaque anomalie est cliquable dans votre dashboard pour
            consulter le détail et prendre action. Un client moyen récupère ces
            économies en moins de 30 jours après la première analyse.
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Profit Leak Detection — Document confidentiel
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
