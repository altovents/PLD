export type PlanPeriod = "monthly" | "total";

export const PLAN_LIMITS: Record<
  string,
  { imports: number; period: PlanPeriod }
> = {
  trial:   { imports: 1,        period: "total"   },
  starter: { imports: 1,        period: "monthly" },
  growth:  { imports: 5,        period: "monthly" },
  pro:     { imports: Infinity, period: "monthly" },
  audit:   { imports: 15,       period: "total"   },
};

export const PLAN_LIMIT_LABELS: Record<string, string> = {
  trial:   "1 import au total (essai)",
  starter: "1 import / mois",
  growth:  "5 imports / mois",
  pro:     "Imports illimités",
  audit:   "15 imports au total",
};

export const PERIOD_LABELS: Record<PlanPeriod, string> = {
  monthly: "ce mois-ci",
  total:   "au total",
};
