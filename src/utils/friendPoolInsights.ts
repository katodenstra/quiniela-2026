import type { Friend } from "../api/mockApi";
import type {
  PredictionsByMatchId,
  ResultsByMatchId,
  TournamentPhase,
} from "../state/usePoolState";
import { scorePrediction } from "./scoring.ts";

export type FriendPredictionsByPhase = Partial<
  Record<TournamentPhase, Record<string, PredictionsByMatchId>>
>;

type InsightMatch = {
  id: number;
  homeTeam: { name: string } | { teamName: string };
  awayTeam: { name: string } | { teamName: string };
};

export type FriendPoolInsightPhaseContext = {
  phase: TournamentPhase;
  matches: InsightMatch[];
};

export type TeamPointTotal = {
  teamName: string;
  points: number;
};

export type FriendPoolInsights = {
  mostReliableTeam: TeamPointTotal | null;
  leastPredictableTeam: TeamPointTotal | null;
  pointsByTeam: Record<string, number>;
};

function sortByPointsDescendingThenName(
  a: [string, number],
  b: [string, number],
) {
  if (b[1] !== a[1]) return b[1] - a[1];
  return a[0].localeCompare(b[0]);
}

function sortByPointsAscendingThenName(
  a: [string, number],
  b: [string, number],
) {
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[0].localeCompare(b[0]);
}

function isPredictionSubmitted(
  prediction: { home: number | null; away: number | null } | undefined,
): prediction is { home: number; away: number } {
  return (
    prediction !== undefined &&
    prediction.home !== null &&
    prediction.away !== null
  );
}

function getTeamName(match: InsightMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return "name" in team ? team.name : team.teamName;
}

export function computeFriendPoolInsights({
  friends,
  friendPredictionsByPhase,
  resolvedPhaseContexts,
  results,
}: {
  friends: Friend[];
  friendPredictionsByPhase: FriendPredictionsByPhase;
  resolvedPhaseContexts: FriendPoolInsightPhaseContext[];
  results: ResultsByMatchId;
}): FriendPoolInsights {
  const pointsByTeam = new Map<string, number>();

  resolvedPhaseContexts.forEach((context) => {
    context.matches.forEach((match) => {
      const result = results[match.id];
      if (!result) return;

      friends.forEach((friend) => {
        const prediction =
          friendPredictionsByPhase[context.phase]?.[friend.id]?.[match.id];
        if (!isPredictionSubmitted(prediction)) return;

        const points = scorePrediction(prediction, result);

        [getTeamName(match, "home"), getTeamName(match, "away")].forEach(
          (teamName) => {
            pointsByTeam.set(teamName, (pointsByTeam.get(teamName) ?? 0) + points);
          },
        );
      });
    });
  });

  const entries = Array.from(pointsByTeam.entries());
  const mostReliable = [...entries].sort(sortByPointsDescendingThenName)[0];
  const leastPredictable = [...entries].sort(sortByPointsAscendingThenName)[0];

  return {
    mostReliableTeam: mostReliable
      ? { teamName: mostReliable[0], points: mostReliable[1] }
      : null,
    leastPredictableTeam: leastPredictable
      ? { teamName: leastPredictable[0], points: leastPredictable[1] }
      : null,
    pointsByTeam: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))),
  };
}
