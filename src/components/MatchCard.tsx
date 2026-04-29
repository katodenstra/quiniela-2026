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
  prediction: { home: number | null; away: number | null };
  onPredictionChange: (
    matchId: number,
    next: { home: number | null; away: number | null },
  ) => void;
  isLocked: boolean;
  result?: { home: number; away: number };
  points?: number;
  headerContextLabel?: string;
  headerDateLabel?: string;
  showSavedIndicator?: boolean;
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
  headerContextLabel,
  headerDateLabel,
  showSavedIndicator,
}: MatchCardProps) {
  const homeScore = prediction.home;
  const awayScore = prediction.away;
  const hasPrediction = homeScore !== null && awayScore !== null;

  const resolvedHeaderContextLabel = headerContextLabel ?? round;
  const resolvedHeaderDateLabel = headerDateLabel ?? kickoff;

  const savedIndicatorVisible = showSavedIndicator ?? false;
  const incompleteIndicatorVisible =
    !savedIndicatorVisible && !isLocked && !hasPrediction;

  return (
    <div
      style={{
        border: savedIndicatorVisible
          ? "1px solid rgba(12, 157, 97, 0.22)"
          : incompleteIndicatorVisible
            ? "1px solid rgba(246, 183, 60, 0.24)"
            : "1px solid var(--border-subtle)",
        borderRadius: "24px",
        padding: "1rem 1.1rem",
        marginBottom: "1rem",
        background: incompleteIndicatorVisible
          ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))"
          : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: isLocked
          ? "none"
          : savedIndicatorVisible
            ? "0 0 0 1px rgba(12, 157, 97, 0.06), var(--shadow-soft)"
            : incompleteIndicatorVisible
              ? "0 0 0 1px rgba(246, 183, 60, 0.06), var(--shadow-soft)"
              : "var(--shadow-soft)",
        opacity: isLocked ? 0.9 : hasPrediction ? 1 : 0.96,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          paddingBottom: "0.85rem",
          marginBottom: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          {resolvedHeaderContextLabel}
        </div>

        <div
          style={{
            fontSize: "0.88rem",
            color: "var(--text-muted)",
            fontWeight: 500,
            textAlign: "center",
            flex: "1 1 auto",
          }}
        >
          {resolvedHeaderDateLabel}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            justifyContent: "flex-end",
            minWidth: "fit-content",
          }}
        >
          {savedIndicatorVisible && (
            <span
              aria-label="Saved"
              title="Saved"
              style={{
                display: "inline-block",
                width: "0.7rem",
                height: "0.7rem",
                borderRadius: "999px",
                background: "var(--success-600, #47b881)",
                boxShadow: "0 0 0 4px rgba(71, 184, 129, 0.08)",
                flexShrink: 0,
              }}
            />
          )}
          {incompleteIndicatorVisible && (
            <span
              aria-label="Incomplete"
              title="Incomplete"
              style={{
                display: "inline-block",
                width: "0.7rem",
                height: "0.7rem",
                borderRadius: "999px",
                background: "var(--warning-500, #f6b73c)",
                opacity: 0.9,
                boxShadow: "0 0 0 4px rgba(246, 183, 60, 0.08)",
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(160px, 1fr) auto auto auto minmax(160px, 1fr)",
            alignItems: "center",
            gap: "0.9rem",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.65rem",
              minWidth: 0,
              textAlign: "right",
            }}
          >
            <TeamBadge name={homeTeamName} code={homeTeamCode} reverse />
          </div>

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

          <span
            style={{
              fontWeight: 700,
              color: "var(--text-muted)",
              fontSize: "1.2rem",
            }}
          >
            :
          </span>

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "0.65rem",
              minWidth: 0,
            }}
          >
            <TeamBadge name={awayTeamName} code={awayTeamCode} />
          </div>
        </div>

        <div
          style={{
            fontSize: "0.92rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {venue}
        </div>
      </div>

      {result && (
        <div
          style={{
            marginTop: "0.85rem",
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          Result{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {result.home}–{result.away}
          </strong>
          {typeof points === "number" && (
            <span style={{ marginLeft: "0.7rem", fontWeight: 700 }}>
              +{points} pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchCard;
