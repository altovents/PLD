// Shared types used by analysis-engine and detectors
// Kept separate to avoid circular imports

export interface DbTransaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  vendor: string | null;
  category: string | null;
}

export interface CompanyContext {
  alert_thresholds?: {
    price_increase_pct?: number;
    duplicate_days?: number;
    progressive_drift_pct?: number;
  };
  trusted_vendors?: string[];
  budget_categories?: Record<string, number>;
}

export interface LeakCandidate {
  type: "duplicate" | "unused_subscription" | "price_increase" | "progressive_increase" | "overlapping_services" | "ghost_reactivation";
  title: string;
  description: string;
  estimated_savings: number;
  priority: "high" | "medium" | "low";
  vendor: string | null;
  trigger_transaction_ids?: string[];
  detection_logic?: string;
  comparison_basis?: Record<string, unknown>;
}
