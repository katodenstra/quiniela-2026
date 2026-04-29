import type { SubmissionStatus } from "../state/usePoolState";

type ActionBarProps = {
  submissionStatus: SubmissionStatus;
  missingPredictionsCount: number;
};

function ActionBar({
  submissionStatus,
  missingPredictionsCount,
}: ActionBarProps) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "grid",
          gap: "0.45rem",
        }}
      >
        {submissionStatus === "in-progress" && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.92rem",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Predictions save automatically as you fill each match. You can keep
            editing them until this phase locks.
          </div>
        )}

        {submissionStatus === "locked" && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.92rem",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Predictions are locked and can no longer be edited.
          </div>
        )}

        {missingPredictionsCount > 0 && submissionStatus !== "locked" && (
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.92rem",
              fontWeight: 600,
            }}
          >
            {missingPredictionsCount} matches still need predictions.
          </div>
        )}

        {missingPredictionsCount === 0 && submissionStatus !== "locked" && (
          <div
            style={{
              color: "var(--success-600, #47b881)",
              fontSize: "0.92rem",
              fontWeight: 600,
            }}
          >
            All current predictions are saved.
          </div>
        )}
      </div>
    </div>
  );
}

export default ActionBar;
