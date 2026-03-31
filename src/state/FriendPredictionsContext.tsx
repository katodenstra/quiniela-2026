/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import type { PredictionsByMatchId, TournamentPhase } from "./usePoolState";

type FriendPredictionsStore = Record<
  TournamentPhase,
  Record<string, PredictionsByMatchId>
>;

type FriendPredictionsContextValue = {
  generatedFriendPredictions: FriendPredictionsStore;
  setGeneratedFriendPredictionsForPhase: (
    phase: TournamentPhase,
    predictions: Record<string, PredictionsByMatchId>,
  ) => void;
  clearGeneratedFriendPredictionsForPhase: (phase: TournamentPhase) => void;
  clearGeneratedFriendPredictions: () => void;
};

const emptyStore: FriendPredictionsStore = {
  groups: {},
  roundOf32: {},
  roundOf16: {},
  roundOf8: {},
  quarterfinals: {},
  semifinals: {},
  final: {},
};

const FriendPredictionsContext =
  createContext<FriendPredictionsContextValue | null>(null);

export function FriendPredictionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [generatedFriendPredictions, setGeneratedFriendPredictions] =
    useState<FriendPredictionsStore>(emptyStore);

  const value = useMemo<FriendPredictionsContextValue>(
    () => ({
      generatedFriendPredictions,
      setGeneratedFriendPredictionsForPhase: (phase, predictions) => {
        setGeneratedFriendPredictions((prev) => ({
          ...prev,
          [phase]: predictions,
        }));
      },
      clearGeneratedFriendPredictions: () => {
        setGeneratedFriendPredictions(emptyStore);
      },
      clearGeneratedFriendPredictionsForPhase: (phase) => {
        setGeneratedFriendPredictions((prev) => ({
          ...prev,
          [phase]: {},
        }));
      },
    }),
    [generatedFriendPredictions],
  );

  return (
    <FriendPredictionsContext.Provider value={value}>
      {children}
    </FriendPredictionsContext.Provider>
  );
}

export function useFriendPredictions() {
  const context = useContext(FriendPredictionsContext);

  if (!context) {
    throw new Error(
      "useFriendPredictions must be used within FriendPredictionsProvider",
    );
  }

  return context;
}
