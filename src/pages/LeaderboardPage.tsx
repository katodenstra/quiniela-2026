import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getFriends, getFriendPredictions, type Friend } from "../api/mockApi";
import type {
  PoolState,
  PredictionsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import { Link } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import LeaderboardConfetti from "../components/LeaderboardConfetti";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";
import {
  computeCumulativeTournamentPoints,
  computePointsByPhase,
  getPhaseScoringContexts,
  scorableComparisonPhases,
} from "../utils/phaseScoring";
import {
  sortLeaderboardEntries,
  type LeaderboardEntry,
} from "../utils/leaderboardRanking";

const pageSize = 10;

function getPlaceLabel(place: 1 | 2 | 3) {
  if (place === 1) return "1st place";
  if (place === 2) return "2nd place";
  return "3rd place";
}

function getPlaceTrophyColor(place: 1 | 2 | 3) {
  if (place === 1) return "#FFD700";
  if (place === 2) return "#C0C0C0";
  return "#CD7F32";
}

function PodiumCard({
  entry,
  place,
  height,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  height: string;
}) {
  const isFirstPlace = place === 1;
  const trophyColor = getPlaceTrophyColor(place);
  const borderColor =
    place === 1
      ? "rgba(255, 215, 0, 0.38)"
      : place === 2
        ? "rgba(192, 192, 192, 0.3)"
        : "rgba(205, 127, 50, 0.32)";
  const backgroundTone =
    place === 1
      ? "rgba(255, 215, 0, 0.12)"
      : place === 2
        ? "rgba(192, 192, 192, 0.09)"
        : "rgba(205, 127, 50, 0.1)";

  return (
    <Link
      to={`/friends/${encodeURIComponent(entry.id)}`}
      state={{
        from: {
          pathname: "/leaderboard",
          label: "Leaderboard",
        },
      }}
      style={{
        minHeight: height,
        border: `1px solid ${borderColor}`,
        borderRadius: "22px",
        padding: isFirstPlace ? "1.15rem" : "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.85rem",
        textAlign: "center",
        color: "inherit",
        textDecoration: "none",
        background: `linear-gradient(180deg, ${backgroundTone}, rgba(255,255,255,0.02))`,
        boxShadow: isFirstPlace ? "var(--shadow-soft)" : "none",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        transition:
          "transform 140ms ease, border-color 140ms ease, background 140ms ease",
      }}
    >
      <div
        style={{
          width: isFirstPlace ? "4rem" : "3.5rem",
          height: isFirstPlace ? "4rem" : "3.5rem",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          background: isFirstPlace
            ? "rgba(58, 112, 226, 0.18)"
            : "rgba(255,255,255,0.06)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontSize: isFirstPlace ? "1.15rem" : "1rem",
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {entry.name.slice(0, 2).toUpperCase()}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "var(--text-primary)",
            fontSize: isFirstPlace ? "1.08rem" : "1rem",
            fontWeight: 800,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            marginTop: "0.35rem",
            color: isFirstPlace ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "0.88rem",
            fontWeight: 700,
          }}
        >
          {getPlaceLabel(place)}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          display: "grid",
          gap: "0.7rem",
          alignContent: "end",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "0.65rem",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              height: "1px",
              background: trophyColor,
              opacity: 0.5,
              width: "100%",
            }}
          />
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{
              color: trophyColor,
              fontSize: isFirstPlace ? "2.5rem" : "2rem",
              lineHeight: 1,
            }}
          >
            trophy
          </span>
          <span
            aria-hidden="true"
            style={{
              height: "1px",
              background: trophyColor,
              opacity: 0.5,
              width: "100%",
            }}
          />
        </div>

        <div
          style={{
            color: "var(--text-secondary)",
            fontWeight: 800,
            lineHeight: 1.25,
            textAlign: "center",
          }}
        >
          {entry.points === null ? "—" : `${entry.points} points`}
        </div>
      </div>
    </Link>
  );
}

