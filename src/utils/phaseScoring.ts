import type { KnockoutMatch } from "../data/knockout";
import {
  generateKnockoutMatchesByPhase,
  isKnockoutPhaseResolved,
} from "../data/knockout";
import { getBestThirdPlacedTeams } from "../data/qualification";
import { calculateGroupStandings } from "../data/standings";
import type { GroupStageMatch } from "../data/worldcup";
import {
  scorePrediction,
  type Prediction,
  type PredictionsByMatchId,
  type PredictionsByPhase,
  type ResultsByMatchId,
  type TournamentPhase,
} from "../state/usePoolState";

export type ComparisonMatch = GroupStageMatch | KnockoutMatch;
export type SubmittedPrediction = { home: number; away: number };
export type PointsByPhase = Partial<Record<TournamentPhase, number>>;

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
  { phase: "quarterfinals", title: "Quarterfinals" },
  { phase: "semifinals", title: "Semifinals" },
  { phase: "final", title: "Final" },
];

export const scorableComparisonPhases: TournamentPhase[] = [
  "groups",
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
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

  const knockoutMatchesByPhase =
    groupsResolved && bestThirds.length >= 8
      ? generateKnockoutMatchesByPhase(standingsByGroup, bestThirds, results)
      : {};

  const roundOf32Resolved =
    isKnockoutPhaseResolved(knockoutMatchesByPhase.roundOf32, results);
  const roundOf16Resolved =
    isKnockoutPhaseResolved(knockoutMatchesByPhase.roundOf16, results);
  const quarterfinalsResolved = isKnockoutPhaseResolved(
    knockoutMatchesByPhase.quarterfinals,
    results,
  );
  const semifinalsResolved =
    isKnockoutPhaseResolved(knockoutMatchesByPhase.semifinals, results);
  const finalResolved = isKnockoutPhaseResolved(
    knockoutMatchesByPhase.final,
    results,
  );

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
        matches: knockoutMatchesByPhase.roundOf32 ?? [],
        isAvailable: groupsResolved,
        isResolved: roundOf32Resolved,
      };
    }

    if (phaseConfig.phase === "roundOf16") {
      return {
        ...phaseConfig,
        matches: roundOf32Resolved ? (knockoutMatchesByPhase.roundOf16 ?? []) : [],
        isAvailable: roundOf32Resolved,
        isResolved: roundOf16Resolved,
      };
    }

    if (phaseConfig.phase === "quarterfinals") {
      return {
        ...phaseConfig,
        matches: roundOf16Resolved
          ? (knockoutMatchesByPhase.quarterfinals ?? [])
          : [],
        isAvailable: roundOf16Resolved,
        isResolved: quarterfinalsResolved,
      };
    }

    if (phaseConfig.phase === "semifinals") {
      return {
        ...phaseConfig,
        matches: quarterfinalsResolved
          ? (knockoutMatchesByPhase.semifinals ?? [])
          : [],
        isAvailable: quarterfinalsResolved,
        isResolved: semifinalsResolved,
      };
    }

    if (phaseConfig.phase === "final") {
      return {
        ...phaseConfig,
        matches: semifinalsResolved ? (knockoutMatchesByPhase.final ?? []) : [],
        isAvailable: semifinalsResolved,
        isResolved: finalResolved,
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

export function getResolvedScoringContexts(
  phaseContexts: PhaseScoringContext[],
) {
  return phaseContexts.filter(
    (context) =>
      scorableComparisonPhases.includes(context.phase) && context.isResolved,
  );
}

export function computePointsByPhase(
  resolvedPhaseContexts: PhaseScoringContext[],
  predictionsByPhase: Partial<PredictionsByPhase>,
  resultsByMatch: ResultsByMatchId,
): PointsByPhase {
  return Object.fromEntries(
    resolvedPhaseContexts.map((context) => [
      context.phase,
      computePhasePoints(
        context.matches,
        predictionsByPhase[context.phase],
        resultsByMatch,
      ),
    ]),
  ) as PointsByPhase;
}

export function computeCumulativeTournamentPoints(pointsByPhase: PointsByPhase) {
  return scorableComparisonPhases.reduce(
    (total, phase) => total + (pointsByPhase[phase] ?? 0),
    0,
  );
}
