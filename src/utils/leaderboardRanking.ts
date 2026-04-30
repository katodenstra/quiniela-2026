import type { Friend } from "../api/mockApi";
import type {
  PredictionsByMatchId,
  PredictionsByPhase,
  ResultsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import { computePhasePoints, type PhaseScoringContext } from "./phaseScoring";

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

function totalPhasePoints(pointsByPhase: Partial<Record<TournamentPhase, number>>) {
  return Object.values(pointsByPhase).reduce(
    (total, points) => total + (points ?? 0),
    0,
  );
}

export function buildLeaderboardEntries({
  friends,
  myPredictions,
  friendPredictionsByPhase,
  resolvedPhaseContexts,
  results,
}: BuildLeaderboardEntriesArgs): LeaderboardEntry[] {
  const hasResolvedPhases = resolvedPhaseContexts.length > 0;

  const myPointsByPhase = Object.fromEntries(
    resolvedPhaseContexts.map((context) => [
      context.phase,
      computePhasePoints(context.matches, myPredictions[context.phase], results),
    ]),
  ) as Partial<Record<TournamentPhase, number>>;

  const myEntry: LeaderboardEntry = {
    id: "me",
    name: "You",
    points: hasResolvedPhases ? totalPhasePoints(myPointsByPhase) : null,
    pointsByPhase: {
      groups: myPointsByPhase.groups ?? 0,
      roundOf32: myPointsByPhase.roundOf32 ?? 0,
    },
  };

  const friendEntries = friends.map<LeaderboardEntry>((friend) => {
    const pointsByPhase = Object.fromEntries(
      resolvedPhaseContexts.map((context) => [
        context.phase,
        computePhasePoints(
          context.matches,
          friendPredictionsByPhase[context.phase]?.[friend.id],
          results,
        ),
      ]),
    ) as Partial<Record<TournamentPhase, number>>;

    return {
      id: friend.id,
      name: friend.name,
      points: hasResolvedPhases ? totalPhasePoints(pointsByPhase) : null,
      pointsByPhase: {
        groups: pointsByPhase.groups ?? 0,
        roundOf32: pointsByPhase.roundOf32 ?? 0,
      },
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

