import type { GroupStandingRow } from "../data/standings";
import TeamBadge from "./TeamBadge";
import type { QualifiedStatus } from "../data/qualification";

type GroupStandingsTableProps = {
  group: string;
  rows: GroupStandingRow[];
  getRowStatus: (index: number) => QualifiedStatus;
};

function GroupStandingsTable({
  group,
  rows,
  getRowStatus,
}: GroupStandingsTableProps) {
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
          Group {group} standings
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          Pts / GD / GF
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.55rem" }}>
        {rows.map((row, index) => {
          const status = getRowStatus(index);
          const isTop2 = status === "top2";
          const isBestThird = status === "bestThird";
          const isQualified = isTop2 || isBestThird;

          return (
            <div
              key={row.teamName}
              style={{
                display: "grid",
                gridTemplateColumns: "2rem minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.75rem",
                borderRadius: "14px",
                background: isTop2
                  ? "rgba(12, 157, 97, 0.12)"
                  : isBestThird
                    ? "rgba(255, 173, 13, 0.12)"
                    : "rgba(255,255,255,0.04)",
                border: isTop2
                  ? "1px solid rgba(12, 157, 97, 0.24)"
                  : isBestThird
                    ? "1px solid rgba(255, 173, 13, 0.24)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  color: isQualified
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  minWidth: 0,
                }}
              >
                <TeamBadge name={row.teamName} code={row.teamCode} />

                {isQualified && (
                  <span
                    style={{
                      padding: "0.25rem 0.55rem",
                      borderRadius: "999px",
                      background: isTop2
                        ? "rgba(12, 157, 97, 0.18)"
                        : "rgba(255, 173, 13, 0.18)",
                      border: isTop2
                        ? "1px solid rgba(12, 157, 97, 0.24)"
                        : "1px solid rgba(255, 173, 13, 0.24)",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {isTop2 ? "Qualified" : "Best third"}
                  </span>
                )}
              </div>

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

export default GroupStandingsTable;
