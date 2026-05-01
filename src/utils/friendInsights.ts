export type FriendInsightEntry = {
  id: string;
  name: string;
  points: number | null;
};

export type FriendRivalInsight = FriendInsightEntry & {
  points: number;
  delta: number;
  deltaLabel: string;
};

export type FriendTopPerformerInsight = FriendInsightEntry & {
  points: number;
};

export function formatFriendDelta(delta: number) {
  if (delta === 0) return "Tied with you";
  return `${delta > 0 ? "+" : ""}${delta} vs you`;
}

function normalizePoints(points: number | null | undefined) {
  return points ?? 0;
}

export function getClosestRivals(
  friends: FriendInsightEntry[],
  myPoints: number | null | undefined,
  limit = 3,
): FriendRivalInsight[] {
  const normalizedMyPoints = normalizePoints(myPoints);

  return [...friends]
    .map((friend) => {
      const points = normalizePoints(friend.points);
      const delta = points - normalizedMyPoints;

      return {
        ...friend,
        points,
        delta,
        deltaLabel: formatFriendDelta(delta),
      };
    })
    .sort((a, b) => {
      const absoluteDelta = Math.abs(a.delta) - Math.abs(b.delta);
      if (absoluteDelta !== 0) return absoluteDelta;
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getTopPerformersFallback(
  friends: FriendInsightEntry[],
  limit = 3,
): FriendTopPerformerInsight[] {
  return [...friends]
    .map((friend) => ({
      ...friend,
      points: normalizePoints(friend.points),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
