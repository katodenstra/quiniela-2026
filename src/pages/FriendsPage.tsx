import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  getAllFriendPredictions,
  getFriends,
  type Friend,
} from "../api/mockApi";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import PageIntro from "../components/PageIntro";
import StatusBanner from "../components/StatusBanner";
import { useApi } from "../hooks/useApi";
import type { GroupStageMatch } from "../data/worldcup";
import { useFriendPredictions } from "../state/FriendPredictionsContext";
import type {
  PoolState,
  PredictionsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import {
  getPhaseScoringContexts,
  getResolvedScoringContexts,
  scorableComparisonPhases,
} from "../utils/phaseScoring";
import { computeFriendPoolInsights } from "../utils/friendPoolInsights";
import {
  formatFriendDelta,
  getClosestRivals,
  getTopPerformersFallback,
} from "../utils/friendInsights";
import {
  buildLeaderboardEntries,
  sortLeaderboardEntries,
  type LeaderboardEntry,
} from "../utils/leaderboardRanking";

type FriendPredictionsByPhase = Partial<
  Record<TournamentPhase, Record<string, PredictionsByMatchId>>
>;
type FriendFilter =
  | "all"
  | "above"
  | "below"
  | "featured"
  | "closest";
type FriendSort = "az" | "za" | "pointsAsc" | "pointsDesc";

type FriendViewModel = {
  friend: Friend;
  entry: LeaderboardEntry;
  rank: number | null;
  points: number;
  delta: number;
  isFeatured: boolean;
};

const pageSize = 25;
const maxFeaturedFriends = 3;
const controlStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "999px",
  padding: "0.76rem 0.95rem",
  minHeight: "2.75rem",
  background: "rgba(255,255,255,0.045)",
  color: "var(--text-primary)",
  outline: "none",
  fontWeight: 500,
  boxSizing: "border-box",
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        width: "2.85rem",
        height: "2.85rem",
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--border-subtle)",
        background: "rgba(255,255,255,0.06)",
        color: "var(--text-primary)",
        fontWeight: 800,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}

function formatDelta(delta: number) {
  return formatFriendDelta(delta);
}

function DeltaPill({ delta }: { delta: number }) {
  const tone =
    delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.22rem 0.55rem",
        border:
          tone === "positive"
            ? "1px solid rgba(12, 157, 97, 0.24)"
            : tone === "negative"
              ? "1px solid rgba(236, 45, 48, 0.24)"
              : "1px solid var(--border-subtle)",
        background:
          tone === "positive"
            ? "rgba(12, 157, 97, 0.12)"
            : tone === "negative"
              ? "rgba(236, 45, 48, 0.10)"
              : "rgba(255,255,255,0.04)",
        color: "var(--text-primary)",
        fontWeight: 500,
      }}
    >
      {formatDelta(delta)}
    </span>
  );
}

function StarButton({
  isFeatured,
  disabled,
  onToggle,
}: {
  isFeatured: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled || isFeatured) onToggle();
      }}
      disabled={disabled && !isFeatured}
      aria-label={isFeatured ? "Remove featured friend" : "Add featured friend"}
      title={
        disabled && !isFeatured
          ? "Remove a featured friend before adding another"
          : isFeatured
            ? "Remove featured friend"
            : "Add featured friend"
      }
      style={{
        width: "2.5rem",
        height: "2.5rem",
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--border-subtle)",
        background: isFeatured
          ? "rgba(255, 173, 13, 0.16)"
          : "rgba(255,255,255,0.04)",
        color: isFeatured ? "#ffcf5a" : "var(--text-secondary)",
        cursor: disabled && !isFeatured ? "not-allowed" : "pointer",
        opacity: disabled && !isFeatured ? 0.45 : 1,
        flexShrink: 0,
      }}
    >
      <span className="material-symbols-rounded" aria-hidden="true">
        {isFeatured ? "star" : "star_outline"}
      </span>
    </button>
  );
}

