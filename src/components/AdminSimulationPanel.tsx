import { createPortal } from "react-dom";
import type { TournamentPhase } from "../state/usePoolState";
import Button from "./Button";

type AdminSimulationPanelProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  phase: TournamentPhase;
  setPhase: (phase: TournamentPhase) => void;
  onRunSimulation: () => void;
  onResetPhase: () => void;
  onResetTournament: () => void;
  onFillMyPredictions: () => void;
  onGenerateFriendsPredictions: () => void;
};

const phaseOptions: { value: TournamentPhase; label: string }[] = [
  { value: "groups", label: "Groups" },
  { value: "roundOf32", label: "Round of 32" },
  { value: "roundOf16", label: "Round of 16" },
  { value: "roundOf8", label: "Round of 8" },
  { value: "quarterfinals", label: "Quarterfinals" },
  { value: "semifinals", label: "Semifinals" },
  { value: "final", label: "Final" },
];

function AdminSimulationPanel({
  open,
  onOpen,
  onClose,
  phase,
  setPhase,
  onRunSimulation,
  onResetPhase,
  onResetTournament,
  onFillMyPredictions,
  onGenerateFriendsPredictions,
}: AdminSimulationPanelProps) {
  const panelUi = (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-controls="admin-simulation-panel"
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 1000,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.55rem",
          padding: "0.8rem 1rem",
          borderRadius: "999px",
          border: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--text-primary)",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "var(--shadow-soft)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: "1.05rem", color: "var(--text-secondary)" }}
        >
          settings
        </span>
        <span>Admin</span>
      </button>

      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{
          position: "fixed",
          inset: 0,
          background: open ? "rgba(3, 7, 18, 0.36)" : "rgba(3, 7, 18, 0)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, background 180ms ease",
          zIndex: 990,
        }}
      />

      <aside
        id="admin-simulation-panel"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(380px, calc(100vw - 1rem))",
          transform: open ? "translateX(0)" : "translateX(calc(100% + 1rem))",
          transition: "transform 220ms ease",
          zIndex: 1001,
          padding: "0.75rem 0 0.75rem 0.75rem",
          display: open ? "flex" : "none",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div
          className="widget"
          style={{
            height: "100%",
            borderRadius: "24px 0 0 24px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            overflowY: "auto",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                }}
              >
                Admin tools
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  marginTop: "0.2rem",
                  fontSize: "0.92rem",
                  lineHeight: 1.4,
                }}
              >
                Simulation and reset controls for testing tournament flows.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin panel"
              style={{
                width: "2.75rem",
                height: "2.75rem",
                display: "grid",
                placeItems: "center",
                borderRadius: "999px",
                border: "1px solid var(--border-subtle)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "var(--shadow-soft)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "0.98rem",
              }}
            >
              Prediction tools
            </div>

            <Button variant="ghost" onClick={onFillMyPredictions}>
              Fill my predictions
            </Button>

            <Button variant="ghost" onClick={onGenerateFriendsPredictions}>
              Generate friends predictions
            </Button>
          </section>

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "0.98rem",
              }}
            >
              Simulation
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              <label
                htmlFor="admin-phase"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                Tournament phase
              </label>

              <div
                style={{
                  position: "relative",
                }}
              >
                <select
                  id="admin-phase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as TournamentPhase)}
                  style={{
                    width: "100%",
                    padding: "0.82rem 2.75rem 0.82rem 0.95rem",
                    borderRadius: "999px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    outline: "none",
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    boxShadow: "var(--shadow-soft)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {phaseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <span
                  className="material-symbols-rounded"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "0.9rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-secondary)",
                    pointerEvents: "none",
                    fontSize: "1.15rem",
                  }}
                >
                  expand_more
                </span>
              </div>
            </div>

            <Button variant="primary" onClick={onRunSimulation}>
              Run simulation
            </Button>
          </section>

          <div
            style={{
              height: "1px",
              background: "var(--border-subtle)",
              margin: "0.25rem 0",
            }}
          />

          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "0.98rem",
              }}
            >
              Reset tools
            </div>

            <Button variant="ghost" onClick={onResetPhase}>
              Reset current phase
            </Button>

            <Button variant="danger" onClick={onResetTournament}>
              Reset tournament
            </Button>
          </section>
        </div>
      </aside>
    </>
  );

  return createPortal(panelUi, document.body);
}

export default AdminSimulationPanel;
