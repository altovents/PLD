import HeaderSearch from "./HeaderSearch";

// Header is intentionally lightweight — leak counts come from localStorage (client-side).
// The LeakBadge is rendered by DashboardClient to avoid server→client data plumbing.
export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <HeaderSearch />

      <div className="flex items-center gap-3">
        <a
          href="/alerts"
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          🔔
        </a>
      </div>
    </header>
  );
}
