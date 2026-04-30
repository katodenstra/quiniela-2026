import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getFriends, getFriendPredictions, type Friend } from "../api/mockApi";
import { usePoolState, type TournamentPhase } from "../state/usePoolState";
import { Link } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";
import {
  computePhasePoints,
  getPhaseScoringContexts,
  scorableComparisonPhases,
} from "../utils/phaseScoring";

type Entry = {
  id: string;
  name: string;
  points: number | null;
  pointsByPhase: Partial<Record<TournamentPhase, number>>;
};

function LeaderboardPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { generatedFriendPredictions } = useFriendPredictions();

  const usingGeneratedPredictions = scorableComparisonPhases.some(
    (phase) => Object.keys(generatedFriendPredictions[phase] ?? {}).length > 0,
  );

  useEffect(() => {
    let alive = true;

    getFriends()
      .then((data) => {
        if (!alive) return;
        setFriends(data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load friends");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const phaseContexts = useMemo(
    () => getPhaseScoringContexts(matches, pool.results),
    [matches, pool.results],
  );

  const resolvedPhaseContexts = useMemo(
    () =>
      phaseContexts.filter(
        (context) =>
          scorableComparisonPhases.includes(context.phase) &&
          context.isResolved,
      ),
    [phaseContexts],
  );

  const resultsReady = resolvedPhaseContexts.length > 0;

  const myEntry: Entry = useMemo(() => {
    if (!resultsReady) {
      return {
        id: "me",
        name: "You",
        points: null,
        pointsByPhase: {
          groups: 0,
          roundOf32: 0,
        },
      };
    }

    const pointsByPhase = Object.fromEntries(
      resolvedPhaseContexts.map((context) => [
        context.phase,
        computePhasePoints(
          context.matches,
          pool.predictions[context.phase],
          pool.results,
        ),
      ]),
    ) as Partial<Record<TournamentPhase, number>>;

    const totalPoints = Object.values(pointsByPhase).reduce(
      (total, points) => total + (points ?? 0),
      0,
    );

    return {
      id: "me",
      name: "You",
      points: totalPoints,
      pointsByPhase,
    };
  }, [resultsReady, resolvedPhaseContexts, pool.predictions, pool.results]);

  const [friendEntries, setFriendEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!resultsReady) {
        setFriendEntries([]);
        setEntriesLoading(false);
        return;
      }

      try {
        setEntriesLoading(true);

        const entries = await Promise.all(
          friends.map(async (f) => {
            const predictionsByPhase = await Promise.all(
              resolvedPhaseContexts.map(async (context) => {
                const generated =
                  generatedFriendPredictions[context.phase]?.[f.id];
                const predictions =
                  generated ??
                  (await getFriendPredictions(f.id, context.phase));

                return [context.phase, predictions] as const;
              }),
            );

            const pointsByPhase = Object.fromEntries(
              predictionsByPhase.map(([phase, predictions]) => {
                const context = resolvedPhaseContexts.find(
                  (item) => item.phase === phase,
                );

                return [
                  phase,
                  context
                    ? computePhasePoints(
                        context.matches,
                        predictions,
                        pool.results,
                      )
                    : 0,
                ];
              }),
            ) as Partial<Record<TournamentPhase, number>>;

            const totalPoints = Object.values(pointsByPhase).reduce(
              (total, points) => total + (points ?? 0),
              0,
            );

            return {
              id: f.id,
              name: f.name,
              points: totalPoints,
              pointsByPhase,
            };
          }),
        );

        if (!alive) return;
        setFriendEntries(entries);
      } catch (e: unknown) {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : "Failed to compute leaderboard",
        );
      } finally {
        if (alive) {
          setEntriesLoading(false);
        }
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [
    friends,
    resultsReady,
    resolvedPhaseContexts,
    pool.results,
    generatedFriendPredictions,
  ]);

  const leaderboard = useMemo(() => {
    const all = [myEntry, ...friendEntries];
    // null points (not simulated) should stay at bottom
    return all.sort((a, b) => {
      const ap = a.points ?? -1;
      const bp = b.points ?? -1;
      return bp - ap;
    });
  }, [myEntry, friendEntries]);

  const isLeaderboardLoading = loading || entriesLoading;

  function getRankLabel(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  }

  return (
    <section>
      <PageIntro
        title="Leaderboard"
        description="Track ranking, compare performance and jump into friend prediction details."
      />

      {!resultsReady && (
        <StatusBanner
          title="Leaderboard is in preview mode."
          message="Simulate the group stage to start ranking everyone. Knockout phases will add to the total."
        />
      )}

      {resultsReady && usingGeneratedPredictions && (
        <div
          className="widget"
          style={{
            marginBottom: "1rem",
            padding: "0.95rem 1rem",
            borderRadius: "18px",
            color: "var(--text-secondary)",
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          Leaderboard is currently using generated friend prediction data for
          available phases.
        </div>
      )}

      {error ? (
        <>
          <StatusBanner
            title="Could not load leaderboard data."
            message={error}
          />
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </>
      ) : null}

      {isLeaderboardLoading ? (
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            width: "100%",
          }}
          aria-label="Loading leaderboard"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "1rem 1.1rem",
                marginBottom: "0.85rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.9rem",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: "42%",
                      height: "0.85rem",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.1)",
                    }}
                  />
                  <div
                    style={{
                      width: "64%",
                      height: "0.7rem",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.07)",
                      marginTop: "0.55rem",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  width: "3rem",
                  height: "1.4rem",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.09)",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <EmptyState
          title="No leaderboard entries yet"
          message="Generate friend predictions or run a simulation to populate ranking data."
        />
      ) : (
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {leaderboard.map((e, index) => {
            const isMe = e.id === "me";
            const clickable = !isMe;
            const rowContent = (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.9rem",
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      borderRadius: "999px",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getRankLabel(index)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {e.name} {isMe ? "(You)" : ""}
                    </div>

                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        marginTop: "0.15rem",
                      }}
                    >
                      {e.points === null
                        ? "Waiting for simulation"
                        : `Groups: ${e.pointsByPhase.groups ?? 0} • R32: ${
                            e.pointsByPhase.roundOf32 ?? 0
                          }`}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    flexShrink: 0,
                    marginLeft: "1rem",
                  }}
                >
                  <div
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {e.points === null ? "—" : e.points}
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      marginTop: "0.1rem",
                    }}
                  >
                    pts
                  </div>
                </div>
              </>
            );

            const rowStyle: CSSProperties = {
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1rem 1.1rem",
              marginBottom: "0.85rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              cursor: clickable ? "pointer" : "default",
              background: isMe
                ? "rgba(58, 112, 226, 0.12)"
                : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              boxShadow: "var(--shadow-soft)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition:
                "transform 140ms ease, border-color 140ms ease, background 140ms ease",
            };

            return clickable ? (
              <Link
                key={e.id}
                to={`/friends/${encodeURIComponent(e.id)}`}
                style={{
                  ...rowStyle,
                  color: "inherit",
                  font: "inherit",
                  width: "100%",
                  textAlign: "inherit",
                  textDecoration: "none",
                }}
              >
                {rowContent}
              </Link>
            ) : (
              <div
                key={e.id}
                style={rowStyle}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default LeaderboardPage;
