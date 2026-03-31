import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "Matches", icon: "sports_soccer" },
  { to: "/breakdown", label: "Breakdown", icon: "analytics" },
  { to: "/leaderboard", label: "Leaderboard", icon: "emoji_events" },
  { to: "/friends", label: "Friends", icon: "groups" },
];

function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div className="app-hero__eyebrow">
          <span>UX Engineer MVP mode</span>
        </div>

        <div className="app-header">
          <div>
            <h1 className="app-title">Prediction Pool</h1>
            <p className="app-subtitle">
              World Cup 2026 group stage predictions, scoring, comparison and
              leaderboard flows.
            </p>
          </div>
        </div>
      </header>

      <nav className="top-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className="top-nav__link"
              style={
                isActive
                  ? {
                      background: "rgba(58, 112, 226, 0.18)",
                      borderColor: "rgba(58, 112, 226, 0.45)",
                      color: "var(--text-primary)",
                    }
                  : undefined
              }
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="page-panel">{children}</main>
    </div>
  );
}

export default AppShell;
