import type { KnockoutMatch } from "../data/knockout";
import { generateRoundOf32 } from "../data/knockout";
import { getBestThirdPlacedTeams } from "../data/qualification";
import { calculateGroupStandings } from "../data/standings";
import type { GroupStageMatch } from "../data/worldcup";
import {
  scorePrediction,
  type Prediction,
  type PredictionsByMatchId,
  type ResultsByMatchId,
  type TournamentPhase,
} from "../state/usePoolState";

export type ComparisonMatch = GroupStageMatch | KnockoutMatch;
export type SubmittedPrediction = { home: number; away: number };

export type PhaseConfig = {
  phase: TournamentPhase;
  title: string;
};

export type PhaseScoringContext = PhaseConfig & {
  matches: ComparisonMatch[];
  isAvailable: boolean;
  isResolved: boolean;
};

export const comparisonPhases: PhaseConfig[] = [
  { phase: "groups", title: "Groups" },
  { phase: "roundOf32", title: "Round of 32" },
  { phase: "roundOf16", title: "Round of 16" },
  { phase: "roundOf8", title: "Round of 8" },
  { phase: "quarterfinals", title: "Quarterfinals" },
  { phase: "semifinals", title: "Semifinals" },
  { phase: "final", title: "Final" },
];

export const scorableComparisonPhases: TournamentPhase[] = [
  "groups",
  "roundOf32",
];

export function getPhaseTitle(phase: TournamentPhase) {
  return (
    comparisonPhases.find((phaseConfig) => phaseConfig.phase === phase)
      ?.title ?? phase
  );
}

export function isPredictionSubmitted(
  prediction: Prediction | undefined,
): prediction is SubmittedPrediction {
  return (
    prediction !== undefined &&
    prediction.home !== null &&
    prediction.away !== null
  );
}

export function getTeamName(match: ComparisonMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  return "name" in team ? team.name : team.teamName;
}

export function getPhaseScoringContexts(
  groupMatches: GroupStageMatch[],
  results: ResultsByMatchId,
): PhaseScoringContext[] {
  const groupsResolved =
    groupMatches.length > 0 &&
    groupMatches.every((match) => results[match.id] !== undefined);

  const standingsByGroup = groupsResolved
    ? Object.fromEntries(
        Array.from(new Set(groupMatches.map((match) => match.group))).map(
          (group) => [
            group,
            calculateGroupStandings(groupMatches, results, group),
          ],
        ),
      )
    : {};

  const bestThirds = groupsResolved
    ? getBestThirdPlacedTeams(standingsByGroup)
    : [];

  const roundOf32Matches =
    groupsResolved && bestThirds.length >= 8
      ? generateRoundOf32(standingsByGroup, bestThirds)
      : [];

  const roundOf32Resolved =
    roundOf32Matches.length > 0 &&
    roundOf32Matches.every((match) => results[match.id] !== undefined);

  return comparisonPhases.map((phaseConfig) => {
    if (phaseConfig.phase === "groups") {
      return {
        ...phaseConfig,
        matches: groupMatches,
        isAvailable: groupMatches.length > 0,
        isResolved: groupsResolved,
      };
    }

    if (phaseConfig.phase === "roundOf32") {
      return {
        ...phaseConfig,
        matches: roundOf32Matches,
        isAvailable: roundOf32Matches.length > 0,
        isResolved: roundOf32Resolved,
      };
    }

    return {
      ...phaseConfig,
      matches: [],
      isAvailable: false,
      isResolved: false,
    };
  });
}

export function computePhasePoints(
  phaseMatches: Array<{ id: number }>,
  predictionsByMatch: PredictionsByMatchId | undefined,
  resultsByMatch: ResultsByMatchId,
) {
  if (!predictionsByMatch) return 0;

  return phaseMatches.reduce((total, match) => {
    const pred = predictionsByMatch[match.id];
    const res = resultsByMatch[match.id];
    if (!isPredictionSubmitted(pred) || !res) return total;
    return total + scorePrediction(pred, res);
  }, 0);
}
