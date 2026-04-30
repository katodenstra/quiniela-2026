import type { Friend } from "../api/mockApi";
import type {
  PredictionsByMatchId,
  PredictionsByPhase,
  ResultsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import {
  computeCumulativeTournamentPoints,
  computePointsByPhase,
  type PhaseScoringContext,
} from "./phaseScoring";

export type LeaderboardEntry = {
  id: string;
  name: string;
  points: number | null;
  pointsByPhase: Partial<Record<TournamentPhase, number>>;
};

type FriendPredictionsByPhase = Partial<
  Record<TournamentPhase, Record<string, PredictionsByMatchId>>
>;

type BuildLeaderboardEntriesArgs = {
  friends: Friend[];
  myPredictions: PredictionsByPhase;
  friendPredictionsByPhase: FriendPredictionsByPhase;
  resolvedPhaseContexts: PhaseScoringContext[];
  results: ResultsByMatchId;
};

export function buildLeaderboardEntries({
  friends,
  myPredictions,
  friendPredictionsByPhase,
  resolvedPhaseContexts,
  results,
}: BuildLeaderboardEntriesArgs): LeaderboardEntry[] {
  const hasResolvedPhases = resolvedPhaseContexts.length > 0;

  const myPointsByPhase = computePointsByPhase(
    resolvedPhaseContexts,
    myPredictions,
    results,
  );

  const myEntry: LeaderboardEntry = {
    id: "me",
    name: "You",
    points: hasResolvedPhases
      ? computeCumulativeTournamentPoints(myPointsByPhase)
      : null,
    pointsByPhase: myPointsByPhase,
  };

  const friendEntries = friends.map<LeaderboardEntry>((friend) => {
    const predictionsByPhase = Object.fromEntries(
      resolvedPhaseContexts.map((context) => [
        context.phase,
        friendPredictionsByPhase[context.phase]?.[friend.id] ?? {},
      ]),
    ) as Partial<PredictionsByPhase>;
    const pointsByPhase = computePointsByPhase(
      resolvedPhaseContexts,
      predictionsByPhase,
      results,
    );

    return {
      id: friend.id,
      name: friend.name,
      points: hasResolvedPhases
        ? computeCumulativeTournamentPoints(pointsByPhase)
        : null,
      pointsByPhase,
    };
  });

  return [myEntry, ...friendEntries];
}

export function sortLeaderboardEntries(entries: LeaderboardEntry[]) {
  return [...entries].sort((a, b) => {
    const ap = a.points ?? -1;
    const bp = b.points ?? -1;
    return bp - ap;
  });
}

export function getLeaderboardRank(
  leaderboard: LeaderboardEntry[],
  entryId: string,
) {
  const index = leaderboard.findIndex((entry) => entry.id === entryId);
  return index === -1 ? null : index + 1;
}

export function getNearbyLeaderboardEntries(
  leaderboard: LeaderboardEntry[],
  entryId: string,
  size = 5,
) {
  const index = leaderboard.findIndex((entry) => entry.id === entryId);
  if (index === -1) return [];

  const halfWindow = Math.floor(size / 2);
  const maxStart = Math.max(leaderboard.length - size, 0);
  const start = Math.min(Math.max(index - halfWindow, 0), maxStart);

  return leaderboard.slice(start, start + size);
}
