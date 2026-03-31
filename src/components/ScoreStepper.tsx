type ScoreStepperProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function ScoreStepper({
  label,
  value,
  min = 0,
  max = 9,
  onChange,
  disabled,
}: ScoreStepperProps) {
  const isDisabled = disabled ?? false;

  const decDisabled = isDisabled || value <= min;
  const incDisabled = isDisabled || value >= max;

  const decrement = () => {
    if (decDisabled) return;
    onChange(clamp(value - 1, min, max));
  };

  const increment = () => {
    if (incDisabled) return;
    onChange(clamp(value + 1, min, max));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <button
        type="button"
        aria-label={`${label}: decrease`}
        onClick={decrement}
        disabled={decDisabled}
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "12px",
          border: "1px solid #444",
          background: decDisabled ? "#2a2a2a" : "#1f1f1f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          fontWeight: 600,
          cursor: decDisabled ? "not-allowed" : "pointer",
        }}
      >
        –
      </button>

      <div
        aria-label={label}
        role="status"
        style={{
          width: "2.5rem",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "1.2rem",
          color: "#fff",
        }}
      >
        {value}
      </div>

      <button
        type="button"
        aria-label={`${label}: increase`}
        onClick={increment}
        disabled={incDisabled}
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "12px",
          border: "1px solid #444",
          background: incDisabled ? "#2a2a2a" : "#1f1f1f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          fontWeight: 600,
          cursor: incDisabled ? "not-allowed" : "pointer",
        }}
      >
        +
      </button>
    </div>
  );
}

export default ScoreStepper;
