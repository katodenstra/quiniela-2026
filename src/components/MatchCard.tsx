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
  isSubmitted?: boolean;
  headerContextLabel?: string;
  headerDateLabel?: string;
  showSubmittedChip?: boolean;
  showNotSubmittedChip?: boolean;
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
  isSubmitted = false,
  headerContextLabel,
  headerDateLabel,
  showSubmittedChip,
  showNotSubmittedChip,
}: MatchCardProps) {
  const homeScore = prediction.home;
  const awayScore = prediction.away;
  const hasPrediction = homeScore !== null && awayScore !== null;

  const resolvedHeaderContextLabel = headerContextLabel ?? round;
  const resolvedHeaderDateLabel = headerDateLabel ?? kickoff;

  const submittedChipVisible =
    (showSubmittedChip ?? false) || (isSubmitted && !isLocked && hasPrediction);
  const notSubmittedChipVisible =
    (showNotSubmittedChip ?? false) || (isSubmitted && !isLocked && !hasPrediction);

  const isHighlightVisible = submittedChipVisible;

  return (
    <div
      style={{
        border: isHighlightVisible
          ? "1px solid rgba(12, 157, 97, 0.24)"
          : "1px solid var(--border-subtle)",
        borderRadius: "24px",
        padding: "1rem 1.1rem",
        marginBottom: "1rem",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        boxShadow: isLocked
          ? "none"
          : isHighlightVisible
            ? "0 0 0 1px rgba(12, 157, 97, 0.08), var(--shadow-soft)"
            : "var(--shadow-soft)",
        opacity: isLocked ? 0.9 : 1,
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
          {submittedChipVisible && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.32rem 0.8rem",
                borderRadius: "999px",
                background: "rgba(12, 157, 97, 0.12)",
                border: "1px solid rgba(12, 157, 97, 0.18)",
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              Submitted
            </div>
          )}

          {notSubmittedChipVisible && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.32rem 0.8rem",
                borderRadius: "999px",
                background: "rgba(255, 173, 13, 0.12)",
                border: "1px solid rgba(255, 173, 13, 0.18)",
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              Not submitted
            </div>
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
