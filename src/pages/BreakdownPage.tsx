import { useState } from "react";
import EmptyState from "../components/EmptyState";
import GroupTabs from "../components/GroupTabs";
import PageIntro from "../components/PageIntro";
import StatusBanner from "../components/StatusBanner";
import { scorePrediction, usePoolState } from "../state/usePoolState";
import type { GroupStageMatch } from "../data/worldcup";

type PointsFilter = "all" | 3 | 1 | 0;
type SortMode = "date" | "points";

function BreakdownPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const resultsReady =
    pool.predictionState === "locked" && Object.keys(pool.results).length > 0;

  const pointFilters: { key: PointsFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: 3, label: "Exact (3)" },
    { key: 1, label: "Outcome (1)" },
    { key: 0, label: "Miss (0)" },
  ];

  const [pointsFilter, setPointsFilter] = useState<PointsFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [onlySimulated, setOnlySimulated] = useState(false);

  const rows = pool.visibleMatches.map((m) => {
    const pred = pool.getPrediction(m.id);
    const res = pool.results[m.id];
    const pts = res ? scorePrediction(pred, res) : undefined;

    return { match: m, pred, res, pts };
  });

  const filtered = rows
    .filter((r) => (onlySimulated ? Boolean(r.res) : true))
    .filter((r) => {
      if (pointsFilter === "all") return true;
      return r.pts === pointsFilter;
    })
    .sort((a, b) => {
      if (sortMode === "points") {
        const ap = a.pts ?? -1;
        const bp = b.pts ?? -1;
        return bp - ap;
      }

      return `${a.match.date} ${a.match.time}`.localeCompare(
        `${b.match.date} ${b.match.time}`,
      );
    });

  const counts = rows.reduce(
    (acc, r) => {
      if (!r.res) return acc;
      if (r.pts === 3) acc.exact += 1;
      else if (r.pts === 1) acc.outcome += 1;
      else acc.miss += 1;
      return acc;
    },
    { exact: 0, outcome: 0, miss: 0 },
  );

  return (
    <section>
      <PageIntro
        title="Scoring breakdown"
        description="Review match-by-match scoring outcomes, filter results and inspect prediction performance."
      />

      {!resultsReady && (
        <StatusBanner
          title="Breakdown is in preview mode."
          message="Simulate the group stage to see match-by-match scoring."
        />
      )}

      <div
        style={{
          marginBottom: "1.25rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          fontSize: "0.98rem",
        }}
      >
        Total points:{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {pool.myPoints}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        {pointFilters.map((f) => (
          <button
            key={String(f.key)}
            type="button"
            onClick={() => setPointsFilter(f.key)}
            style={{
              border: "1px solid #444",
              background: pointsFilter === f.key ? "#1f3a5a" : "#1f1f1f",
              color: "#fff",
              padding: "0.45rem 0.7rem",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {f.label}
          </button>
        ))}

        <select
          value={sortMode}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "date" || value === "points") {
              setSortMode(value);
            }
          }}
          style={{
            marginLeft: "auto",
            padding: "0.45rem 0.6rem",
            borderRadius: "10px",
            border: "1px solid #444",
            background: "#1f1f1f",
            color: "#fff",
            fontWeight: 700,
          }}
          aria-label="Sort breakdown"
        >
          <option value="date">Sort: Date</option>
          <option value="points">Sort: Points</option>
        </select>

        <label
          style={{
            display: "flex",
            gap: "0.4rem",
            alignItems: "center",
            color: "var(--text-secondary)",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={onlySimulated}
            onChange={(e) => setOnlySimulated(e.target.checked)}
          />
          Only simulated
        </label>
      </div>

      <div style={{ marginBottom: "1rem", fontWeight: 800 }}>
        Exact: {counts.exact} • Outcome: {counts.outcome} • Miss: {counts.miss}
      </div>

      <GroupTabs
        groups={pool.groups}
        selectedGroup={pool.selectedGroup}
        onChange={pool.setSelectedGroup}
      />

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="No matches found for this view."
            message="Try changing the group, filter, or simulated-only toggle."
          />
        ) : (
          filtered.map(({ match: m, pred, res, pts }) => (
            <div
              key={m.id}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
                padding: "1rem 1.1rem",
                marginBottom: "0.75rem",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                boxShadow: "var(--shadow-soft)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {m.homeTeam.name} vs {m.awayTeam.name}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  ({m.date} {m.time})
                </span>
              </div>

              <div
                style={{
                  marginTop: "0.6rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                }}
              >
                <div>
                  Prediction:{" "}
                  <strong
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {pred.home}–{pred.away}
                  </strong>
                </div>
                <div>
                  Result:{" "}
                  <strong
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {res ? `${res.home}–${res.away}` : "—"}
                  </strong>
                  {!res && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      (not simulated)
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Points: {res ? pts : "—"}
                {res && pts === 3 && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: "var(--color-success-600)",
                    }}
                  >
                    Exact
                  </span>
                )}
                {res && pts === 1 && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: "var(--color-warning-600)",
                    }}
                  >
                    Outcome
                  </span>
                )}
                {res && pts === 0 && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: "var(--color-error-600)",
                    }}
                  >
                    Miss
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default BreakdownPage;
