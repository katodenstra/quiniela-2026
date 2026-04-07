import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getFriends } from "../api/mockApi";
import { useApi } from "../hooks/useApi";
import PageIntro from "../components/PageIntro";
import StatusBanner from "../components/StatusBanner";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

function FriendsPage() {
  const { data: friends, loading, error, refetch } = useApi(getFriends, []);

  const { generatedFriendPredictions } = useFriendPredictions();

  const generatedFriendIds = useMemo(() => {
    const ids = new Set<string>();

    Object.values(generatedFriendPredictions).forEach((phasePredictions) => {
      Object.entries(phasePredictions).forEach(([friendId, predictions]) => {
        if (Object.keys(predictions).length > 0) {
          ids.add(friendId);
        }
      });
    });

    return ids;
  }, [generatedFriendPredictions]);

  return (
    <section>
      <PageIntro
        title="Friends"
        description="Browse participants and open their prediction details for comparison."
      />

      {generatedFriendIds.size > 0 && (
        <div
          className="widget"
          style={{
            marginBottom: "1rem",
            padding: "0.95rem 1rem",
            borderRadius: "18px",
            color: "var(--text-secondary)",
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          {generatedFriendIds.size} friends currently have generated prediction
          data available for testing.
        </div>
      )}

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
            {generatedFriendIds.has(f.id) && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.25rem 0.55rem",
                  borderRadius: "999px",
                  background: "rgba(58, 112, 226, 0.14)",
                  border: "1px solid rgba(58, 112, 226, 0.22)",
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  marginBottom: "0.65rem",
                }}
              >
                Generated data
              </div>
            )}
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
              {generatedFriendIds.has(f.id)
                ? "Open profile and compare generated predictions"
                : "Open profile and compare predictions"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default FriendsPage;
