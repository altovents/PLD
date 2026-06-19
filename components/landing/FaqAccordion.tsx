"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Mes données bancaires sont-elles sécurisées ?",
    a: "Votre fichier CSV est analysé directement dans votre navigateur. Aucune donnée bancaire ne transite sur nos serveurs. Conforme LPD (loi suisse sur la protection des données).",
  },
  {
    q: "Quelles banques sont compatibles ?",
    a: "PostFinance, UBS, Raiffeisen, BCGE, BCV, Migros Bank et toute banque qui exporte en CSV. Notre parser s'adapte automatiquement au format détecté.",
  },
  {
    q: "Combien de mois de relevés faut-il analyser ?",
    a: "3 mois minimum pour les doublons et abonnements. 6 mois pour capturer les hausses progressives. Plus la période est longue, plus les économies détectées sont importantes.",
  },
  {
    q: "Est-ce que ça remplace un comptable ?",
    a: "Non — c'est complémentaire. On détecte des anomalies opérationnelles que les comptables ne voient pas car ils traitent des données agrégées.",
  },
  {
    q: "Et si je n'ai aucune fuite ?",
    a: "L'essai 48h est gratuit. Si aucune anomalie n'est détectée, vous ne payez rien. C'est rare — notre taux de détection est de 94% sur les PME de 10+ employés.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => (
        <div key={i} className="liquid-glass-sm rounded-2xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
          >
            <span className="text-white/85 font-medium text-sm">{faq.q}</span>
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white/40 text-xs transition-transform duration-300"
              style={{
                transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              +
            </span>
          </button>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: open === i ? "180px" : "0px" }}
          >
            <p className="px-6 pb-5 text-sm text-white/45 leading-relaxed">{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
