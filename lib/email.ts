import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Profit Leak Detection <hello@profitleakdetection.ch>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://profitleakdetection.ch";

// ─── Shared styles ────────────────────────────────────────────────────────────

const base = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  padding: 40px 20px;
  margin: 0;
`;

function layout(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="${base}">
      <div style="max-width:560px;margin:0 auto;">
        <!-- Header -->
        <div style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
            PROFIT LEAK DETECTION
          </span>
        </div>
        <!-- Body -->
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          ${content}
        </div>
        <!-- Footer -->
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:20px;">
          Profit Leak Detection • Suisse romande<br>
          <a href="${APP_URL}/settings" style="color:#9ca3af;">Gérer les notifications</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

function button(text: string, href: string): string {
  return `
    <a href="${href}" style="
      display:inline-block;
      background:#e85d04;
      color:#ffffff;
      text-decoration:none;
      padding:12px 24px;
      border-radius:10px;
      font-weight:600;
      font-size:14px;
      margin-top:8px;
    ">${text}</a>
  `;
}

function leakRow(title: string, desc: string, amount: number): string {
  return `
    <div style="border-left:4px solid #e85d04;padding:10px 14px;margin-bottom:10px;background:#fafafa;border-radius:0 6px 6px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <p style="margin:0 0 2px;font-weight:600;font-size:13px;color:#111827;">${title}</p>
          <p style="margin:0;font-size:11px;color:#6b7280;">${desc}</p>
        </div>
        <span style="font-weight:700;color:#16a34a;font-size:14px;white-space:nowrap;margin-left:16px;">
          +CHF ${amount}
        </span>
      </div>
    </div>
  `;
}

// ─── Welcome email ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, firstName: string) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1e3a5f;">
      Bienvenue, ${firstName} 👋
    </h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      Votre compte Profit Leak Detection est prêt. En moyenne, nos clients récupèrent
      <strong style="color:#111827;">1 800 CHF/mois</strong> de dépenses invisibles.
    </p>

    <p style="font-weight:600;font-size:14px;color:#111827;margin:0 0 12px;">
      3 étapes pour voir où part votre argent :
    </p>

    <div style="counter-reset:steps;">
      ${step("1", "Connectez votre banque", "Connexion sécurisée via Tink (Visa). Compatible UBS, PostFinance, Raiffeisen, BCGE, BCV.")}
      ${step("2", "Lancez l'analyse automatique", "Notre moteur détecte doublons, abonnements inutilisés et hausses fournisseurs.")}
      ${step("3", "Téléchargez votre rapport", "PDF avec estimation CHF de chaque fuite, priorisé par impact.")}
    </div>

    <div style="margin-top:24px;">
      ${button("Démarrer maintenant →", `${APP_URL}/onboarding`)}
    </div>

    <p style="font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
      Données protégées selon la LPD suisse • Identifiants bancaires jamais stockés
    </p>
  `;

  return resend.emails.send({ from: FROM, to, subject: "Bienvenue — démarrez votre audit gratuit", html: layout(content) });
}

function step(n: string, title: string, desc: string): string {
  return `
    <div style="display:flex;gap:12px;margin-bottom:12px;">
      <div style="width:24px;height:24px;border-radius:50%;background:#1e3a5f;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${n}</div>
      <div>
        <p style="margin:0 0 2px;font-weight:600;font-size:13px;color:#111827;">${title}</p>
        <p style="margin:0;font-size:12px;color:#6b7280;">${desc}</p>
      </div>
    </div>
  `;
}

// ─── Leak alert email ──────────────────────────────────────────────────────

interface LeakSummary {
  title: string;
  description: string;
  estimated_savings: number;
}

export async function sendLeakAlertEmail(
  to: string,
  firstName: string,
  leaksCount: number,
  totalSavings: number,
  topLeaks: LeakSummary[]
) {
  const content = `
    <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f;">
      ${leaksCount} fuite${leaksCount > 1 ? "s" : ""} détectée${leaksCount > 1 ? "s" : ""}, ${firstName}
    </h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      Notre analyse vient d'identifier
      <strong style="color:#16a34a;">CHF ${totalSavings.toLocaleString("fr-CH")}/mois</strong>
      d'économies potentielles sur vos dépenses.
    </p>

    <p style="font-weight:600;font-size:13px;color:#111827;margin:0 0 10px;">
      Top anomalies détectées :
    </p>

    ${topLeaks.slice(0, 3).map((l) => leakRow(l.title, l.description, l.estimated_savings)).join("")}

    ${leaksCount > 3 ? `<p style="font-size:12px;color:#6b7280;margin:4px 0 16px;">+ ${leaksCount - 3} autre${leaksCount - 3 > 1 ? "s" : ""} anomalie${leaksCount - 3 > 1 ? "s" : ""} dans votre dashboard.</p>` : ""}

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#166534;">
        💡 <strong>Récupérer ces CHF ${totalSavings}</strong> donne un ROI de
        ×${(totalSavings / 299).toFixed(1)} sur votre abonnement Growth.
      </p>
    </div>

    ${button("Voir le détail et agir →", `${APP_URL}/dashboard`)}
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${leaksCount} fuite${leaksCount > 1 ? "s" : ""} détectée${leaksCount > 1 ? "s" : ""} — CHF ${totalSavings} récupérables`,
    html: layout(content),
  });
}

// ─── Monthly digest email ──────────────────────────────────────────────────

export async function sendMonthlyDigestEmail(
  to: string,
  firstName: string,
  month: string,
  leaksCount: number,
  totalSavings: number,
  resolvedCount: number
) {
  const content = `
    <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f;">
      Votre résumé — ${month}
    </h1>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      Voici le bilan mensuel de votre surveillance financière, ${firstName}.
    </p>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
      ${kpi("Fuites actives", String(leaksCount), "#dc2626")}
      ${kpi("Économies potentielles", `CHF ${totalSavings}`, "#16a34a")}
      ${kpi("Résolues ce mois", String(resolvedCount), "#2563eb")}
    </div>

    ${leaksCount > 0
      ? `<p style="font-size:13px;color:#374151;margin:0 0 16px;">
          Vous avez encore <strong>${leaksCount} anomalie${leaksCount > 1 ? "s" : ""} ouverte${leaksCount > 1 ? "s" : ""}</strong>
          représentant <strong style="color:#16a34a;">CHF ${totalSavings}/mois</strong> d'économies à activer.
        </p>`
      : `<p style="font-size:13px;color:#374151;margin:0 0 16px;">
          Excellent travail — aucune anomalie ouverte ce mois. Relancez une analyse pour vérifier.
        </p>`
    }

    ${button("Voir mon tableau de bord →", `${APP_URL}/dashboard`)}
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Votre résumé Profit Leak — ${month}`,
    html: layout(content),
  });
}

function kpi(label: string, value: string, color: string): string {
  return `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;">
      <p style="margin:0 0 4px;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;">${label}</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:${color};">${value}</p>
    </div>
  `;
}
