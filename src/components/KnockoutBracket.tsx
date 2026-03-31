import type { KnockoutMatch } from "../data/knockout";
import TeamBadge from "./TeamBadge";

type KnockoutBracketProps = {
  title?: string;
  matches: KnockoutMatch[];
};

function KnockoutBracket({
  title = "Round of 32",
  matches,
}: KnockoutBracketProps) {
  return (
    <div
      className="widget"
      style={{
        padding: "1rem 1rem 0.75rem",
        borderRadius: "20px",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          color: "var(--text-primary)",
          fontWeight: 600,
          fontSize: "1rem",
          marginBottom: "0.9rem",
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {matches.map((match) => (
          <div
            key={match.id}
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "0.85rem 0.95rem",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: 600,
                marginBottom: "0.65rem",
              }}
            >
              {match.label}
            </div>

            <div
              style={{
                display: "grid",
                gap: "0.55rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <TeamBadge
                  name={match.homeTeam.teamName}
                  code={match.homeTeam.teamCode}
                />
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {match.homeTeam.source}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <TeamBadge
                  name={match.awayTeam.teamName}
                  code={match.awayTeam.teamCode}
                  reverse
                />
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {match.awayTeam.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KnockoutBracket;
