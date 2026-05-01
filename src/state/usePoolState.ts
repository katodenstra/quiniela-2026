import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppGroupId as GroupId,
  GroupStageMatch,
  ViewMode,
} from "../data/worldcup";
import type { KnockoutMatch } from "../data/knockout";
import {
  generateKnockoutMatchesByPhase,
  isKnockoutPhaseResolved,
} from "../data/knockout";
import { getBestThirdPlacedTeams } from "../data/qualification";
import { calculateGroupStandings } from "../data/standings";
export { getOutcome, scorePrediction } from "../utils/scoring";
import { scorePrediction } from "../utils/scoring";

export type Prediction = { home: number | null; away: number | null };
export type PredictionsByMatchId = Record<number, Prediction>;
export type PredictionState = "draft" | "submitted" | "locked";
export type PredictionStateByPhase = Record<TournamentPhase, PredictionState>;
export type CompletionStatus = "empty" | "partial" | "complete";

export type SubmissionStatus = "in-progress" | "locked";
export type MatchSubmissionStatus =
  | "empty"
  | "saved"
  | "locked-empty"
  | "locked-saved";
export type Result = { home: number; away: number };
export type ResultsByMatchId = Record<number, Result>;
export type { GroupId };
export type TournamentPhase =
  | "groups"
  | "roundOf32"
  | "roundOf16"
  | "roundOf8"
  | "quarterfinals"
  | "semifinals"
  | "final";
export type PredictionsByPhase = Record<TournamentPhase, PredictionsByMatchId>;

const STORAGE_KEY = "prediction_pool:draft:v2";
const STATE_KEY = "prediction_pool:state:v2";
const RESULTS_KEY = "prediction_pool:results:v1";
const GROUP_KEY = "prediction_pool:selected_group:v1";
const VIEW_MODE_KEY = "prediction_pool:view_mode:v1";
const MATCHDAY_KEY = "prediction_pool:selected_matchday:v1";
const PHASE_KEY = "prediction_pool:phase:v1";

export function randomScore() {
  return Math.floor(Math.random() * 5);
}

type PhaseMatch = GroupStageMatch | KnockoutMatch;

const phaseOrder: TournamentPhase[] = [
  "groups",
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
];

function normalizePhase(phase: TournamentPhase): TournamentPhase {
  return phase === "roundOf8" ? "quarterfinals" : phase;
}

function getNextPhase(phase: TournamentPhase): TournamentPhase | null {
  const index = phaseOrder.indexOf(normalizePhase(phase));
  return index === -1 ? null : (phaseOrder[index + 1] ?? null);
}

function randomKnockoutScore(): Result {
  const home = randomScore();
  let away = randomScore();

  if (home === away) {
    away = home === 4 ? home - 1 : home + 1;
  }

  return { home, away };
}

