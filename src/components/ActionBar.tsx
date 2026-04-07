import type { PredictionState } from "../state/usePoolState";
import Button from "./Button";

type ActionBarProps = {
  predictionState: PredictionState;
  onSubmitPredictions: () => void;
  canSubmitPredictions: boolean;
  missingPredictionsCount: number;
};

function ActionBar({
  predictionState,
  onSubmitPredictions,
  canSubmitPredictions,
  missingPredictionsCount,
}: ActionBarProps) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.85rem",
        }}
      >
        <Button
          variant={predictionState === "submitted" ? "success" : "ghost"}
          onClick={onSubmitPredictions}
          disabled={!canSubmitPredictions}
        >
          Submit predictions
        </Button>

        <span
          style={{
            padding: "0.35rem 0.7rem",
            borderRadius: "999px",
            border: "1px solid var(--border-subtle)",
            background:
              predictionState === "locked"
                ? "rgba(236, 45, 48, 0.14)"
                : predictionState === "submitted"
                  ? "rgba(12, 157, 97, 0.18)"
                  : "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {predictionState.toUpperCase()}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.45rem",
        }}
      >
        {predictionState === "draft" && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.92rem",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Keep filling your predictions. You can submit even if some matches
            are still missing.
          </div>
        )}

        {predictionState === "submitted" && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.92rem",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Predictions submitted. You can still edit them until the tournament
            starts or results are simulated.
          </div>
        )}

        {predictionState === "locked" && (
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

        {missingPredictionsCount > 0 && predictionState !== "locked" && (
          <div
            style={{
              color: "var(--warning-500, #f6b73c)",
              fontSize: "0.92rem",
              fontWeight: 600,
            }}
          >
            {missingPredictionsCount} matches still need predictions.
          </div>
        )}
      </div>
    </div>
  );
}

export default ActionBar;
