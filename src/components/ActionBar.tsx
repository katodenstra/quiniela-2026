import type { PredictionState } from "../state/usePoolState";
import Button from "./Button";

type ActionBarProps = {
  predictionState: PredictionState;
  setPredictionState: (state: PredictionState) => void;
  resetDraft: () => void;
  simulateCurrentStage: () => void;
  resetSimulation: () => void;
  totalPredicted: number;
  totalMatches: number;
  myPoints: number;
  showPoints: boolean;
  phase:
    | "groups"
    | "roundOf32"
    | "roundOf16"
    | "roundOf8"
    | "quarterfinals"
    | "semifinals"
    | "final";
};

function ActionBar({
  predictionState,
  setPredictionState,
  resetDraft,
  simulateCurrentStage,
  resetSimulation,
  totalPredicted,
  totalMatches,
  myPoints,
  showPoints,
  phase,
}: ActionBarProps) {
  const canSimulate =
    predictionState !== "locked" && totalPredicted === totalMatches;

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        width: "100%",
      }}
    >
      <Button
        variant={predictionState === "submitted" ? "success" : "ghost"}
        onClick={() => setPredictionState("submitted")}
        disabled={predictionState === "locked"}
      >
        Save as final
      </Button>

      <Button
        variant="ghost"
        onClick={() => setPredictionState("draft")}
        disabled={predictionState === "locked"}
      >
        Back to draft
      </Button>

      <Button variant="ghost" onClick={resetDraft}>
        Reset draft
      </Button>

      <Button
        variant="primary"
        onClick={simulateCurrentStage}
        disabled={!canSimulate}
      >
        {totalPredicted !== totalMatches
          ? "Complete all predictions to simulate"
          : phase === "groups"
            ? "Simulate group stage"
            : `Simulate ${phase}`}
      </Button>

      <Button variant="danger" onClick={resetSimulation}>
        Reset simulation
      </Button>

      <span
        style={{
          marginLeft: "auto",
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
          fontWeight: 600,
        }}
      >
        {predictionState.toUpperCase()}
      </span>

      {showPoints && (
        <div
          style={{
            color: "var(--text-primary)",
            fontWeight: 600,
            padding: "0.35rem 0",
          }}
        >
          Your points: {myPoints}
        </div>
      )}
    </div>
  );
}

export default ActionBar;
