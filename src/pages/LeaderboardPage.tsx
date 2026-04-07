import { useEffect, useMemo, useState } from "react";
import { getFriends, getFriendPredictions, type Friend } from "../api/mockApi";
import { scorePrediction, usePoolState } from "../state/usePoolState";
import { useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

type Entry = { id: string; name: string; points: number | null };

function LeaderboardPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { generatedFriendPredictions } = useFriendPredictions();
  const phaseFriendPredictions = useMemo(
    () => generatedFriendPredictions[pool.phase] ?? {},
    [generatedFriendPredictions, pool.phase],
  );

  const usingGeneratedPredictions = Object.keys(phaseFriendPredictions).length > 0;

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

  const resultsReady =
    pool.predictionState === "locked" && Object.keys(pool.results).length > 0;

  const myEntry: Entry = useMemo(() => {
    if (!resultsReady) return { id: "me", name: "You", points: null };
    return { id: "me", name: "You", points: pool.myPoints };
  }, [resultsReady, pool.myPoints]);

  const [friendEntries, setFriendEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!resultsReady) {
        setFriendEntries([]);
        return;
      }

      try {
        const hasGeneratedPredictions = usingGeneratedPredictions;

        const entries: Entry[] = [];
        for (const f of friends) {
          const preds = hasGeneratedPredictions
            ? (phaseFriendPredictions[f.id] ?? {})
            : await getFriendPredictions(f.id, pool.phase);

          const pts = matches.reduce((total, m) => {
            const pred = preds[m.id];
            const res = pool.results[m.id];
            if (!pred || !res) return total;
            return total + scorePrediction(pred, res);
          }, 0);

          entries.push({ id: f.id, name: f.name, points: pts });
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
    matches,
    pool.phase,
    pool.results,
    phaseFriendPredictions,
    usingGeneratedPredictions,
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
          message="Simulate the group stage to rank everyone and compute points."
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
          Leaderboard is currently using generated friend prediction data for this phase.
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
                        : clickable
                          ? "View prediction details"
                          : "Your current standing"}
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