function LeaderboardPage({
  matches,
  pool,
}: {
  matches: GroupStageMatch[];
  pool: PoolState;
}) {
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

  const scorablePhaseContexts = useMemo(
    () =>
      phaseContexts.filter((context) =>
        context.matches.some((match) => pool.results[match.id] !== undefined),
      ),
    [phaseContexts, pool.results],
  );

  const resultsReady = scorablePhaseContexts.length > 0;

  const myEntry: LeaderboardEntry = useMemo(() => {
    if (!resultsReady) {
      return {
        id: "me",
        name: "You",
        points: null,
        pointsByPhase: {},
      };
    }

    const pointsByPhase = computePointsByPhase(
      scorablePhaseContexts,
      pool.predictions,
      pool.results,
    );

    return {
      id: "me",
      name: "You",
      points: computeCumulativeTournamentPoints(pointsByPhase),
      pointsByPhase,
    };
  }, [resultsReady, scorablePhaseContexts, pool.predictions, pool.results]);

  const [friendEntries, setFriendEntries] = useState<LeaderboardEntry[]>([]);

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
              scorablePhaseContexts.map(async (context) => {
                const generated =
                  generatedFriendPredictions[context.phase]?.[f.id];
                const predictions =
                  generated ??
                  (await getFriendPredictions(f.id, context.phase));

                return [context.phase, predictions] as const;
              }),
            );

            const predictionsByScorablePhase = Object.fromEntries(
              predictionsByPhase,
            ) as Partial<Record<TournamentPhase, PredictionsByMatchId>>;
            const pointsByPhase = computePointsByPhase(
              scorablePhaseContexts,
              predictionsByScorablePhase,
              pool.results,
            );

            return {
              id: f.id,
              name: f.name,
              points: computeCumulativeTournamentPoints(pointsByPhase),
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
    scorablePhaseContexts,
    pool.results,
    generatedFriendPredictions,
  ]);

  const leaderboard = useMemo(() => {
    return sortLeaderboardEntries([myEntry, ...friendEntries]);
  }, [myEntry, friendEntries]);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredLeaderboard = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return leaderboard;

    return leaderboard.filter((entry) =>
      entry.name.toLowerCase().includes(normalizedQuery),
    );
  }, [leaderboard, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const isLeaderboardLoading = loading || entriesLoading;

  function getRankLabel(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  }

  const toolbarControlStyle: CSSProperties = {
    border: "1px solid var(--border-subtle)",
    borderRadius: "999px",
    padding: "0.78rem 1rem",
    background: "rgba(255,255,255,0.05)",
    color: "var(--text-primary)",
    outline: "none",
    fontWeight: 500,
    fontSize: "0.96rem",
    lineHeight: 1.2,
    minWidth: 0,
    boxSizing: "border-box",
  };

  const podiumEntries = leaderboard.slice(0, 3);
  const podiumEntryIds = new Set(podiumEntries.map((entry) => entry.id));
  const leaderboardWithoutPodium = filteredLeaderboard.filter(
    (entry) => !podiumEntryIds.has(entry.id),
  );
  const pageCount = Math.ceil(leaderboardWithoutPodium.length / pageSize);
  const safePage = pageCount === 0 ? 1 : Math.min(page, pageCount);
  const rangeStart =
    leaderboardWithoutPodium.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safePage * pageSize,
    leaderboardWithoutPodium.length,
  );
  const paginatedLeaderboard = leaderboardWithoutPodium.slice(
    rangeStart === 0 ? 0 : rangeStart - 1,
    rangeEnd,
  );

  return (
    <section>
      <LeaderboardConfetti />

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
            maxWidth: "960px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div
            className="widget"
            style={{
              padding: "1rem",
              borderRadius: "22px",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "0.9rem",
              }}
            >
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                Ranking table
              </div>
            </div>

            {podiumEntries.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "0.85rem",
                  alignItems: "end",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  {podiumEntries[1] ? (
                    <PodiumCard
                      entry={podiumEntries[1]}
                      place={2}
                      height="13.25rem"
                    />
                  ) : null}
                </div>
                <div>
                  {podiumEntries[0] ? (
                    <PodiumCard
                      entry={podiumEntries[0]}
                      place={1}
                      height="15rem"
                    />
                  ) : null}
                </div>
                <div>
                  {podiumEntries[2] ? (
                    <PodiumCard
                      entry={podiumEntries[2]}
                      place={3}
                      height="12.25rem"
                    />
                  ) : null}
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "0.7rem",
                alignItems: "center",
                marginBottom: "0.95rem",
              }}
            >
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search leaderboard"
                aria-label="Search leaderboard"
                style={toolbarControlStyle}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.55rem",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                  }}
                >
                  Sort by:
                </span>

                <span
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    minWidth: "220px",
                  }}
                >
                  <select
                    value="pointsDesc"
                    aria-label="Sort leaderboard"
                    style={{
                      ...toolbarControlStyle,
                      width: "100%",
                      paddingRight: "2.5rem",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                    }}
                  >
                    <option value="pointsDesc">Points descending</option>
                  </select>

                  <span
                    className="material-symbols-rounded"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: "0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-secondary)",
                      fontSize: "1.15rem",
                      pointerEvents: "none",
                    }}
                  >
                    expand_more
                  </span>
                </span>
              </label>
            </div>

            {paginatedLeaderboard.length === 0 ? (
              <EmptyState
                title="No leaderboard matches"
                message="Try a different search to find ranking entries."
              />
            ) : (
              <div>
                {paginatedLeaderboard.map((e) => {
                  const absoluteIndex = leaderboard.findIndex(
                    (entry) => entry.id === e.id,
                  );
                  const isMe = e.id === "me";
                  const clickable = !isMe;

                  const rowContent = (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
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
                          {getRankLabel(absoluteIndex)}
                        </div>

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
                          {e.name.slice(0, 2).toUpperCase()}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-primary)",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              minWidth: 0,
                            }}
                          >
                            {e.name} {isMe ? "(You)" : ""}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              width: "1.9rem",
                              height: "1.9rem",
                              borderRadius: "999px",
                              display: "grid",
                              placeItems: "center",
                              border: "1px solid var(--border-subtle)",
                              background: "rgba(255,255,255,0.04)",
                              color: "var(--text-secondary)",
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-rounded">
                              chevron_right
                            </span>
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(100px, auto)",
                          justifyItems: "end",
                          color: "var(--text-secondary)",
                          fontSize: "0.96rem",
                          lineHeight: 1.25,
                          whiteSpace: "nowrap",
                          marginLeft: "1rem",
                          flexShrink: 0,
                          fontWeight: 700,
                        }}
                      >
                        <span>
                          {e.points === null ? "—" : `${e.points} points`}
                        </span>
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
                      state={{
                        from: {
                          pathname: "/leaderboard",
                          label: "Leaderboard",
                        },
                      }}
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
                    <div key={e.id} style={rowStyle}>
                      {rowContent}
                    </div>
                  );
                })}
              </div>
            )}

            {pageCount > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.8rem",
                  marginTop: "0.2rem",
                }}
              >
                <Button
                  variant="ghost"
                  disabled={safePage === 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                >
                  Previous
                </Button>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                  }}
                >
                  Page {safePage} of {pageCount}
                </div>
                <Button
                  variant="ghost"
                  disabled={safePage === pageCount}
                  onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default LeaderboardPage;
