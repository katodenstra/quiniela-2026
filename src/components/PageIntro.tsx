type PageIntroProps = {
  title: string;
  description?: string;
};

function PageIntro({ title, description }: PageIntroProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h2 className="section-title">{title}</h2>

      {description && (
        <div
          style={{
            marginTop: "-0.5rem",
            color: "var(--text-muted)",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

export default PageIntro;