function FriendCard({
  item,
  featuredLimitReached,
  onToggleFeatured,
}: {
  item: FriendViewModel;
  featuredLimitReached: boolean;
  onToggleFeatured: (friendId: string) => void;
}) {
  return (
    <Link
      to={`/friends/${encodeURIComponent(item.friend.id)}`}
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(180px, 0.8fr) minmax(360px, 1.2fr) auto",
        gap: "0.8rem",
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        padding: "0.82rem 0.95rem",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <Avatar name={item.friend.name} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          minWidth: 0,
          textAlign: "left",
        }}
      >
        <span
          style={{
            color: "var(--text-primary)",
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {item.friend.name}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: "1.9rem",
            height: "1.9rem",
            borderRadius: "999px",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-rounded">chevron_right</span>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "6rem 5.5rem minmax(8rem, 1fr)",
          gap: "0.65rem",
          alignItems: "center",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
          lineHeight: 1.4,
          minWidth: 0,
        }}
      >
        <span>{item.points} points</span>
        <span>Rank: {item.rank === null ? "-" : `#${item.rank}`}</span>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatDelta(item.delta)}
        </span>
      </div>

      <StarButton
        isFeatured={item.isFeatured}
        disabled={featuredLimitReached}
        onToggle={() => onToggleFeatured(item.friend.id)}
      />
    </Link>
  );
}

function FeaturedFriendCard({
  item,
  featuredLimitReached,
  onToggleFeatured,
}: {
  item: FriendViewModel;
  featuredLimitReached: boolean;
  onToggleFeatured: (friendId: string) => void;
}) {
  return (
    <Link
      to={`/friends/${encodeURIComponent(item.friend.id)}`}
      style={{
        position: "relative",
        display: "grid",
        justifyItems: "center",
        textAlign: "center",
        gap: "0.45rem",
        minHeight: "11.5rem",
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        padding: "1.15rem 1rem",
        textDecoration: "none",
        color: "inherit",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}>
        <StarButton
          isFeatured={item.isFeatured}
          disabled={featuredLimitReached}
          onToggle={() => onToggleFeatured(item.friend.id)}
        />
      </div>

      <Avatar name={item.friend.name} />
      <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>
        {item.friend.name}
      </div>
      <div style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
        {item.points} points
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Rank: {item.rank === null ? "-" : `#${item.rank}`}
      </div>
      <DeltaPill delta={item.delta} />
    </Link>
  );
}

function EmptyFeaturedSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: "11.5rem",
        border: "1px dashed var(--border-subtle)",
        borderRadius: "20px",
        padding: "1.15rem 1rem",
        background: "rgba(255,255,255,0.025)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        gap: "0.65rem",
      }}
    >
      <span
        className="material-symbols-rounded"
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        add
      </span>
      <span style={{ fontWeight: 700 }}>Add featured friend</span>
    </button>
  );
}

function AddFeaturedFriendModal({
  open,
  friends,
  onClose,
  onSelect,
}: {
  open: boolean;
  friends: FriendViewModel[];
  onClose: () => void;
  onSelect: (friendId: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return friends.filter((item) =>
      item.friend.name.toLowerCase().includes(normalizedQuery),
    );
  }, [friends, query]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.48)",
          zIndex: 1100,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="featured-friends-modal-title"
        className="widget"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1101,
          width: "min(520px, calc(100vw - 2rem))",
          maxHeight: "min(620px, calc(100vh - 2rem))",
          overflow: "hidden",
          borderRadius: "24px",
          padding: "1rem",
          display: "grid",
          gridTemplateRows: "auto auto auto",
          gap: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            id="featured-friends-modal-title"
            style={{ color: "var(--text-primary)", fontWeight: 800 }}
          >
            Add featured friend
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "2.4rem",
              height: "2.4rem",
              borderRadius: "999px",
              border: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search friends"
          style={{
            ...controlStyle,
            width: "100%",
          }}
        />

        <div
          style={{
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            maxHeight: "min(360px, calc(100vh - 13rem))",
            display: "grid",
            alignContent: "start",
            gap: "0.45rem",
            paddingRight: "0.15rem",
          }}
        >
          {filteredFriends.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", padding: "0.75rem" }}>
              No available friends match the search.
            </div>
          ) : (
            filteredFriends.map((item) => (
              <button
                key={item.friend.id}
                type="button"
                onClick={() => onSelect(item.friend.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "0.58rem 0.7rem",
                  background: "rgba(255,255,255,0.035)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: 700,
                }}
              >
                <Avatar name={item.friend.name} />
                {item.friend.name}
              </button>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px",
        padding: "1rem 1.1rem",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.88rem",
            marginTop: "0.22rem",
          }}
        >
          {subtitle}
        </div>
      )}
      <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.85rem" }}>
        {children}
      </div>
    </div>
  );
}

