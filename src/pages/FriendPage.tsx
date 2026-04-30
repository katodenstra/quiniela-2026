import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getAllFriendPredictions,
  getFriends,
  type Friend,
} from "../api/mockApi";
import { scorePrediction } from "../state/usePoolState";
import type {
  PoolState,
  PredictionsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import { useApi } from "../hooks/useApi";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";
import {
  computePhasePoints,
  computeCumulativeTournamentPoints,
  computePointsByPhase,
  getPhaseScoringContexts,
  getResolvedScoringContexts,
  getTeamName,
  isPredictionSubmitted,
  scorableComparisonPhases,
  type PhaseScoringContext,
} from "../utils/phaseScoring";
import {
  buildLeaderboardEntries,
  getLeaderboardRank,
  sortLeaderboardEntries,
} from "../utils/leaderboardRanking";

type PredictionsBySupportedPhase = Partial<
  Record<TournamentPhase, PredictionsByMatchId>
>;
type AllFriendPredictionsByPhase = Partial<
  Record<TournamentPhase, Record<string, PredictionsByMatchId>>
>;

type ExpandedSections = Partial<Record<TournamentPhase, boolean>>;

function getDefaultExpandedSections(
  phaseContexts: PhaseScoringContext[],
  currentPhase: TournamentPhase,
): ExpandedSections {
  return Object.fromEntries(
    phaseContexts.map((context) => [
      context.phase,
      context.isAvailable && context.phase === currentPhase,
    ]),
  );
}

function FriendPage({
  matches,
  pool,
}: {
  matches: GroupStageMatch[];
  pool: PoolState;
}) {
  const { friendId: rawFriendId } = useParams<{ friendId: string }>();
  const friendId = useMemo(() => {
    if (!rawFriendId) return undefined;

    try {
      return decodeURIComponent(rawFriendId);
    } catch {
      return rawFriendId;
    }
  }, [rawFriendId]);
  const friendsApi = useApi<Friend[]>(getFriends, []);
  const { generatedFriendPredictions } = useFriendPredictions();
  const [friendPredictionsByPhase, setFriendPredictionsByPhase] =
    useState<PredictionsBySupportedPhase>({});
  const [allFriendPredictionsByPhase, setAllFriendPredictionsByPhase] =
    useState<AllFriendPredictionsByPhase>({});
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [predictionsRetryKey, setPredictionsRetryKey] = useState(0);
  const [compareOn, setCompareOn] = useState(true);
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const phaseContexts = useMemo(
    () => getPhaseScoringContexts(matches, pool.results),
    [matches, pool.results],
  );

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    () => getDefaultExpandedSections(phaseContexts, pool.phase),
  );

  useEffect(() => {
    setExpandedSections(getDefaultExpandedSections(phaseContexts, pool.phase));
  }, [phaseContexts, pool.phase]);

  useEffect(() => {
    let alive = true;

    async function loadPredictions() {
      if (!friendId) {
        setPredictionsError("Missing friendId");
        setPredictionsLoading(false);
        return;
      }

      setPredictionsLoading(true);
      setPredictionsError(null);

      try {
        const entries = await Promise.all(
          scorableComparisonPhases.map(async (phase) => {
            const apiPredictions = await getAllFriendPredictions(phase);
            const generatedPredictions = generatedFriendPredictions[phase] ?? {};

            return [
              phase,
              {
                ...apiPredictions,
                ...generatedPredictions,
              },
            ] as const;
          }),
        );

        if (!alive) return;
        const nextAllPredictions = Object.fromEntries(
          entries,
        ) as AllFriendPredictionsByPhase;

        setAllFriendPredictionsByPhase(nextAllPredictions);
        setFriendPredictionsByPhase(
          Object.fromEntries(
            scorableComparisonPhases.map((phase) => [
              phase,
              nextAllPredictions[phase]?.[friendId],
            ]),
          ),
        );
      } catch (e: unknown) {
        if (!alive) return;
        setPredictionsError(
          e instanceof Error ? e.message : "Failed to load friend predictions",
        );
      } finally {
        if (alive) {
          setPredictionsLoading(false);
        }
      }
    }

    loadPredictions();

    return () => {
      alive = false;
    };
  }, [friendId, generatedFriendPredictions, predictionsRetryKey]);

  const friend = useMemo(() => {
    if (!friendId || !friendsApi.data) return null;
    return friendsApi.data.find((f) => f.id === friendId) ?? null;
  }, [friendsApi.data, friendId]);

  const loading = friendsApi.loading || predictionsLoading;
  const error = friendsApi.error || predictionsError;

  const resolvedPhaseContexts = useMemo(
    () => getResolvedScoringContexts(phaseContexts),
    [phaseContexts],
  );

  const resultsReady = resolvedPhaseContexts.length > 0;

  const phaseSections = useMemo(() => {
    return phaseContexts.map((context) => {
      const friendPredictions = friendPredictionsByPhase[context.phase];
      const myPredictions = pool.predictions[context.phase];
      const friendPoints = context.isResolved
        ? computePhasePoints(context.matches, friendPredictions, pool.results)
        : null;
      const myPoints = context.isResolved
        ? computePhasePoints(context.matches, myPredictions, pool.results)
        : null;

      const rows = context.matches.map((match) => {
        const friendPred = friendPredictions?.[match.id];
        const myPred = myPredictions?.[match.id];
        const res = pool.results[match.id];
        const hasFriendPrediction = isPredictionSubmitted(friendPred);
        const hasMyPrediction = isPredictionSubmitted(myPred);
        const isDiff =
          hasFriendPrediction &&
          hasMyPrediction &&
          (friendPred.home !== myPred.home || friendPred.away !== myPred.away);
        const isSame = hasFriendPrediction && hasMyPrediction && !isDiff;
        const pts =
          hasFriendPrediction && res ? scorePrediction(friendPred, res) : null;
        const friendScoreText = hasFriendPrediction
          ? `${friendPred.home}-${friendPred.away}`
          : "-";
        const myScoreText = hasMyPrediction
          ? `${myPred.home}-${myPred.away}`
          : "-";

        return {
          match,
          res,
          pts,
          isDiff,
          isSame,
          hasFriendPrediction,
          hasMyPrediction,
          friendScoreText,
          myScoreText,
        };
      });

      return {
        ...context,
        friendPoints,
        myPoints,
        sameCount: rows.reduce(
          (count, row) => count + (row.isSame ? 1 : 0),
          0,
        ),
        differentCount: rows.reduce(
          (count, row) => count + (row.isDiff ? 1 : 0),
          0,
        ),
        rows,
      };
    });
  }, [phaseContexts, friendPredictionsByPhase, pool.predictions, pool.results]);

  const friendTotal = useMemo(() => {
    if (!resultsReady) return null;

    const pointsByPhase = computePointsByPhase(
      resolvedPhaseContexts,
      friendPredictionsByPhase,
      pool.results,
    );
    return computeCumulativeTournamentPoints(pointsByPhase);
  }, [
    friendPredictionsByPhase,
    pool.results,
    resolvedPhaseContexts,
    resultsReady,
  ]);

  const leaderboard = useMemo(() => {
    return sortLeaderboardEntries(
      buildLeaderboardEntries({
        friends: friendsApi.data ?? [],
        myPredictions: pool.predictions,
        friendPredictionsByPhase: allFriendPredictionsByPhase,
        resolvedPhaseContexts,
        results: pool.results,
      }),
    );
  }, [
    friendsApi.data,
    pool.predictions,
    allFriendPredictionsByPhase,
    resolvedPhaseContexts,
    pool.results,
  ]);

  const friendRank = friendId ? getLeaderboardRank(leaderboard, friendId) : null;

  if (loading) {
    return (
      <section>
        <PageIntro
          title={friend?.name ?? "Friend"}
          description="Compare predictions match by match and review scoring outcomes."
        />
        <div
          className="widget"
          style={{
            color: "var(--text-secondary)",
            marginBottom: "1rem",
            fontWeight: 500,
            padding: "1rem 1.1rem",
            borderRadius: "18px",
          }}
        >
          Loading friend details...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <PageIntro
          title="Friend"
          description="Compare predictions match by match and review scoring outcomes."
        />
        <StatusBanner title="Could not load friend details." message={error} />
        <Button
          variant="ghost"
          onClick={() => {
            friendsApi.refetch();
            setFriendPredictionsByPhase({});
            setAllFriendPredictionsByPhase({});
            setPredictionsRetryKey((key) => key + 1);
          }}
        >
          Retry
        </Button>
      </section>
    );
  }

  if (!friend) {
    return (
      <section>
        <PageIntro
          title="Friend"
          description="Compare predictions match by match and review scoring outcomes."
        />
        <StatusBanner
          title="Friend not found."
          message="This profile may no longer be available."
        />
      </section>
    );
  }

  return (
    <section>
      <PageIntro
        title={friend.name}
        description="Compare predictions by phase and review cumulative scoring outcomes."
      />

      <div
        style={{
          marginBottom: "1rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          fontSize: "0.98rem",
        }}
      >
        Total points:{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {friendTotal === null ? "-" : friendTotal}
        </span>
        <span style={{ color: "var(--text-muted)", margin: "0 0.45rem" }}>
          •
        </span>
        Rank{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {friendRank === null ? "-" : `#${friendRank}`}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1.25rem",
          padding: "0.9rem 1rem",
          border: "1px solid var(--border-subtle)",
          borderRadius: "18px",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: "0.45rem",
            alignItems: "center",
            fontWeight: 600,
            color: "var(--text-secondary)",
            opacity: compareOn ? 1 : 0.55,
          }}
        >
          <input
            type="checkbox"
            checked={compareOn}
            onChange={(e) => setCompareOn(e.target.checked)}
          />
          Compare with me
        </label>

        <label
          style={{
            display: "flex",
            gap: "0.45rem",
            alignItems: "center",
            fontWeight: 600,
            color: "var(--text-secondary)",
            opacity: compareOn ? 1 : 0.55,
          }}
        >
          <input
            type="checkbox"
            checked={onlyDiffs}
            onChange={(e) => setOnlyDiffs(e.target.checked)}
            disabled={!compareOn}
          />
          Show only differences
        </label>
      </div>

      {!resultsReady && (
        <StatusBanner
          title="Comparison is in preview mode."
          message="Simulate a phase to compare predictions and see scoring."
        />
      )}

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {phaseSections.map((section) => {
          const isExpanded = expandedSections[section.phase] ?? false;
          const visibleRows =
            onlyDiffs && compareOn
              ? section.rows.filter((row) => row.isDiff)
              : section.rows;

          return (
            <div
              key={section.phase}
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                marginBottom: "0.9rem",
                background: section.isAvailable
                  ? "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))"
                  : "rgba(255,255,255,0.025)",
                boxShadow: section.isAvailable ? "var(--shadow-soft)" : "none",
                opacity: section.isAvailable ? 1 : 0.58,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                disabled={!section.isAvailable}
                aria-expanded={section.isAvailable ? isExpanded : undefined}
                onClick={() =>
                  setExpandedSections((prev) => ({
                    ...prev,
                    [section.phase]: !(prev[section.phase] ?? false),
                  }))
                }
                style={{
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  color: "inherit",
                  padding: "1rem 1.1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  cursor: section.isAvailable ? "pointer" : "not-allowed",
                  textAlign: "left",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.35rem",
                      flexWrap: "wrap",
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  >
                    <span>{section.title}</span>
                    <span style={{ color: "var(--text-muted)" }}>-</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {section.isAvailable
                        ? `${section.matches.length} matches`
                        : "Unavailable"}
                    </span>
                  </div>

                  {compareOn && section.isAvailable && (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.9rem",
                        marginTop: "0.28rem",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.45rem",
                        lineHeight: 1.35,
                      }}
                    >
                      <span>You made {section.myPoints ?? "-"} points</span>
                      <span>Same picks: {section.sameCount}</span>
                      <span>Different picks: {section.differentCount}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: "3.2rem",
                      padding: "0.15rem 0",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 800,
                        fontSize: "1.35rem",
                        lineHeight: 1,
                      }}
                    >
                      {section.friendPoints ?? "-"}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                        marginTop: "0.18rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      pts
                    </div>
                  </div>
                  <span
                    style={{
                      width: "2.1rem",
                      height: "2.1rem",
                      borderRadius: "999px",
                      display: "grid",
                      placeItems: "center",
                      border: "1px solid var(--border-subtle)",
                      background: section.isAvailable
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                      color: "var(--text-secondary)",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition:
                        "transform 140ms ease, background 140ms ease, border-color 140ms ease",
                    }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-rounded">
                      expand_more
                    </span>
                  </span>
                </div>
              </button>

              {section.isAvailable && isExpanded && (
                <div style={{ padding: "0 1.1rem 1rem" }}>
                  {visibleRows.length === 0 ? (
                    <EmptyState
                      title="No matches to compare."
                      message={
                        onlyDiffs
                          ? "There are no prediction differences for this phase."
                          : "This friend has no predictions available for this phase."
                      }
                    />
                  ) : (
                    visibleRows.map(
                      ({
                        match,
                        res,
                        pts,
                        isDiff,
                        hasFriendPrediction,
                        hasMyPrediction,
                        friendScoreText,
                        myScoreText,
                      }) => (
                        <div
                          key={match.id}
                          style={{
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "18px",
                            padding: "1rem",
                            marginBottom: "0.85rem",
                            background: "rgba(255,255,255,0.035)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "0.9rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                lineHeight: 1.35,
                              }}
                            >
                              {getTeamName(match, "home")} vs{" "}
                              {getTeamName(match, "away")}{" "}
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontWeight: 500,
                                }}
                              >
                                ({match.date} {match.time})
                              </span>
                            </div>

                            {!hasFriendPrediction ? (
                              <span
                                style={{
                                  border: "1px solid var(--border-subtle)",
                                  padding: "0.3rem 0.65rem",
                                  borderRadius: "999px",
                                  fontWeight: 700,
                                  background: "rgba(255,255,255,0.06)",
                                  color: "var(--text-secondary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Not submitted
                              </span>
                            ) : compareOn && hasMyPrediction ? (
                              <span
                                style={{
                                  border: isDiff
                                    ? "1px solid rgba(236, 45, 48, 0.24)"
                                    : "1px solid rgba(12, 157, 97, 0.24)",
                                  padding: "0.3rem 0.65rem",
                                  borderRadius: "999px",
                                  fontWeight: 700,
                                  background: isDiff
                                    ? "rgba(236, 45, 48, 0.14)"
                                    : "rgba(12, 157, 97, 0.18)",
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isDiff ? "Different" : "Same"}
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              marginTop: "0.75rem",
                              display: "flex",
                              gap: "0.75rem",
                              flexWrap: "wrap",
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
                              Friend:{" "}
                              <strong
                                style={{
                                  color: "var(--text-primary)",
                                  fontWeight: 600,
                                }}
                              >
                                {friendScoreText}
                              </strong>
                            </div>

                            {compareOn && (
                              <div
                                style={{
                                  padding: "0.55rem 0.75rem",
                                  borderRadius: "14px",
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                You:{" "}
                                <strong
                                  style={{
                                    color: "var(--text-primary)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {myScoreText}
                                </strong>
                              </div>
                            )}

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
                                style={{
                                  color: "var(--text-primary)",
                                  fontWeight: 600,
                                }}
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
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              Points: {pts ?? "-"}
                            </div>
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FriendPage;
