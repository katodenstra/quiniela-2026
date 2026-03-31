type TeamBadgeProps = {
  name: string;
  code: string | null;
  reverse?: boolean;
};

function TeamBadge({ name, code, reverse = false }: TeamBadgeProps) {
  const flagUrl = code
    ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
    : null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.65rem",
        minWidth: 0,
        flexDirection: reverse ? "row-reverse" : "row",
        textAlign: reverse ? "right" : "left",
      }}
    >
      <div
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
          background: "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt=""
            width={32}
            height={32}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{
              fontSize: "1rem",
              color: "var(--text-muted)",
            }}
          >
            public
          </span>
        )}
      </div>

      <span
        style={{
          color: "var(--text-primary)",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </span>
    </div>
  );
}

export default TeamBadge;
