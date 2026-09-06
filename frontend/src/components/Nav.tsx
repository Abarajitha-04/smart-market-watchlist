import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LineChart, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/lib/theme";

const LINKS = [
  { to: "/", label: "Watchlist", end: true },
  { to: "/status", label: "System status", end: false },
  { to: "/about", label: "Architecture", end: false },
];

function linkClasses(isActive: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-surface-sunken text-ink" : "text-ink-muted hover:text-ink"
  }`;
}

export function Nav() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <LineChart className="h-4.5 w-4.5" />
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">Smart Market Watchlist</span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => linkClasses(isActive)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `${linkClasses(isActive)} block`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
