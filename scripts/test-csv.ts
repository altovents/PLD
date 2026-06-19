import fs from "fs";
import path from "path";
import { parseCSV, detectLeaks, computeSummary } from "../lib/csv-parser";

const csvPath = path.join(__dirname, "../public/exemple-postfinance.csv");
const content = fs.readFileSync(csvPath, "utf-8");

console.log("═══════════════════════════════════════════════════");
console.log("  TEST — Profit Leak CSV Parser");
console.log("═══════════════════════════════════════════════════\n");

// 1. Parse
const { transactions, format, errors } = parseCSV(content);

console.log(`Format détecté  : ${format}`);
console.log(`Transactions    : ${transactions.length}`);
if (errors.length) console.log(`Avertissements  : ${errors.join(", ")}`);

// 2. Show first 5 transactions
console.log("\n── Aperçu (5 premières transactions) ──────────────");
for (const t of transactions.slice(0, 5)) {
  const sign = t.amount >= 0 ? "+" : "";
  console.log(
    `  ${t.date.toLocaleDateString("fr-CH").padEnd(12)} | ${t.vendor.padEnd(22)} | ${sign}${t.amount.toFixed(2)} ${t.currency}`
  );
}

// 3. Detect leaks
const leaks = detectLeaks(transactions);
const summary = computeSummary(transactions, leaks);

console.log("\n── Résumé ──────────────────────────────────────────");
console.log(`  Mois analysés       : ${summary.monthsAnalyzed}`);
console.log(`  Total dépenses      : ${summary.totalDebits.toFixed(2)} CHF`);
console.log(`  Fuites détectées    : ${summary.leaksFound}`);
console.log(`  Économies/mois      : ${summary.potentialSavings.toFixed(2)} CHF`);

console.log("\n── Fuites détectées ────────────────────────────────");
if (leaks.length === 0) {
  console.log("  Aucune fuite détectée.");
} else {
  for (const leak of leaks) {
    const prio = { high: "🔴", medium: "🟡", low: "🔵" }[leak.priority];
    console.log(`\n  ${prio} [${leak.type}] ${leak.title}`);
    console.log(`     ${leak.description}`);
    console.log(`     Économie potentielle : +${leak.amount.toFixed(2)} CHF/mois`);
    console.log(`     Transactions concernées : ${leak.transactions.length}`);
  }
}

console.log("\n═══════════════════════════════════════════════════");

// 4. Assertions (basic checks)
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

console.log("\n── Assertions ──────────────────────────────────────");
check("Format détecté = postfinance", format === "postfinance");
check("Au moins 60 transactions parsées", transactions.length >= 60);
check("Au moins 1 fuite détectée", leaks.length >= 1);
check("Double facturation Adobe détectée", leaks.some((l) => l.type === "duplicate" && l.vendor === "Adobe"));
check("Double facturation Dropbox détectée", leaks.some((l) => l.type === "duplicate" && l.vendor === "Dropbox"));
check("Abonnement récurrent détecté (Slack ou Zoom)", leaks.some((l) => l.type === "unused_subscription"));
check("Hausse de prix détectée (Microsoft ou HubSpot)", leaks.some((l) => l.type === "price_increase"));
check("Frais bancaires détectés", leaks.some((l) => l.type === "bank_fees"));
check("Économies > 100 CHF/mois", summary.potentialSavings > 100);

console.log(`\n  Résultat : ${passed} passés, ${failed} échoués`);
console.log("═══════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
