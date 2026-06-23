import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="fr">
      <body
        style={{
          background: "#f9fafb",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          gap: "16px",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            fontSize: 14,
          }}
        >
          PL
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "#1e3a5f",
          }}
        >
          404 — Page introuvable
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "#6b7280" }}>
          Cette page n&apos;existe pas.
        </p>
        <Link
          href="/dashboard"
          style={{
            background: "#1e3a5f",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 10,
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Retour au tableau de bord
        </Link>
      </body>
    </html>
  );
}
