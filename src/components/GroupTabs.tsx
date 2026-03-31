import type { GroupId } from "../state/usePoolState";

type GroupTabsProps = {
  groups: GroupId[];
  selectedGroup: GroupId;
  onChange: (next: GroupId) => void;
};

function GroupTabs({ groups, selectedGroup, onChange }: GroupTabsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        overflowX: "auto",
        paddingBottom: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      {groups.map((g) => {
        const isActive = selectedGroup === g;

        return (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            aria-pressed={isActive}
            style={{
              border: "1px solid",
              borderColor: isActive
                ? "rgba(58, 112, 226, 0.45)"
                : "var(--border-subtle)",
              background: isActive
                ? "rgba(58, 112, 226, 0.20)"
                : "rgba(255,255,255,0.04)",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              padding: "0.6rem 0.95rem",
              borderRadius: "999px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 600,
              transition:
                "background 140ms ease, border-color 140ms ease, color 140ms ease",
            }}
          >
            Group {g}
          </button>
        );
      })}
    </div>
  );
}

export default GroupTabs;
