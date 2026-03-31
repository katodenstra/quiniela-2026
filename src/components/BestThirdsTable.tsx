import type { ThirdPlaceRow } from "../data/qualification";
import TeamBadge from "./TeamBadge";

type BestThirdsTableProps = {
  rows: ThirdPlaceRow[];
};

function BestThirdsTable({ rows }: BestThirdsTableProps) {
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
        }}
      >
        <div
          style={{
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Best third-placed teams
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          Top 8 qualify
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        {rows.map((row, index) => {
          const qualifies = index < 8;

          return (
            <div
              key={`${row.group}-${row.teamName}`}
              style={{
                display: "grid",
                gridTemplateColumns: "2rem 3rem minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.75rem",
                borderRadius: "14px",
                background: qualifies
                  ? "rgba(255, 173, 13, 0.12)"
                  : "rgba(255,255,255,0.04)",
                border: qualifies
                  ? "1px solid rgba(255, 173, 13, 0.24)"
                  : "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  color: qualifies
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {index + 1}
              </div>

              <div
                style={{
                  color: "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                {row.group}
              </div>

              <TeamBadge name={row.teamName} code={row.teamCode} />

              <div
                style={{
                  textAlign: "right",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "var(--text-primary)" }}>
                  {row.points}
                </span>
                {" / "}
                {row.goalDifference >= 0
                  ? `+${row.goalDifference}`
                  : row.goalDifference}
                {" / "}
                {row.goalsFor}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BestThirdsTable;