function CompactInsightRow({
  left,
  middle,
  right,
}: {
  left: React.ReactNode;
  middle?: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: middle
          ? "minmax(0, 1fr) 4.8rem 7.8rem"
          : "minmax(0, 1fr) 4.8rem",
        gap: "0.55rem",
        alignItems: "center",
        padding: "0.56rem 0.65rem",
        borderRadius: "14px",
        border: "1px solid var(--border-subtle)",
        background: "rgba(255,255,255,0.035)",
        textAlign: "left",
      }}
    >
      <div style={{ minWidth: 0 }}>{left}</div>
      {middle && <div style={{ justifySelf: "end" }}>{middle}</div>}
      <div style={{ justifySelf: "end" }}>{right}</div>
    </div>
  );
}

function PoolInsightSubcard({
  label,
  copy,
  highlight,
  tone,
}: {
  label: string;
  copy?: string;
  highlight?: string;
  tone: "positive" | "negative";
}) {
  return (
    <div
      style={{
        border:
          tone === "positive"
            ? "1px solid rgba(12, 157, 97, 0.24)"
            : "1px solid rgba(236, 45, 48, 0.24)",
        borderRadius: "16px",
        padding: "0.75rem 0.8rem",
        background:
          tone === "positive"
            ? "rgba(12, 157, 97, 0.12)"
            : "rgba(236, 45, 48, 0.10)",
      }}
    >
      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "0.76rem",
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "var(--text-primary)",
          fontWeight: 500,
          marginTop: "0.35rem",
          lineHeight: 1.32,
        }}
      >
        {highlight ? (
          <>
            {copy}
            <strong style={{ fontWeight: 800 }}>{highlight}</strong>
            {" matches"}
          </>
        ) : (
          copy
        )}
      </div>
    </div>
  );
}

