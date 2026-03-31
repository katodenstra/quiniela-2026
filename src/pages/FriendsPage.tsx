import { Link } from "react-router-dom";
import { getFriends } from "../api/mockApi";
import { useApi } from "../hooks/useApi";
import PageIntro from "../components/PageIntro";
import StatusBanner from "../components/StatusBanner";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";

function FriendsPage() {
  const { data: friends, loading, error, refetch } = useApi(getFriends, []);

  return (
    <section>
      <PageIntro
        title="Friends"
        description="Browse participants and open their prediction details for comparison."
      />

      {loading && (
        <div
          style={{
            color: "var(--text-secondary)",
            marginBottom: "1rem",
            fontWeight: 500,
          }}
        >
          Loading friends…
        </div>
      )}
      {error && (
        <>
          <StatusBanner title="Could not load friends." message={error} />
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </>
      )}

      {!loading && !error && (friends ?? []).length === 0 && (
        <EmptyState
          title="No friends available yet."
          message="Once participants are added, you’ll be able to browse their predictions here."
        />
      )}

      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {(friends ?? []).map((f) => (
          <Link
            key={f.id}
            to={`/friends/${f.id}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "1rem 1.1rem",
              marginBottom: "0.85rem",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              boxShadow: "var(--shadow-soft)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition:
                "transform 140ms ease, border-color 140ms ease, background 140ms ease",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {f.name}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginTop: "0.25rem",
                lineHeight: 1.4,
              }}
            >
              Open profile and compare predictions
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default FriendsPage;
