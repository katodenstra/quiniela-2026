import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getFriends, getFriendPredictions, type Friend } from "../api/mockApi";
import { scorePrediction, usePoolState } from "../state/usePoolState";
import type { PredictionsByMatchId } from "../state/usePoolState";
import { useApi } from "../hooks/useApi";
import StatusBanner from "../components/StatusBanner";
import PageIntro from "../components/PageIntro";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

function FriendPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const { friendId } = useParams<{ friendId: string }>();
  const friendsApi = useApi<Friend[]>(getFriends, []);
  const { generatedFriendPredictions } = useFriendPredictions();

  const phaseFriendPredictions = useMemo(
    () => generatedFriendPredictions[pool.phase] ?? {},
    [generatedFriendPredictions, pool.phase],
  );

  const generatedFriendPhasePredictions = friendId
    ? phaseFriendPredictions[friendId]
    : undefined;

  const predsApi = useApi<PredictionsByMatchId>(() => {
    if (generatedFriendPhasePredictions) {
      return Promise.resolve(generatedFriendPhasePredictions);
    }

    if (!friendId) return Promise.reject(new Error("Missing friendId"));
    return getFriendPredictions(friendId, pool.phase);
  }, [friendId, generatedFriendPhasePredictions, pool.phase]);

  const friend = useMemo(() => {
    if (!friendId || !friendsApi.data) return null;
    return friendsApi.data.find((f) => f.id === friendId) ?? null;
  }, [friendsApi.data, friendId]);

  const preds = generatedFriendPhasePredictions ?? predsApi.data;
  const loading =
    friendsApi.loading ||
    (!generatedFriendPhasePredictions && predsApi.loading);
  const error = generatedFriendPhasePredictions
    ? friendsApi.error
    : friendsApi.error || predsApi.error;

  const resultsReady =
    pool.predictionState === "locked" && Object.keys(pool.results).length > 0;
  const { results, getPrediction } = pool;

  const [compareOn, setCompareOn] = useState(true);
  const [onlyDiffs, setOnlyDiffs] = useState(false);

  const friendTotal = useMemo(() => {
    if (!resultsReady || !preds) return null;

    return matches.reduce((total, m) => {
      const pred = preds[m.id];
      const res = results[m.id];
      if (!pred || !res) return total;
      return total + scorePrediction(pred, res);
    }, 0);
  }, [resultsReady, preds, matches, results]);

  const rows = useMemo(() => {
    if (!preds) return [];

    return matches.map((m) => {
      const friendPred = preds[m.id];
      const myPred = getPrediction(m.id);
      const res = results[m.id];

      const isDiff = friendPred
        ? friendPred.home !== myPred.home || friendPred.away !== myPred.away
        : false;

      const pts =
        friendPred && res ? scorePrediction(friendPred, res) : undefined;

      return { match: m, friendPred, myPred, res, pts, isDiff };
    });
  }, [preds, matches, results, getPrediction]);

  const diffCount = useMemo(() => {
    if (!compareOn) return 0;
    return rows.reduce((count, r) => count + (r.isDiff ? 1 : 0), 0);
  }, [rows, compareOn]);

  const visibleRows = useMemo(() => {
    if (!onlyDiffs || !compareOn) return rows;
    return rows.filter((r) => r.isDiff);
  }, [rows, onlyDiffs, compareOn]);

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
          Loading friend details…
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
            predsApi.refetch();
          }}
        >
          Retry
        </Button>
      </section>
    );
  }

  if (!friend || !preds) {
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
        description="Compare predictions match by match and review scoring outcomes."
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
          {friendTotal === null ? "—" : friendTotal}
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

        {compareOn && (
          <div
            style={{
              marginLeft: "auto",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Different: {diffCount}/{matches.length}
          </div>
        )}
      </div>

      {!resultsReady && (
        <StatusBanner
          title="Comparison is in preview mode."
          message="Simulate the group stage to compare predictions and see scoring."
        />
      )}

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {visibleRows.length === 0 ? (
          <EmptyState
            title="No matches to compare."
            message={
              onlyDiffs
                ? "There are no prediction differences for the current view."
                : "This friend has no predictions available in the current view."
            }
          />
        ) : (
          visibleRows.map(
            ({ match: m, friendPred, myPred, res, pts, isDiff }) => (
              <div
                key={m.id}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  padding: "1rem 1.1rem",
                  marginBottom: "0.85rem",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                  boxShadow: "var(--shadow-soft)",
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
                    {m.homeTeam.name} vs {m.awayTeam.name}{" "}
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      ({m.date} {m.time})
                    </span>
                  </div>

                  {!friendPred ? (
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
                  ) : compareOn ? (
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
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {friendPred
                        ? `${friendPred.home}–${friendPred.away}`
                        : "—"}
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
                        {myPred.home}–{myPred.away}
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
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {res ? `${res.home}–${res.away}` : "—"}
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
                    Points: {typeof pts === "number" ? pts : "—"}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}

export default FriendPage;