function FriendsPage({
  matches,
  pool,
}: {
  matches: GroupStageMatch[];
  pool: PoolState;
}) {
  const { data: friends, loading, error, refetch } = useApi(getFriends, []);
  const { generatedFriendPredictions } = useFriendPredictions();
  const [friendPredictionsByPhase, setFriendPredictionsByPhase] =
    useState<FriendPredictionsByPhase>({});
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [featuredFriendIds, setFeaturedFriendIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FriendFilter>("all");
  const [sort, setSort] = useState<FriendSort>("pointsDesc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;

    async function loadFriendPredictions() {
      setPredictionsLoading(true);
      setPredictionsError(null);

      try {
        const entries = await Promise.all(
          scorableComparisonPhases.map(async (phase) => {
            const apiPredictions = await getAllFriendPredictions(phase);
            const generatedPredictions = generatedFriendPredictions[phase] ?? {};

            return [
              phase,
              {
                ...apiPredictions,
                ...generatedPredictions,
              },
            ] as const;
          }),
        );

        if (!alive) return;
        setFriendPredictionsByPhase(Object.fromEntries(entries));
      } catch (caughtError: unknown) {
        if (!alive) return;
        setPredictionsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load friend predictions",
        );
      } finally {
        if (alive) setPredictionsLoading(false);
      }
    }

    loadFriendPredictions();

    return () => {
      alive = false;
    };
  }, [generatedFriendPredictions]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, sort]);

  const phaseContexts = useMemo(
    () => getPhaseScoringContexts(matches, pool.results),
    [matches, pool.results],
  );

  const resolvedPhaseContexts = useMemo(
    () => getResolvedScoringContexts(phaseContexts),
    [phaseContexts],
  );

  const leaderboard = useMemo(
    () =>
      sortLeaderboardEntries(
        buildLeaderboardEntries({
          friends: friends ?? [],
          myPredictions: pool.predictions,
          friendPredictionsByPhase,
          resolvedPhaseContexts,
          results: pool.results,
        }),
      ),
    [
      friends,
      pool.predictions,
      friendPredictionsByPhase,
      resolvedPhaseContexts,
      pool.results,
    ],
  );

  const myEntry = leaderboard.find((entry) => entry.id === "me");
  const myPoints = myEntry?.points ?? 0;

  const friendItems = useMemo<FriendViewModel[]>(() => {
    return (friends ?? []).map((friend) => {
      const entry = leaderboard.find((item) => item.id === friend.id) ?? {
        id: friend.id,
        name: friend.name,
        points: null,
        pointsByPhase: {},
      };
      const points = entry.points ?? 0;
      const rankIndex = leaderboard.findIndex((item) => item.id === friend.id);

      return {
        friend,
        entry,
        rank: rankIndex === -1 ? null : rankIndex + 1,
        points,
        delta: points - myPoints,
        isFeatured: featuredFriendIds.includes(friend.id),
      };
    });
  }, [friends, featuredFriendIds, leaderboard, myPoints]);

  const featuredLimitReached =
    featuredFriendIds.length >= maxFeaturedFriends;

  const featuredItems = featuredFriendIds
    .map((friendId) => friendItems.find((item) => item.friend.id === friendId))
    .filter((item): item is FriendViewModel => item !== undefined);

  const closestRivals = useMemo(
    () =>
      getClosestRivals(
        friendItems.map((item) => ({
          id: item.friend.id,
          name: item.friend.name,
          points: item.points,
        })),
        myPoints,
      ),
    [friendItems, myPoints],
  );

  const topPerformers = useMemo(
    () =>
      getTopPerformersFallback(
        friendItems.map((item) => ({
          id: item.friend.id,
          name: item.friend.name,
          points: item.points,
        })),
      ),
    [friendItems],
  );

  const poolTeamInsights = useMemo(
    () =>
      computeFriendPoolInsights({
        friends: friends ?? [],
        friendPredictionsByPhase,
        resolvedPhaseContexts,
        results: pool.results,
      }),
    [friends, friendPredictionsByPhase, pool.results, resolvedPhaseContexts],
  );

  const visibleFriends = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const closestIds = new Set(closestRivals.map((item) => item.id));

    return friendItems
      .filter((item) =>
        item.friend.name.toLowerCase().includes(normalizedSearch),
      )
      .filter((item) => {
        if (filter === "above") return item.delta > 0;
        if (filter === "below") return item.delta < 0;
        if (filter === "featured") return item.isFeatured;
        if (filter === "closest") return closestIds.has(item.friend.id);
        return true;
      })
      .sort((a, b) => {
        if (sort === "az") return a.friend.name.localeCompare(b.friend.name);
        if (sort === "za") return b.friend.name.localeCompare(a.friend.name);
        if (sort === "pointsAsc") return a.points - b.points;
        return b.points - a.points;
      });
  }, [closestRivals, filter, friendItems, search, sort]);

  const totalPages = Math.max(Math.ceil(visibleFriends.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedFriends = visibleFriends.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const addFeaturedFriend = (friendId: string) => {
    setFeaturedFriendIds((prev) => {
      if (prev.includes(friendId)) return prev;
      if (prev.length >= maxFeaturedFriends) return prev;
      return [...prev, friendId];
    });
  };

  const toggleFeaturedFriend = (friendId: string) => {
    setFeaturedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }
      if (prev.length >= maxFeaturedFriends) return prev;
      return [...prev, friendId];
    });
  };

  const availableModalFriends = friendItems.filter(
    (item) => !item.isFeatured,
  );

  return (
    <section>
      <PageIntro
        title="Friends"
        description="Track featured friends, find rivals and open detailed prediction comparisons."
      />

      {(loading || predictionsLoading) && (
        <div
          style={{
            color: "var(--text-secondary)",
            marginBottom: "1rem",
            fontWeight: 600,
          }}
        >
          Loading friends...
        </div>
      )}

      {(error || predictionsError) && (
        <>
          <StatusBanner
            title="Could not load friends."
            message={error ?? predictionsError ?? "Request failed"}
          />
          <Button variant="ghost" onClick={refetch}>
            Retry
          </Button>
        </>
      )}

      {!loading && !error && (friends ?? []).length === 0 && (
        <EmptyState
          title="No friends available yet."
          message="Once participants are added, you will be able to browse their predictions here."
        />
      )}

      {!loading && !error && (friends ?? []).length > 0 && (
        <>
          <section style={{ marginBottom: "1.25rem" }}>
            <div
              style={{
                color: "var(--text-primary)",
                fontSize: "1.05rem",
                fontWeight: 800,
                marginBottom: "0.75rem",
              }}
            >
              Featured friends
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.9rem",
              }}
            >
              {Array.from({ length: maxFeaturedFriends }, (_, index) => {
                const item = featuredItems[index];

                return item ? (
                  <FeaturedFriendCard
                    key={item.friend.id}
                    item={item}
                    featuredLimitReached={featuredLimitReached}
                    onToggleFeatured={toggleFeaturedFriend}
                  />
                ) : (
                  <EmptyFeaturedSlot
                    key={`empty-${index}`}
                    onClick={() => setModalOpen(true)}
                  />
                );
              })}
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "0.9rem",
              marginBottom: "1.25rem",
            }}
          >
            <InsightCard
              title="Top performers by match day"
              subtitle="Using cumulative resolved-phase points until matchday scoring is modeled."
            >
              {topPerformers.map((item, index) => (
                <CompactInsightRow
                  key={item.id}
                  left={
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        #{index + 1}
                      </span>
                      <span
                        style={{
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </span>
                    </span>
                  }
                  right={
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.points} pts
                    </span>
                  }
                />
              ))}
            </InsightCard>

            <InsightCard title="Closest rivals">
              {closestRivals.map((item) => (
                <CompactInsightRow
                  key={item.id}
                  left={
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </span>
                  }
                  middle={
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.points} pts
                    </span>
                  }
                  right={<DeltaPill delta={item.delta} />}
                />
              ))}
            </InsightCard>

            <InsightCard title="Pool insights">
              <PoolInsightSubcard
                label="Most reliable team"
                tone="positive"
                copy={
                  poolTeamInsights.mostReliableTeam
                    ? "Your friends have earned the most points from "
                    : "No resolved team data yet"
                }
                highlight={poolTeamInsights.mostReliableTeam?.teamName}
              />
              <PoolInsightSubcard
                label="Least predictable team"
                tone="negative"
                copy={
                  poolTeamInsights.leastPredictableTeam
                    ? "Your friends have earned the fewest points from "
                    : "No resolved team data yet"
                }
                highlight={poolTeamInsights.leastPredictableTeam?.teamName}
              />
            </InsightCard>
          </div>

          <section
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "22px",
              padding: "1rem",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "0.9rem",
              }}
            >
              <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>
                All friends
              </div>
              <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                {visibleFriends.length} shown
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 1fr) minmax(160px, auto) minmax(190px, auto)",
                gap: "0.7rem",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search friends"
                style={{
                  ...controlStyle,
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(255,255,255,0.055)",
                  minWidth: 0,
                }}
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FriendFilter)}
                aria-label="Filter friends"
                style={{
                  ...controlStyle,
                }}
              >
                <option value="all">All</option>
                <option value="above">Above me</option>
                <option value="below">Below me</option>
                <option value="featured">Featured friends</option>
                <option value="closest">Closest rivals</option>
              </select>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as FriendSort)}
                aria-label="Sort friends"
                style={{
                  ...controlStyle,
                }}
              >
                <option value="az">Alphabetical A-Z</option>
                <option value="za">Alphabetical Z-A</option>
                <option value="pointsAsc">Points ascending</option>
                <option value="pointsDesc">Points descending</option>
              </select>
            </div>

            {paginatedFriends.length === 0 ? (
              <EmptyState
                title="No friends match the current view."
                message="Adjust search, filters, or sorting to widen the list."
              />
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {paginatedFriends.map((item) => (
                  <FriendCard
                    key={item.friend.id}
                    item={item}
                    featuredLimitReached={featuredLimitReached}
                    onToggleFeatured={toggleFeaturedFriend}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginTop: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <div style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      <AddFeaturedFriendModal
        open={modalOpen}
        friends={availableModalFriends}
        onClose={() => setModalOpen(false)}
        onSelect={(friendId) => {
          addFeaturedFriend(friendId);
          setModalOpen(false);
        }}
      />
    </section>
  );
}

export default FriendsPage;
