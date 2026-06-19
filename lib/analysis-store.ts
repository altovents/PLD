import type { DetectedLeak, AnalysisSummary, Transaction } from "./csv-parser";

const STORE_KEY = "profit_leak_analysis";

export interface StoredAnalysis {
  leaks: DetectedLeak[];
  transactions: Transaction[];
  summary: AnalysisSummary;
  fileName: string;
  savedAt: string; // ISO string
}

// JSON.stringify calls toJSON() on Date before the replacer,
// so dates arrive as ISO strings. We convert them back in the reviver
// by checking if the key is "date" or matches an ISO date string.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function replacer(_: string, value: unknown) {
  return value;
}

function reviver(key: string, value: unknown) {
  if (typeof value === "string" && (key === "date" || key === "from" || key === "to") && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}

export function saveAnalysis(data: Omit<StoredAnalysis, "savedAt">): void {
  const payload: StoredAnalysis = { ...data, savedAt: new Date().toISOString() };
  localStorage.setItem(STORE_KEY, JSON.stringify(payload, replacer));
}

export function loadAnalysis(): StoredAnalysis | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw, reviver) as StoredAnalysis;
  } catch {
    return null;
  }
}

export function clearAnalysis(): void {
  localStorage.removeItem(STORE_KEY);
}
