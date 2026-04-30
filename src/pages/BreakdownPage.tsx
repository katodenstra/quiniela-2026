import { useEffect, useMemo, useState, type ReactNode } from "react";
import EmptyState from "../components/EmptyState";
import PageIntro from "../components/PageIntro";
import ScrollableTabs from "../components/ScrollableTabs";
import { useNavigate } from "react-router-dom";
import {
  scorePrediction,
  type PoolState,
  type PredictionsByMatchId,
  type TournamentPhase,
} from "../state/usePoolState";
import type { GroupStageMatch } from "../data/worldcup";
import {
  getAllFriendPredictions,
  getFriends,
  type Friend,
} from "../api/mockApi";
import {
  getPhaseTitle,
  getPhaseScoringContexts,
  getResolvedScoringContexts,
  getTeamName,
  isPredictionSubmitted,
  scorableComparisonPhases,
  type ComparisonMatch,
} from "../utils/phaseScoring";
import {
  buildLeaderboardEntries,
  getNearbyLeaderboardEntries,
  sortLeaderboardEntries,
  type LeaderboardEntry,
} from "../utils/leaderboardRanking";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

type PointsFilter = "all" | 3 | 1 | 0;
type SortMode = "date" | "points";
type FriendPredictionsByPhase = Partial<
  Record<TournamentPhase, Record<string, PredictionsByMatchId>>
>;

type BreakdownRow = {
  match: ComparisonMatch;
  pred: { home: number | null; away: number | null };
  res: { home: number; away: number } | undefined;
  pts: number | undefined;
  hasPrediction: boolean;
};

const pointFilters: { key: PointsFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: 3, label: "Exact score" },
  { key: 1, label: "Outcome" },
  { key: 0, label: "Miss" },
];

