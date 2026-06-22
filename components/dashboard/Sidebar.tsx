import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard",    label: "Tableau de bord", icon: "📊" },
  { href: "/import",       label: "Importer CSV",    icon: "⬆️" },
  { href: "/transactions", label: "Transactions",    icon: "💳" },
  { href: "/alerts",       label: "Alertes",         icon: "🔔" },
  { href: "/comptabilite", label: "Comptabilité",    icon: "🧾" },
  { href: "/reports",      label: "Rapports PDF",    icon: "📄" },
  { href: "/settings",     label: "Paramètres",      icon: "⚙️" },
];

async function signOutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const firstName = (user?.user_metadata?.first_name as string | undefined) ?? "";
  const lastName  = (user?.user_metadata?.last_name  as string | undefined) ?? "";
  const company   = (user?.user_metadata?.company    as string | undefined) ?? "";
  const email     = user?.email ?? "";

  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const displayName = firstName
    ? `${firstName} ${lastName}`.trim()
    : email.split("@")[0];

  return (
    <aside className="w-60 flex flex-col h-full border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">PL</span>
          </div>
          <div>
            <p className="text-[#1e3a5f] font-bold text-sm leading-none">Profit Leak</p>
            <p className="text-gray-400 text-xs mt-0.5">Detection</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-xs font-semibold truncate">{displayName}</p>
            <p className="text-gray-400 text-xs truncate">{company || email}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Se déconnecter"
              className="text-gray-300 hover:text-gray-600 transition-colors text-sm leading-none p-1"
            >
              ↩
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
