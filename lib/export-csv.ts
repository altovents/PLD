const PRIORITY_LABELS: Record<string, string> = {
  high: "Urgent",
  medium: "Moyen",
  low: "Faible",
};

const TYPE_LABELS: Record<string, string> = {
  duplicate: "Double paiement",
  unused_subscription: "Abonnement inutilisé",
  price_increase: "Hausse soudaine",
  progressive_increase: "Hausse progressive",
  overlapping_services: "Services redondants",
  ghost_reactivation: "Réactivation fantôme",
};

function escapeCell(value: string): string {
  if (value.includes(";")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportLeaksAsCSV(
  leaks: Array<{
    type: string;
    title: string;
    description: string;
    estimated_savings: number;
    priority: string;
    vendor: string | null;
  }>
): void {
  const header = "Type;Titre;Fournisseur;Priorité;Économie estimée (CHF);Description";

  const rows = leaks.map((leak) => {
    const type = escapeCell(TYPE_LABELS[leak.type] ?? leak.type);
    const title = escapeCell(leak.title);
    const vendor = escapeCell(leak.vendor ?? "");
    const priority = escapeCell(PRIORITY_LABELS[leak.priority] ?? leak.priority);
    const savings = leak.estimated_savings.toFixed(2);
    const description = escapeCell(leak.description);
    return [type, title, vendor, priority, savings, description].join(";");
  });

  const csv = "\uFEFF" + [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `fuites-profit-leak-${today}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
