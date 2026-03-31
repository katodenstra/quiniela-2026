type StatusBannerProps = {
  title: string;
  message?: string;
};

function StatusBanner({ title, message }: StatusBannerProps) {
  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.9rem 1rem",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.04)",
        color: "var(--text-primary)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div style={{ fontWeight: 600 }}>{title}</div>

      {message && (
        <div style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default StatusBanner;
