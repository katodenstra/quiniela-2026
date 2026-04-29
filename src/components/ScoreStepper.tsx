import { useState } from "react";

type ScoreStepperProps = {
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  onChange: (next: number | null) => void;
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
  const hasValue = value !== null;
  const safeValue = hasValue ? value : 0;
  const nextIncrementValue = hasValue ? clamp(safeValue + 1, min, max) : 0;
  const nextDecrementValue = hasValue ? clamp(safeValue - 1, min, max) : 0;
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = hasValue ? value : "";

  return (
    <input
      aria-label={label}
      className="score-stepper-input"
      type="number"
      inputMode="numeric"
      placeholder={isFocused ? "" : "-"}
      min={min}
      max={max}
      value={displayValue}
      disabled={isDisabled}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;

        if (raw === "") {
          onChange(null);
          return;
        }

        const parsed = Number(raw);

        if (Number.isNaN(parsed)) return;

        onChange(clamp(parsed, min, max));
      }}
      onKeyDown={(e) => {
        if (isDisabled) return;

        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(nextIncrementValue);
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(nextDecrementValue);
        }
      }}
      style={{
        width: "4rem",
        height: "3rem",
        textAlign: "center",
        fontWeight: 700,
        fontSize: "1.25rem",
        color: "var(--text-primary)",
        background: isDisabled
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.04)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "14px",
        outline: "none",
        boxSizing: "border-box",
        opacity: isDisabled ? 0.6 : 1,
      }}
    />
  );
}

export default ScoreStepper;
