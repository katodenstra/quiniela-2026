type EmptyStateProps = {
  title: string;
  message?: string;
  action?: React.ReactNode;
};

function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div
      className="widget"
      style={{
        padding: "1.2rem 1.25rem",
        borderRadius: "20px",
        color: "var(--text-primary)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: "1rem",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </div>

      {message && (
        <div
          style={{
            marginTop: "0.35rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}

      {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
