import type { DbTransaction, LeakCandidate } from "@/lib/types";
import { isStructuralCost } from "./structural-costs";

/**
 * Détecte les services qui se chevauchent dans la même catégorie fonctionnelle.
 * Exemple : payer Zoom ET Webex simultanément.
 */

const SERVICE_CATEGORIES: Record<string, string[]> = {
  "Vidéoconférence":   ["Zoom", "Microsoft 365", "Webex", "Google Meet", "GoToMeeting"],
  "Stockage cloud":    ["Dropbox", "Box", "OneDrive", "Google Drive"],
  "CRM":               ["Salesforce", "HubSpot", "Pipedrive", "Zoho"],
  "Design":            ["Adobe", "Figma", "Sketch", "InVision", "Canva"],
  "Gestion de projet": ["Asana", "Monday.com", "Trello", "Atlassian", "ClickUp", "Basecamp", "Notion"],
  "Communication":     ["Slack", "Microsoft 365", "Google Workspace"],
  "Cloud & Hosting":   ["AWS", "DigitalOcean", "Heroku", "Vercel", "Netlify", "Cloudflare"],
  "Comptabilité":      ["QuickBooks", "Xero", "Bexio", "Sage", "Banana Comptabilité"],
  "Support client":    ["Zendesk", "Intercom", "Freshdesk"],
  "Email marketing":   ["Mailchimp", "Brevo", "SendGrid", "ActiveCampaign", "Klaviyo"],
};

export function detectOverlappingServices(transactions: DbTransaction[]): LeakCandidate[] {
  const debits = transactions.filter((tx) => tx.amount < 0);

  // Group transactions by normalised vendor name
  const vendorTxs: Record<string, DbTransaction[]> = {};
  for (const tx of debits) {
    const vendor = tx.vendor ?? tx.description?.slice(0, 40);
    if (!vendor) continue;
    if (isStructuralCost(vendor, tx.description ?? "")) continue;
    if (!vendorTxs[vendor]) vendorTxs[vendor] = [];
    vendorTxs[vendor].push(tx);
  }

  // Compute monthly average spend per vendor
  function monthlyAvg(txList: DbTransaction[]): number {
    const monthTotals: Record<string, number> = {};
    for (const tx of txList) {
      const mk = tx.date.slice(0, 7);
      monthTotals[mk] = (monthTotals[mk] ?? 0) + Math.abs(tx.amount);
    }
    const values = Object.values(monthTotals);
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  const results: LeakCandidate[] = [];
  const alreadyFlaggedVendors = new Set<string>();

  for (const [category, keywords] of Object.entries(SERVICE_CATEGORIES)) {
    // Find which category vendors are active in the DB (case-insensitive match)
    const activeVendors: string[] = [];

    for (const dbVendor of Object.keys(vendorTxs)) {
      if (alreadyFlaggedVendors.has(dbVendor)) continue;
      const matchesCategory = keywords.some((kw) =>
        dbVendor.toLowerCase().includes(kw.toLowerCase())
      );
      if (matchesCategory && !activeVendors.includes(dbVendor)) {
        activeVendors.push(dbVendor);
      }
    }

    if (activeVendors.length < 2) continue;

    // Compute monthly average per active vendor
    const vendorAvgs: Record<string, number> = {};
    for (const v of activeVendors) {
      vendorAvgs[v] = monthlyAvg(vendorTxs[v]);
    }

    const totalMonthly = activeVendors.reduce((s, v) => s + vendorAvgs[v], 0);
    const cheapestVendor = activeVendors.reduce((a, b) =>
      vendorAvgs[a] <= vendorAvgs[b] ? a : b
    );
    const minMonthly = vendorAvgs[cheapestVendor];
    const savings = totalMonthly - minMonthly;

    if (savings < 15) continue;

    const priority: "high" | "medium" = savings > 100 ? "high" : "medium";

    const triggerIds = activeVendors.flatMap((v) => vendorTxs[v].map((tx) => tx.id));

    results.push({
      type: "overlapping_services",
      title: `Doublons de services — ${category}`,
      description: `${activeVendors.join(" + ")} actifs simultanément. Conserver uniquement ${cheapestVendor} représente une économie potentielle de ${Math.round(savings)} CHF/mois.`,
      estimated_savings: Math.round(savings),
      priority,
      vendor: activeVendors[0],
      trigger_transaction_ids: triggerIds,
      detection_logic: `Catégorie "${category}" — ${activeVendors.join(", ")} actifs simultanément — économie potentielle : ${Math.round(savings)} CHF/mois en conservant ${cheapestVendor}`,
      comparison_basis: {
        category,
        vendors: activeVendors,
        savings_per_month: Math.round(savings),
        recommended: cheapestVendor,
      },
    });

    // Mark all vendors in this doublon so they are not re-flagged in another category
    for (const v of activeVendors) {
      alreadyFlaggedVendors.add(v);
    }
  }

  return results.sort((a, b) => b.estimated_savings - a.estimated_savings);
}
