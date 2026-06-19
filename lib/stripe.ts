import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS = {
  starter: {
    name: "Starter",
    price: 149,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    features: ["1 import CSV / mois", "Détection complète des fuites", "Dashboard + alertes", "1 rapport PDF/mois", "Support email"],
  },
  growth: {
    name: "Growth",
    price: 299,
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    features: ["5 imports CSV / mois", "Détection complète des fuites", "Dashboard + alertes", "Rapports PDF illimités", "3 utilisateurs", "Support prioritaire"],
  },
  pro: {
    name: "Pro",
    price: 599,
    priceId: process.env.STRIPE_PRICE_PRO!,
    features: ["Imports CSV illimités", "Multi-entités + benchmarks", "Dashboard personnalisable", "Rapports sur-mesure", "Utilisateurs illimités", "Account manager + SLA"],
  },
} as const;
