import type { GroupId, CompletionStatus } from "../state/usePoolState";

type GroupTabsProps = {
  groups: GroupId[];
  selectedGroup: GroupId;
  onChange: (next: GroupId) => void;
  completion?: Partial<Record<GroupId, CompletionStatus>>;
};

function GroupTabs({
  groups,
  selectedGroup,
  onChange,
  completion = {},
}: GroupTabsProps) {
  return (
    <>
      {groups.map((g) => {
        const isActive = selectedGroup === g;
        const status = completion[g] ?? "empty";

        return (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            style={{
              border: "1px solid",
              borderColor: isActive
                ? "rgba(58, 112, 226, 0.45)"
                : "var(--border-subtle)",
              background: isActive
                ? "rgba(58, 112, 226, 0.20)"
                : "rgba(255,255,255,0.04)",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              padding: "0.75rem 1.05rem",
              borderRadius: "999px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 600,
              flexShrink: 0,
              transition:
                "background 140ms ease, border-color 140ms ease, color 140ms ease",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
              }}
            >
              <span>Group {g}</span>
              <span
                aria-hidden="true"
                style={{
                  width: "0.55rem",
                  height: "0.55rem",
                  borderRadius: "999px",
                  background:
                    status === "complete"
                      ? "var(--success-600, #47b881)"
                      : status === "partial"
                        ? "var(--warning-600, #ffad0d)"
                        : "rgba(255,255,255,0.2)",
                  boxShadow:
                    status === "empty"
                      ? "none"
                      : "0 0 0 4px rgba(255,255,255,0.03)",
                  flexShrink: 0,
                }}
              />
            </span>
          </button>
        );
      })}
    </>
  );
}

export default GroupTabs;
