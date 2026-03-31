import ScoreStepper from "./ScoreStepper";
import TeamBadge from "./TeamBadge";

type MatchCardProps = {
  matchId: number;
  homeTeamName: string;
  homeTeamCode: string | null;
  awayTeamName: string;
  awayTeamCode: string | null;
  kickoff: string;
  venue: string;
  round: string;
  prediction: { home: number; away: number };
  onPredictionChange: (
    matchId: number,
    next: { home: number; away: number },
  ) => void;
  isLocked: boolean;
  result?: { home: number; away: number };
  points?: number;
};

function MatchCard({
  matchId,
  homeTeamName,
  homeTeamCode,
  awayTeamName,
  awayTeamCode,
  kickoff,
  venue,
  round,
  prediction,
  onPredictionChange,
  isLocked,
  result,
  points,
}: MatchCardProps) {
  const homeScore = prediction.home;
  const awayScore = prediction.away;

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "24px",
        padding: "1.1rem 1.2rem",
        marginBottom: "1rem",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: "var(--shadow-soft)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              width: "100%",
            }}
          >
            <TeamBadge name={homeTeamName} code={homeTeamCode} />
            <span
              style={{
                color: "var(--text-muted)",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              vs
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                flexDirection: "row-reverse",
                textAlign: "right",
              }}
            >
              <TeamBadge name={awayTeamName} code={awayTeamCode} reverse />
            </div>{" "}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            {round} • Kickoff: {kickoff}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            {venue}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ScoreStepper
            label={`${homeTeamName} score`}
            value={homeScore}
            min={0}
            max={9}
            onChange={(nextHome) =>
              onPredictionChange(matchId, { home: nextHome, away: awayScore })
            }
            disabled={isLocked}
          />

          <span style={{ fontWeight: 700 }}>–</span>

          <ScoreStepper
            label={`${awayTeamName} score`}
            value={awayScore}
            min={0}
            max={9}
            onChange={(nextAway) =>
              onPredictionChange(matchId, { home: homeScore, away: nextAway })
            }
            disabled={isLocked}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "0.8rem",
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
        }}
      >
        Your prediction:{" "}
        <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {homeScore}–{awayScore}
        </strong>
      </div>

      {result && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#333" }}>
          Result:{" "}
          <strong>
            {result.home}–{result.away}
          </strong>
          {typeof points === "number" && (
            <span style={{ marginLeft: "0.75rem", fontWeight: 700 }}>
              +{points} pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchCard;
