import { useEffect, useMemo, useState } from "react";
import { getFriends, getFriendPredictions, type Friend } from "../api/mockApi";
import {
  scorePrediction,
  usePoolState,
  type Prediction,
} from "../state/usePoolState";
import { useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import type { GroupStageMatch } from "../data/worldcup";
import { calculateGroupStandings } from "../data/standings";
import { getBestThirdPlacedTeams } from "../data/qualification";
import { generateRoundOf32 } from "../data/knockout";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

type Entry = {
  id: string;
  name: string;
  points: number | null;
  pointsByPhase: {
    groups: number;
    roundOf32: number;
  };
};

function computePhasePoints(
  phaseMatches: Array<{ id: number }>,
  predictionsByMatch: Record<number, Prediction> | undefined,
  resultsByMatch: Record<number, { home: number; away: number }>,
) {
  if (!predictionsByMatch) return 0;

  return phaseMatches.reduce((total, match) => {
    const pred = predictionsByMatch[match.id];
    const res = resultsByMatch[match.id];
    if (!pred || !res) return total;
    return total + scorePrediction(pred, res);
  }, 0);
}

function LeaderboardPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { generatedFriendPredictions } = useFriendPredictions();

  const generatedGroupFriendPredictions = useMemo(
    () => generatedFriendPredictions.groups ?? {},
    [generatedFriendPredictions],
  );

  const generatedRoundOf32FriendPredictions = useMemo(
    () => generatedFriendPredictions.roundOf32 ?? {},
    [generatedFriendPredictions],
  );

  const usingGeneratedPredictions =
    Object.keys(generatedGroupFriendPredictions).length > 0 ||
    Object.keys(generatedRoundOf32FriendPredictions).length > 0;

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

  const groupsResultsReady =
    matches.length > 0 &&
    matches.every((match) => pool.results[match.id] !== undefined);

  const standingsByGroup = groupsResultsReady
    ? Object.fromEntries(
        pool.groups.map((group) => [
          group,
          calculateGroupStandings(matches, pool.results, group),
        ]),
      )
    : {};

  const bestThirds = groupsResultsReady
    ? getBestThirdPlacedTeams(standingsByGroup)
    : [];

  const roundOf32Matches =
    groupsResultsReady && bestThirds.length >= 8
      ? generateRoundOf32(standingsByGroup, bestThirds)
      : [];

  const roundOf32ResultsReady =
    roundOf32Matches.length > 0 &&
    roundOf32Matches.every((match) => pool.results[match.id] !== undefined);

  const resultsReady = groupsResultsReady || roundOf32ResultsReady;

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

    const groupPoints = groupsResultsReady
      ? computePhasePoints(matches, pool.predictions.groups, pool.results)
      : 0;

    const roundOf32Points = roundOf32ResultsReady
      ? computePhasePoints(
          roundOf32Matches,
          pool.predictions.roundOf32,
          pool.results,
        )
      : 0;

    return {
      id: "me",
      name: "You",
      points: groupPoints + roundOf32Points,
      pointsByPhase: {
        groups: groupPoints,
        roundOf32: roundOf32Points,
      },
    };
  }, [
    resultsReady,
    groupsResultsReady,
    roundOf32ResultsReady,
    matches,
    roundOf32Matches,
    pool.predictions,
    pool.results,
  ]);

  const [friendEntries, setFriendEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!resultsReady) {
        setFriendEntries([]);
        return;
      }

      try {
        const entries: Entry[] = [];

        for (const f of friends) {
          const groupPredictions =
            generatedGroupFriendPredictions[f.id] ??
            (await getFriendPredictions(f.id, "groups"));

          const roundOf32Predictions =
            generatedRoundOf32FriendPredictions[f.id] ??
            (await getFriendPredictions(f.id, "roundOf32"));

          const groupPoints = groupsResultsReady
            ? computePhasePoints(matches, groupPredictions, pool.results)
            : 0;

          const roundOf32Points = roundOf32ResultsReady
            ? computePhasePoints(
                roundOf32Matches,
                roundOf32Predictions,
                pool.results,
              )
            : 0;

          entries.push({
            id: f.id,
            name: f.name,
            points: groupPoints + roundOf32Points,
            pointsByPhase: {
              groups: groupPoints,
              roundOf32: roundOf32Points,
            },
          });
        }

        if (!alive) return;
        setFriendEntries(entries);
      } catch (e: unknown) {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message : "Failed to compute leaderboard",
        );
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [
    friends,
    resultsReady,
    groupsResultsReady,
    roundOf32ResultsReady,
    matches,
    roundOf32Matches,
    pool.results,
    generatedGroupFriendPredictions,
    generatedRoundOf32FriendPredictions,
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
          this phase.
        </div>
      )}

      {loading ? (
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
          Loading leaderboard…
        </div>
      ) : error ? (
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

      {leaderboard.length === 0 ? (
        <EmptyState
          title="No leaderboard entries yet"
          message="Generate friend predictions or run a simulation to populate ranking data for this phase."
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

            return (
              <div
                key={e.id}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={() => {
                  if (!clickable) return;
                  navigate(`/friends/${e.id}`);
                }}
                onKeyDown={(ev) => {
                  if (!clickable) return;
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    navigate(`/friends/${e.id}`);
                  }
                }}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  padding: "1rem 1.1rem",
                  marginBottom: "0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: clickable ? "pointer" : "default",
                  background: isMe
                    ? "rgba(58, 112, 226, 0.12)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                  boxShadow: "var(--shadow-soft)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  transition:
                    "transform 140ms ease, border-color 140ms ease, background 140ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    minWidth: 0,
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

                  <div style={{ minWidth: 0 }}>
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
                        : `Groups: ${e.pointsByPhase.groups} • R32: ${e.pointsByPhase.roundOf32}`}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default LeaderboardPage;