function getFlagUrl(code?: string | null) {
  if (!code) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

function getTeamCode(match: ComparisonMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return "code" in team ? team.code : team.teamCode;
}

function getPhaseStatusTone(lines: string[]) {
  const joined = lines.join(" ").toLowerCase();

  if (joined.includes("completed") || joined.includes("waiting for results")) {
    return "positive" as const;
  }

  if (joined.includes("not available")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function DashboardCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: ReactNode;
  tone?: "neutral" | "positive" | "warning";
}) {
  const accent =
    tone === "positive"
      ? "rgba(12, 157, 97, 0.16)"
      : tone === "warning"
        ? "rgba(236, 45, 48, 0.16)"
        : "rgba(58, 112, 226, 0.16)";

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        padding: "1rem 1.1rem",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: `0 0 0 1px ${accent}, var(--shadow-soft)`,
      }}
    >
      <div
        style={{
          color: "var(--text-muted)",
          fontWeight: 700,
          fontSize: "0.82rem",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "var(--text-primary)",
          fontSize: "1.65rem",
          lineHeight: 1,
          fontWeight: 800,
          marginTop: "0.65rem",
        }}
      >
        {value}
      </div>
      {detail && (
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginTop: "0.45rem",
            lineHeight: 1.35,
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

const phaseOrder: TournamentPhase[] = [
  "groups",
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
];

function getPredictionProgress(
  phase: TournamentPhase,
  phaseContexts: ReturnType<typeof getPhaseScoringContexts>,
  predictionsByPhase: PoolState["predictions"],
) {
  const context = phaseContexts.find((item) => item.phase === phase);
  const total = context?.matches.length ?? 0;
  const completed =
    context?.matches.reduce((count, match) => {
      return (
        count +
        (isPredictionSubmitted(predictionsByPhase[phase]?.[match.id]) ? 1 : 0)
      );
    }, 0) ?? 0;

  return {
    completed,
    missing: Math.max(total - completed, 0),
    total,
  };
}

function getPredictionStatusDetail(
  currentPhase: TournamentPhase,
  phaseContexts: ReturnType<typeof getPhaseScoringContexts>,
  predictionsByPhase: PoolState["predictions"],
) {
  const currentContext = phaseContexts.find(
    (context) => context.phase === currentPhase,
  );
  const currentLabel = getPhaseTitle(currentPhase);
  const currentProgress = getPredictionProgress(
    currentPhase,
    phaseContexts,
    predictionsByPhase,
  );
  const nextPhase = phaseOrder[phaseOrder.indexOf(currentPhase) + 1];
  const nextContext = nextPhase
    ? phaseContexts.find((context) => context.phase === nextPhase)
    : undefined;
  const nextLabel = nextPhase ? getPhaseTitle(nextPhase) : null;
  const nextProgress =
    nextPhase !== undefined
      ? getPredictionProgress(nextPhase, phaseContexts, predictionsByPhase)
      : null;

  if (!currentContext?.isResolved) {
    if (!currentContext?.isAvailable) {
      return [`${currentLabel} is not available yet`];
    }

    if (currentProgress.missing > 0) {
      return [
        `You still have ${currentProgress.missing} ${
          currentProgress.missing === 1 ? "match" : "matches"
        } to predict in this phase`,
      ];
    }

    return [`${currentLabel} predictions are complete`, "Waiting for results"];
  }

  if (!nextPhase || !nextLabel) {
    return [
      `${currentLabel} completed`,
      "Tournament completion is not modeled yet",
    ];
  }

  if (!nextContext?.isAvailable) {
    return [`${currentLabel} completed`, `${nextLabel} is not available yet`];
  }

  if (nextProgress && nextProgress.missing > 0) {
    return [
      `${currentLabel} completed`,
      `You can now fill predictions for ${nextLabel}`,
      `You still have ${nextProgress.missing} ${
        nextProgress.missing === 1 ? "match" : "matches"
      } to predict in this phase`,
    ];
  }

  return [
    `${currentLabel} completed`,
    `${nextLabel} predictions are complete`,
    "Waiting for results",
  ];
}

function getCountryInsights(rows: BreakdownRow[]) {
  const pointsByCountry = new Map<string, number>();

  rows.forEach(({ match, res, pts }) => {
    if (!res || typeof pts !== "number") return;

    [getTeamName(match, "home"), getTeamName(match, "away")].forEach((country) => {
      pointsByCountry.set(country, (pointsByCountry.get(country) ?? 0) + pts);
    });
  });

  const sorted = Array.from(pointsByCountry.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return {
    best: sorted[0] ?? null,
    worst: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  };
}

function BreakdownPage({
  matches,
  pool,
}: {
  matches: GroupStageMatch[];
  pool: PoolState;
}) {
  const navigate = useNavigate();
  const [pointsFilter, setPointsFilter] = useState<PointsFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [onlySimulated, setOnlySimulated] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendPredictionsByPhase, setFriendPredictionsByPhase] =
    useState<FriendPredictionsByPhase>({});
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const { generatedFriendPredictions } = useFriendPredictions();

  useEffect(() => {
    let alive = true;

    async function loadLeaderboardContext() {
      setLeaderboardLoading(true);

      try {
        const [friendsData, predictionEntries] = await Promise.all([
          getFriends(),
          Promise.all(
            scorableComparisonPhases.map(async (phase) => {
              const apiPredictions = await getAllFriendPredictions(phase);
              const generatedPredictions =
                generatedFriendPredictions[phase] ?? {};

              return [
                phase,
                {
                  ...apiPredictions,
                  ...generatedPredictions,
                },
              ] as const;
            }),
          ),
        ]);

        if (!alive) return;
        setFriends(friendsData);
        setFriendPredictionsByPhase(Object.fromEntries(predictionEntries));
      } finally {
        if (alive) {
          setLeaderboardLoading(false);
        }
      }
    }

    loadLeaderboardContext();

    return () => {
      alive = false;
    };
  }, [generatedFriendPredictions]);

  const phaseContexts = useMemo(
    () => getPhaseScoringContexts(matches, pool.results),
    [matches, pool.results],
  );

  const resolvedPhaseContexts = useMemo(
    () => getResolvedScoringContexts(phaseContexts),
    [phaseContexts],
  );

  const resultsReady = resolvedPhaseContexts.length > 0;

  const leaderboard = useMemo(() => {
    return sortLeaderboardEntries(
      buildLeaderboardEntries({
        friends,
        myPredictions: pool.predictions,
        friendPredictionsByPhase,
        resolvedPhaseContexts,
        results: pool.results,
      }),
    );
  }, [
    friends,
    pool.predictions,
    friendPredictionsByPhase,
    resolvedPhaseContexts,
    pool.results,
  ]);

  const nearbyLeaderboard = useMemo(
    () => getNearbyLeaderboardEntries(leaderboard, "me"),
    [leaderboard],
  );

  const myLeaderboardEntry = leaderboard.find((entry) => entry.id === "me");
  const cumulativePoints = myLeaderboardEntry?.points ?? pool.myPoints;

  const rows = useMemo<BreakdownRow[]>(() => {
    return pool.visibleMatches.map((match) => {
      const pred = pool.predictions[pool.phase]?.[match.id] ?? {
        home: null,
        away: null,
      };
      const res = pool.results[match.id];
      const pts = res ? scorePrediction(pred, res) : undefined;
      const hasPrediction = pred.home !== null && pred.away !== null;

      return { match, pred, res, pts, hasPrediction };
    });
  }, [pool.visibleMatches, pool.predictions, pool.phase, pool.results]);

  const allScoredRows = useMemo<BreakdownRow[]>(() => {
    return resolvedPhaseContexts.flatMap((context) =>
      context.matches.map((match) => {
        const pred = pool.predictions[context.phase]?.[match.id] ?? {
          home: null,
          away: null,
        };
        const res = pool.results[match.id];
        const pts = res ? scorePrediction(pred, res) : undefined;
        const hasPrediction = pred.home !== null && pred.away !== null;

        return { match, pred, res, pts, hasPrediction };
      }),
    );
  }, [resolvedPhaseContexts, pool.predictions, pool.results]);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => (onlySimulated ? Boolean(row.res) : true))
      .filter((row) => {
        if (pointsFilter === "all") return true;
        return row.pts === pointsFilter;
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
  }, [rows, onlySimulated, pointsFilter, sortMode]);

  const counts = allScoredRows.reduce(
    (acc, row) => {
      if (!row.res) return acc;
      if (row.pts === 3) acc.exactScore += 1;
      else if (row.pts === 1) acc.outcome += 1;
      else acc.miss += 1;
      return acc;
    },
    { exactScore: 0, outcome: 0, miss: 0 },
  );

  const countryInsights = getCountryInsights(allScoredRows);
  const predictionStatusLines = useMemo(
    () =>
      getPredictionStatusDetail(pool.phase, phaseContexts, pool.predictions),
    [pool.phase, phaseContexts, pool.predictions],
  );

  const predictionStatusTone = useMemo(
    () => getPhaseStatusTone(predictionStatusLines),
    [predictionStatusLines],
  );

  if (!resultsReady) {
    return (
      <section>
        <PageIntro
          title="Scoring breakdown"
          description="Review exact hits, outcome hits, and missed predictions once results are available."
        />

        <EmptyState
          title="No breakdown available yet"
          message="Run a simulation first to unlock match-by-match scoring analysis."
        />
      </section>
    );
  }

  return (
    <section>
      <PageIntro
        title="Scoring breakdown"
        description="Review match-by-match scoring outcomes, filter results and inspect prediction performance."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1rem",
        }}
      >
        <DashboardCard
          label="Total points"
          value={cumulativePoints ?? "-"}
          detail="Cumulative score"
        />
        <DashboardCard
          label="Outcomes"
          value={counts.outcome}
          detail="Correct result"
          tone="positive"
        />
        <DashboardCard
          label="Exact scores"
          value={counts.exactScore}
          detail="Perfect picks"
          tone="positive"
        />
        <DashboardCard
          label="Misses"
          value={counts.miss}
          detail="No points"
          tone="warning"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.05fr) minmax(0, 0.95fr) minmax(0, 1fr)",
          gap: "0.9rem",
          marginBottom: "1.25rem",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "1rem 1.1rem",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "0.9rem",
            }}
          >
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "1rem",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Your current standing
            </div>
            <button
              type="button"
              onClick={() => navigate("/leaderboard")}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: "0.82rem",
                padding: "0.42rem 0.7rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              View full leaderboard
            </button>
          </div>

          {leaderboardLoading ? (
            <div style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
              Loading ranking context...
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {nearbyLeaderboard.map((entry: LeaderboardEntry) => {
                const rank =
                  leaderboard.findIndex((item) => item.id === entry.id) + 1;
                const isMe = entry.id === "me";

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "3rem minmax(0, 1fr) auto",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.65rem 0.75rem",
                      borderRadius: "14px",
                      border: "1px solid var(--border-subtle)",
                      background: isMe
                        ? "rgba(58, 112, 226, 0.14)"
                        : "rgba(255,255,255,0.035)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontWeight: 800,
                      }}
                    >
                      #{rank}
                    </div>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: isMe ? 800 : 600,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 800,
                      }}
                    >
                      {entry.points ?? "-"} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "1rem 1.1rem",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
          }}
        >
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Prediction status
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: "0.75rem",
              flex: 1,
              padding: "0.1rem 0",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                padding: "0.38rem 0.7rem",
                borderRadius: "999px",
                border: `1px solid ${
                  predictionStatusTone === "positive"
                    ? "rgba(12, 157, 97, 0.22)"
                    : predictionStatusTone === "warning"
                      ? "rgba(236, 45, 48, 0.22)"
                      : "rgba(58, 112, 226, 0.22)"
                }`,
                background:
                  predictionStatusTone === "positive"
                    ? "rgba(12, 157, 97, 0.10)"
                    : predictionStatusTone === "warning"
                      ? "rgba(236, 45, 48, 0.08)"
                      : "rgba(58, 112, 226, 0.10)",
                color: "var(--text-primary)",
                fontWeight: 800,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {getPhaseTitle(pool.phase)}
            </div>

            <div
              style={{
                color: "var(--text-secondary)",
                display: "grid",
                gap: "0.48rem",
                lineHeight: 1.4,
                fontSize: "0.96rem",
                justifyItems: "start",
                textAlign: "left",
              }}
            >
              {predictionStatusLines.map((line, index) => (
                <div
                  key={line}
                  style={{
                    color:
                      index === 0
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                    fontWeight: index === 0 ? 700 : 500,
                    maxWidth: "28ch",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "1rem 1.1rem",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
          }}
        >
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Country insights
          </div>

          <div
            style={{
              display: "grid",
              gap: "0.7rem",
              alignContent: "start",
              flex: 1,
            }}
          >
            <div
              style={{
                border: "1px solid rgba(12, 157, 97, 0.24)",
                borderRadius: "16px",
                padding: "0.8rem 0.85rem",
                background: "rgba(12, 157, 97, 0.12)",
              }}
            >
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Best country
              </div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  marginTop: "0.35rem",
                  lineHeight: 1.32,
                  maxWidth: "26ch",
                  margin: "0.35rem auto 0",
                }}
              >
                {countryInsights.best
                  ? `${countryInsights.best[1]} points from ${countryInsights.best[0]} matches`
                  : "No country data yet"}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(236, 45, 48, 0.24)",
                borderRadius: "16px",
                padding: "0.8rem 0.85rem",
                background: "rgba(236, 45, 48, 0.1)",
              }}
            >
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Toughest country
              </div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  marginTop: "0.35rem",
                  lineHeight: 1.32,
                  maxWidth: "26ch",
                  margin: "0.35rem auto 0",
                }}
              >
                {countryInsights.worst
                  ? `${countryInsights.worst[1]} points from ${countryInsights.worst[0]} matches`
                  : "No country data yet"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "20px",
          padding: "1rem 1.1rem",
          marginBottom: "1rem",
          background: "rgba(255,255,255,0.035)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem",
              borderRadius: "999px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {pointFilters.map((filter) => {
              const isActive = pointsFilter === filter.key;

              return (
                <button
                  key={String(filter.key)}
                  type="button"
                  onClick={() => setPointsFilter(filter.key)}
                  style={{
                    border: "none",
                    background: isActive
                      ? "rgba(58, 112, 226, 0.20)"
                      : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    padding: "0.5rem 0.8rem",
                    borderRadius: "999px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <label
            style={{
              display: "flex",
              gap: "0.45rem",
              alignItems: "center",
              color: "var(--text-secondary)",
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={onlySimulated}
              onChange={(event) => setOnlySimulated(event.target.checked)}
            />
            Only simulated
          </label>

          <select
            value={sortMode}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "date" || value === "points") {
                setSortMode(value);
              }
            }}
            style={{
              marginLeft: "auto",
              padding: "0.62rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
              fontWeight: 700,
              outline: "none",
            }}
            aria-label="Sort breakdown"
          >
            <option value="date">Sort: Date</option>
            <option value="points">Sort: Points</option>
          </select>
        </div>

        <ScrollableTabs ariaLabel="Breakdown group tabs">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              paddingRight: "0.25rem",
            }}
          >
            {pool.groups.map((group) => {
              const isActive = pool.selectedGroup === group;

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => pool.setSelectedGroup(group)}
                  style={{
                    border: isActive
                      ? "1px solid rgba(58, 112, 226, 0.34)"
                      : "1px solid var(--border-subtle)",
                    background: isActive
                      ? "rgba(58, 112, 226, 0.16)"
                      : "rgba(255,255,255,0.04)",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    padding: "0.72rem 1rem",
                    borderRadius: "999px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    boxShadow: isActive
                      ? "0 0 0 1px rgba(58, 112, 226, 0.06)"
                      : "none",
                  }}
                >
                  Group {group}
                </button>
              );
            })}
          </div>
        </ScrollableTabs>
      </div>

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
          filtered.map(({ match, pred, res, pts, hasPrediction }) => (
            <div
              key={match.id}
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
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: "0.45rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.55rem",
                    flexWrap: "wrap",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    {getFlagUrl(getTeamCode(match, "home")) && (
                      <img
                        src={getFlagUrl(getTeamCode(match, "home")) ?? undefined}
                        alt=""
                        width={22}
                        height={22}
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "999px",
                          objectFit: "cover",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    )}
                    <span>{getTeamName(match, "home")}</span>
                  </span>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                    vs
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    {getFlagUrl(getTeamCode(match, "away")) && (
                      <img
                        src={getFlagUrl(getTeamCode(match, "away")) ?? undefined}
                        alt=""
                        width={22}
                        height={22}
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "999px",
                          objectFit: "cover",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    )}
                    <span>{getTeamName(match, "away")}</span>
                  </span>
                </div>

                <div
                  style={{
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    fontSize: "0.95rem",
                  }}
                >
                  {match.date} {match.time}
                </div>
              </div>

              <div
                style={{
                  marginTop: "0.85rem",
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                }}
              >
                <div
                  style={{
                    padding: "0.55rem 0.75rem",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  Prediction:{" "}
                  <strong
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {hasPrediction ? `${pred.home}-${pred.away}` : "Not set"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "0.55rem 0.75rem",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  Result:{" "}
                  <strong
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {res ? `${res.home}-${res.away}` : "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "0.55rem 0.75rem",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-subtle)",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Points: {res ? pts : "-"}
                </div>

                {res && (
                  <div
                    style={{
                      padding: "0.55rem 0.75rem",
                      borderRadius: "14px",
                      border:
                        pts === 3
                          ? "1px solid rgba(12, 157, 97, 0.24)"
                          : pts === 1
                            ? "1px solid rgba(255, 173, 13, 0.24)"
                            : "1px solid rgba(236, 45, 48, 0.24)",
                      background:
                        pts === 3
                          ? "rgba(12, 157, 97, 0.14)"
                          : pts === 1
                            ? "rgba(255, 173, 13, 0.12)"
                            : "rgba(236, 45, 48, 0.12)",
                      color: "var(--text-primary)",
                      fontWeight: 800,
                    }}
                  >
                    {pts === 3 ? "Exact score" : pts === 1 ? "Outcome" : "Miss"}
                  </div>
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