export function usePoolState(matches: GroupStageMatch[]) {
  const emptyPredictionsByPhase: PredictionsByPhase = {
    groups: {},
    roundOf32: {},
    roundOf16: {},
    roundOf8: {},
    quarterfinals: {},
    semifinals: {},
    final: {},
  };

  const [predictions, setPredictions] = useState<PredictionsByPhase>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyPredictionsByPhase;
      return {
        ...emptyPredictionsByPhase,
        ...(JSON.parse(raw) as Partial<PredictionsByPhase>),
      };
    } catch {
      return emptyPredictionsByPhase;
    }
  });

  const emptyPredictionStateByPhase: PredictionStateByPhase = {
    groups: "draft",
    roundOf32: "draft",
    roundOf16: "draft",
    roundOf8: "draft",
    quarterfinals: "draft",
    semifinals: "draft",
    final: "draft",
  };

  const [predictionStateByPhase, setPredictionStateByPhase] =
    useState<PredictionStateByPhase>(() => {
      try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return emptyPredictionStateByPhase;
        return {
          ...emptyPredictionStateByPhase,
          ...(JSON.parse(raw) as Partial<PredictionStateByPhase>),
        };
      } catch {
        return emptyPredictionStateByPhase;
      }
    });

  const [results, setResults] = useState<ResultsByMatchId>(() => {
    try {
      const raw = localStorage.getItem(RESULTS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as ResultsByMatchId;
    } catch {
      return {};
    }
  });

  const [selectedGroup, setSelectedGroup] = useState<GroupId>(() => {
    const raw = localStorage.getItem(GROUP_KEY);
    if (
      raw === "A" ||
      raw === "B" ||
      raw === "C" ||
      raw === "D" ||
      raw === "E" ||
      raw === "F" ||
      raw === "G" ||
      raw === "H" ||
      raw === "I" ||
      raw === "J" ||
      raw === "K" ||
      raw === "L"
    ) {
      return raw;
    }
    return "A";
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    return raw === "matchday" ? "matchday" : "group";
  });

  const [selectedMatchday, setSelectedMatchday] = useState<number>(() => {
    const raw = localStorage.getItem(MATCHDAY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 1;
  });

  const [phase, setPhase] = useState<TournamentPhase>(() => {
    const raw = localStorage.getItem(PHASE_KEY);
    if (
      raw === "groups" ||
      raw === "roundOf32" ||
      raw === "roundOf16" ||
      raw === "roundOf8" ||
      raw === "quarterfinals" ||
      raw === "semifinals" ||
      raw === "final"
    ) {
      return normalizePhase(raw);
    }
    return "groups";
  });

  const setActivePhase = useCallback((nextPhase: TournamentPhase) => {
    setPhase(normalizePhase(nextPhase));
  }, []);

  const matchdays = useMemo(
    () =>
      Array.from(
        new Set(
          matches
            .map((m) => ("matchday" in m ? m.matchday : null))
            .filter((day): day is number => day !== null),
        ),
      ).sort((a, b) => a - b),
    [matches],
  );

  const rawPredictionState = predictionStateByPhase[phase];

  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          matches
            .map((m) => m.group)
            .filter((group): group is GroupId => group !== null),
        ),
      ),
    [matches],
  );

  const groupPhaseMatches = useMemo(
    () => matches.filter((match) => match.group !== null),
    [matches],
  );

  const groupsResolved = useMemo(
    () =>
      groupPhaseMatches.length > 0 &&
      groupPhaseMatches.every((match) => results[match.id] !== undefined),
    [groupPhaseMatches, results],
  );

  const standingsByGroup = useMemo(
    () =>
      groupsResolved
        ? Object.fromEntries(
            groups.map((group) => [
              group,
              calculateGroupStandings(matches, results, group),
            ]),
          )
        : {},
    [groups, groupsResolved, matches, results],
  );

  const bestThirds = useMemo(
    () => (groupsResolved ? getBestThirdPlacedTeams(standingsByGroup) : []),
    [groupsResolved, standingsByGroup],
  );

  const knockoutMatchesByPhase = useMemo(
    () =>
      groupsResolved && bestThirds.length >= 8
        ? generateKnockoutMatchesByPhase(standingsByGroup, bestThirds, results)
        : {},
    [groupsResolved, standingsByGroup, bestThirds, results],
  );

  const roundOf32Resolved = useMemo(
    () => isKnockoutPhaseResolved(knockoutMatchesByPhase.roundOf32, results),
    [knockoutMatchesByPhase.roundOf32, results],
  );

  const roundOf16Resolved = useMemo(
    () => isKnockoutPhaseResolved(knockoutMatchesByPhase.roundOf16, results),
    [knockoutMatchesByPhase.roundOf16, results],
  );

  const quarterfinalsResolved = useMemo(
    () =>
      isKnockoutPhaseResolved(knockoutMatchesByPhase.quarterfinals, results),
    [knockoutMatchesByPhase.quarterfinals, results],
  );

  const semifinalsResolved = useMemo(
    () => isKnockoutPhaseResolved(knockoutMatchesByPhase.semifinals, results),
    [knockoutMatchesByPhase.semifinals, results],
  );

  const getMatchesForPhase = useCallback(
    (targetPhase: TournamentPhase): PhaseMatch[] => {
      const normalizedPhase = normalizePhase(targetPhase);

      if (normalizedPhase === "groups") return groupPhaseMatches;
      if (normalizedPhase === "roundOf32") {
        return groupsResolved ? (knockoutMatchesByPhase.roundOf32 ?? []) : [];
      }
      if (normalizedPhase === "roundOf16") {
        return roundOf32Resolved
          ? (knockoutMatchesByPhase.roundOf16 ?? [])
          : [];
      }
      if (normalizedPhase === "quarterfinals") {
        return roundOf16Resolved
          ? (knockoutMatchesByPhase.quarterfinals ?? [])
          : [];
      }
      if (normalizedPhase === "semifinals") {
        return quarterfinalsResolved
          ? (knockoutMatchesByPhase.semifinals ?? [])
          : [];
      }
      if (normalizedPhase === "final") {
        return semifinalsResolved ? (knockoutMatchesByPhase.final ?? []) : [];
      }

      return [];
    },
    [
      groupPhaseMatches,
      groupsResolved,
      knockoutMatchesByPhase,
      quarterfinalsResolved,
      roundOf16Resolved,
      roundOf32Resolved,
      semifinalsResolved,
    ],
  );

  const phaseMatches = useMemo(
    () => getMatchesForPhase(phase),
    [getMatchesForPhase, phase],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
    } catch (error) {
      void error;
    }
  }, [predictions]);

  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(predictionStateByPhase));
  }, [predictionStateByPhase]);

  useEffect(() => {
    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    } catch (error) {
      void error;
    }
  }, [results]);

  useEffect(
    () => localStorage.setItem(GROUP_KEY, selectedGroup),
    [selectedGroup],
  );

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(MATCHDAY_KEY, String(selectedMatchday));
  }, [selectedMatchday]);

  useEffect(() => {
    localStorage.setItem(PHASE_KEY, phase);
  }, [phase]);

  const getPrediction = (matchId: number): Prediction => {
    return predictions[phase]?.[matchId] ?? { home: null, away: null };
  };

  const isPredictionComplete = (pred?: Prediction) => {
    return pred !== undefined && pred.home !== null && pred.away !== null;
  };

  const handlePredictionChange = (matchId: number, next: Prediction) => {
    setPredictions((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [matchId]: next,
      },
    }));
  };

  const fillMyPredictionsForCurrentPhase = () => {
    const phaseMatches = getMatchesForPhase(phase);
    if (phaseMatches.length === 0) return;

    const nextPredictions = phaseMatches.reduce<PredictionsByMatchId>(
      (acc, match) => {
        acc[match.id] = {
          home: Math.floor(Math.random() * 5),
          away: Math.floor(Math.random() * 5),
        };
        return acc;
      },
      {},
    );

    setPredictions((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        ...nextPredictions,
      },
    }));
  };

  const setPredictionState = (next: PredictionState) => {
    setPredictionStateByPhase((prev) => ({
      ...prev,
      [phase]: next,
    }));
  };

  const resetDraft = () => {
    setPredictions(emptyPredictionsByPhase);
    setResults({});
    setActivePhase("groups");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULTS_KEY);
    setPredictionStateByPhase(emptyPredictionStateByPhase);
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(emptyPredictionStateByPhase),
    );
    localStorage.setItem(PHASE_KEY, "groups");
  };

  const resetCurrentPhase = () => {
    const phaseMatches = getMatchesForPhase(phase);
    const matchIds = new Set(phaseMatches.map((match) => match.id));

    setPredictions((prev) => ({
      ...prev,
      [phase]: {},
    }));

    setResults((prev) => {
      const next = { ...prev };
      matchIds.forEach((matchId) => {
        delete next[matchId];
      });
      return next;
    });

    setPredictionStateByPhase((prev) => ({
      ...prev,
      [phase]: "draft",
    }));
  };

  const simulateCurrentStage = () => {
    const matchesToSimulate = getMatchesForPhase(phase);
    if (matchesToSimulate.length === 0) return;

    const nextResults: ResultsByMatchId = {
      ...results,
    };

    for (const match of matchesToSimulate) {
      nextResults[match.id] =
        phase === "groups"
          ? { home: randomScore(), away: randomScore() }
          : randomKnockoutScore();
    }

    setResults(nextResults);
    setPredictionState("locked");

    const nextPhase = getNextPhase(phase);
    if (nextPhase) {
      setActivePhase(nextPhase);
    }
  };

  const resetSimulation = () => {
    setPredictions(emptyPredictionsByPhase);
    setResults({});
    setPredictionStateByPhase(emptyPredictionStateByPhase);
    setActivePhase("groups");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULTS_KEY);
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(emptyPredictionStateByPhase),
    );
    localStorage.setItem(PHASE_KEY, "groups");
  };

  const activeGroup = useMemo(() => {
    if (groups.length === 0) return selectedGroup;
    return groups.includes(selectedGroup) ? selectedGroup : groups[0];
  }, [groups, selectedGroup]);

  const activeMatchday = useMemo(() => {
    if (matchdays.length === 0) return selectedMatchday;
    return matchdays.includes(selectedMatchday)
      ? selectedMatchday
      : matchdays[0];
  }, [matchdays, selectedMatchday]);

  const visibleMatches =
    phase === "groups"
      ? viewMode === "matchday"
        ? matches.filter((m) => m.matchday === activeMatchday)
        : matches.filter((m) => m.group === activeGroup)
      : phaseMatches;

  const predictedInGroup = useMemo(() => {
    return visibleMatches.reduce((count, m) => {
      const pred = predictions.groups?.[m.id];
      return count + (isPredictionComplete(pred) ? 1 : 0);
    }, 0);
  }, [visibleMatches, predictions.groups]);

  const totalPredicted = useMemo(() => {
    return phaseMatches.reduce((count, m) => {
      const pred = predictions[phase]?.[m.id];
      return count + (isPredictionComplete(pred) ? 1 : 0);
    }, 0);
  }, [phaseMatches, predictions, phase]);

  const missingPredictionsCount = Math.max(
    phaseMatches.length - totalPredicted,
    0,
  );

  const predictionState: PredictionState =
    rawPredictionState === "submitted" ? "draft" : rawPredictionState;

  const isDraft = predictionState === "draft";
  const isLocked = rawPredictionState === "locked";

  const submissionStatus: SubmissionStatus = isLocked
    ? "locked"
    : "in-progress";

  const getMatchSubmissionStatus = (matchId: number): MatchSubmissionStatus => {
    const pred = predictions[phase]?.[matchId];
    const hasPrediction = isPredictionComplete(pred);

    if (rawPredictionState === "locked") {
      return hasPrediction ? "locked-saved" : "locked-empty";
    }

    return hasPrediction ? "saved" : "empty";
  };

  const isEditable = !isLocked;

  const groupCompletion = useMemo(() => {
    return groups.reduce<Record<GroupId, CompletionStatus>>(
      (acc, group) => {
        const groupMatches = matches.filter((m) => m.group === group);
        const completed = groupMatches.reduce((count, match) => {
          const pred = predictions.groups?.[match.id];
          return count + (isPredictionComplete(pred) ? 1 : 0);
        }, 0);

        if (completed === 0) {
          acc[group] = "empty";
        } else if (completed === groupMatches.length) {
          acc[group] = "complete";
        } else {
          acc[group] = "partial";
        }

        return acc;
      },
      {} as Record<GroupId, CompletionStatus>,
    );
  }, [groups, matches, predictions.groups]);

  const matchdayCompletion = useMemo(() => {
    return matchdays.reduce<Record<number, CompletionStatus>>(
      (acc, day) => {
        const dayMatches = matches.filter((m) => m.matchday === day);
        const completed = dayMatches.reduce((count, match) => {
          const pred = predictions.groups?.[match.id];
          return count + (isPredictionComplete(pred) ? 1 : 0);
        }, 0);

        if (completed === 0) {
          acc[day] = "empty";
        } else if (completed === dayMatches.length) {
          acc[day] = "complete";
        } else {
          acc[day] = "partial";
        }

        return acc;
      },
      {} as Record<number, CompletionStatus>,
    );
  }, [matchdays, matches, predictions.groups]);

  const myPoints = useMemo(() => {
    return phaseOrder.reduce((total, targetPhase) => {
      const matchesForPhase = getMatchesForPhase(targetPhase);
      const phasePredictions = predictions[targetPhase] ?? {};

      return (
        total +
        matchesForPhase.reduce((phaseTotal, match) => {
          const pred = phasePredictions[match.id];
          const res = results[match.id];
          if (!pred || !res) return phaseTotal;
          return phaseTotal + scorePrediction(pred, res);
        }, 0)
      );
    }, 0);
  }, [getMatchesForPhase, predictions, results]);

  return {
    predictions,
    results,
    rawPredictionState,
    selectedGroup: activeGroup,
    groups,
    visibleMatches,
    predictedInGroup,
    totalPredicted,
    totalMatches: phaseMatches.length,
    totalInGroup: visibleMatches.length,
    myPoints,
    setSelectedGroup,
    setPredictionState,
    handlePredictionChange,
    getPrediction,
    resetDraft,
    resetCurrentPhase,
    simulateCurrentStage,
    resetSimulation,
    viewMode,
    setViewMode,
    matchdays,
    selectedMatchday: activeMatchday,
    setSelectedMatchday,
    phase,
    setPhase: setActivePhase,
    getMatchesForPhase,
    fillMyPredictionsForCurrentPhase,
    missingPredictionsCount,
    isDraft,
    isLocked,
    submissionStatus,
    getMatchSubmissionStatus,
    isEditable,
    groupCompletion,
    matchdayCompletion,
  };
}

export type PoolState = ReturnType<typeof usePoolState>;
