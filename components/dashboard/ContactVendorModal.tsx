"use client";

import { useState } from "react";

export default function ContactVendorModal({
  vendor,
  title,
  estimated_savings,
  onClose,
}: {
  vendor: string;
  title: string;
  estimated_savings: number;
  onClose: () => void;
}) {
  const emailBody = `Madame, Monsieur,

Suite à une analyse de nos dépenses, nous avons constaté une anomalie concernant nos paiements à ${vendor} : ${title}.

L'impact estimé sur notre trésorerie est de ${estimated_savings.toFixed(0)} CHF.

Pourriez-vous nous confirmer la justification de cette facturation et, le cas échéant, nous proposer une correction ou un remboursement ?

Nous restons disponibles pour en discuter.

Cordialement`;

  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1e3a5f]">Contacter {vendor}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Email pré-rédigé à personnaliser</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed border border-gray-200">
            {emailBody}
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-[#1e3a5f] text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#162c45] transition-colors"
            >
              {copied ? "✓ Copié !" : "Copier le texte"}
            </button>
            <a
              href={`mailto:?subject=Anomalie de facturation — ${vendor}&body=${encodeURIComponent(emailBody)}`}
              className="flex-1 bg-[#e85d04] text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[#c94d00] transition-colors text-center"
            >
              Ouvrir dans la messagerie
            </a>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Cliquer sur &quot;Ouvrir dans la messagerie&quot; marquera cette alerte comme &quot;En cours&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
