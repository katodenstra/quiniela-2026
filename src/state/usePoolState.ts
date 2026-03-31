import { useEffect, useMemo, useState } from "react";
import type { AppGroupId as GroupId, ViewMode } from "../data/worldcup";

export type Prediction = { home: number; away: number };
export type PredictionsByMatchId = Record<number, Prediction>;
export type PredictionState = "draft" | "submitted" | "locked";
export type PredictionStateByPhase = Record<TournamentPhase, PredictionState>;
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

export function getOutcome(home: number, away: number) {
  if (home === away) return "draw";
  return home > away ? "home" : "away";
}

export function scorePrediction(pred: Prediction, res: Result) {
  if (pred.home === res.home && pred.away === res.away) return 3;

  const predOutcome = getOutcome(pred.home, pred.away);
  const resOutcome = getOutcome(res.home, res.away);
  if (predOutcome === resOutcome) return 1;

  return 0;
}

export function randomScore() {
  return Math.floor(Math.random() * 5);
}

export function usePoolState<
  M extends { id: number; group: GroupId | null; matchday?: number | null },
>(matches: M[]) {
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
      return raw;
    }
    return "groups";
  });

  const predictionState = predictionStateByPhase[phase];

  useEffect(
    () => localStorage.setItem(GROUP_KEY, selectedGroup),
    [selectedGroup],
  );
  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(predictionStateByPhase));
  }, [predictionStateByPhase]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
    } catch (error) {
      void error;
    }
  }, [predictions]);

  useEffect(() => {
    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    } catch (error) {
      void error;
    }
  }, [results]);

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
    return predictions[phase]?.[matchId] ?? { home: 0, away: 0 };
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
    let phaseMatches: M[];

    if (phase === "groups") {
      phaseMatches = matches.filter((match) => match.group !== null);
    } else {
      phaseMatches = visibleMatches;
    }

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
    setPhase("groups");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULTS_KEY);
    setPredictionStateByPhase(emptyPredictionStateByPhase);
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(emptyPredictionStateByPhase),
    );
    localStorage.setItem(PHASE_KEY, "groups");
  };

  const simulateCurrentStage = () => {
    const nextResults: ResultsByMatchId = {
      ...results,
    };

    for (const match of visibleMatches) {
      nextResults[match.id] = { home: randomScore(), away: randomScore() };
    }

    setResults(nextResults);
    setPredictionState("locked");

    if (phase === "groups") {
      setPhase("roundOf32");
    }
  };

  const resetSimulation = () => {
    setResults({});
    setPredictionStateByPhase(emptyPredictionStateByPhase);
    setPhase("groups");
    localStorage.removeItem(RESULTS_KEY);
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(emptyPredictionStateByPhase),
    );
    localStorage.setItem(PHASE_KEY, "groups");
  };

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
    viewMode === "matchday"
      ? matches.filter((m) => m.matchday === activeMatchday)
      : matches.filter((m) => m.group === activeGroup);

  const predictedInGroup = useMemo(() => {
    return visibleMatches.reduce(
      (count, m) => count + (predictions[phase]?.[m.id] !== undefined ? 1 : 0),
      0,
    );
  }, [visibleMatches, predictions, phase]);

  const totalPredicted = useMemo(() => {
    return visibleMatches.reduce((count, m) => {
      return count + (predictions[phase]?.[m.id] !== undefined ? 1 : 0);
    }, 0);
  }, [visibleMatches, predictions, phase]);

  const myPoints = useMemo(() => {
    const groupPredictions = predictions.groups ?? {};

    return matches.reduce((total, match) => {
      const pred = groupPredictions[match.id];
      const res = results[match.id];
      if (!pred || !res) return total;
      return total + scorePrediction(pred, res);
    }, 0);
  }, [matches, predictions, results]);

  return {
    predictions,
    results,
    predictionState,
    selectedGroup: activeGroup,
    groups,
    visibleMatches,
    predictedInGroup,
    totalPredicted,
    totalMatches: visibleMatches.length,
    totalInGroup: visibleMatches.length,
    myPoints,
    setSelectedGroup,
    setPredictionState,
    handlePredictionChange,
    getPrediction,
    resetDraft,
    simulateCurrentStage,
    resetSimulation,
    viewMode,
    setViewMode,
    matchdays,
    selectedMatchday: activeMatchday,
    setSelectedMatchday,
    phase,
    setPhase,
    fillMyPredictionsForCurrentPhase,
  };
}
