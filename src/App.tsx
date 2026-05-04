import { useMemo, useState } from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import MatchesPage from "./pages/MatchesPage";
import BreakdownPage from "./pages/BreakdownPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import FriendsPage from "./pages/FriendsPage";
import FriendPage from "./pages/FriendPage";
import AppShell from "./components/AppShell";
import { groupStageMatches } from "./data/worldcup";
import {
  FriendPredictionsProvider,
  useFriendPredictions,
} from "./state/FriendPredictionsContext";
import { usePoolState } from "./state/usePoolState";
import AdminSimulationPanel from "./components/AdminSimulationPanel";
import { getAllFriendPredictions } from "./api/mockApi";

const matches = groupStageMatches;

function getSimulationDayLabel(matchday?: number, date?: string) {
  if (typeof matchday === "number") {
    return `Matchday ${matchday}`;
  }

  return date ?? "Unknown day";
}

function AppRoutes() {
  const pool = usePoolState(matches);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [selectedSimulationDayState, setSelectedSimulationDay] = useState("");
  const {
    setGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictions,
  } = useFriendPredictions();

  const availableSimulationDays = useMemo(() => {
    const phaseMatches = pool.getMatchesForPhase(pool.phase);
    const unresolvedMatches = phaseMatches.filter(
      (match) => pool.results[match.id] === undefined,
    );

    const dayMap = new Map<
      string,
      {
        value: string;
        label: string;
        sortKey: number | string;
      }
    >();

    unresolvedMatches.forEach((match) => {
      if (!match.date) return;

      const rawMatchday = "matchday" in match ? match.matchday : null;
      const matchday = typeof rawMatchday === "number" ? rawMatchday : null;

      if (!dayMap.has(match.date)) {
        dayMap.set(match.date, {
          value: match.date,
          label: getSimulationDayLabel(matchday ?? undefined, match.date),
          sortKey: matchday ?? match.date,
        });
      }
    });

    return Array.from(dayMap.values())
      .sort((a, b) => {
        if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
          return a.sortKey - b.sortKey;
        }

        return String(a.value).localeCompare(String(b.value));
      })
      .map(({ value, label }) => ({ value, label }));
  }, [pool]);

  const selectedSimulationDay = useMemo(() => {
    if (availableSimulationDays.length === 0) {
      return "";
    }

    return availableSimulationDays.some(
      (option) => option.value === selectedSimulationDayState,
    )
      ? selectedSimulationDayState
      : availableSimulationDays[0].value;
  }, [availableSimulationDays, selectedSimulationDayState]);

  const handleGenerateFriendsPredictions = async () => {
    const next = await getAllFriendPredictions(pool.phase);
    setGeneratedFriendPredictionsForPhase(pool.phase, next);
  };

  const handleResetCurrentPhase = () => {
    clearGeneratedFriendPredictionsForPhase(pool.phase);
    pool.resetCurrentPhase();
    setSelectedSimulationDay("");
  };

  const handleResetTournament = () => {
    clearGeneratedFriendPredictions();
    pool.resetSimulation();
    setSelectedSimulationDay("");
  };

  const handleRunSelectedDaySimulation = () => {
    if (!selectedSimulationDay) return;
    pool.simulateSelectedDay(selectedSimulationDay);
  };

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={<MatchesPage matches={matches} pool={pool} />}
          />
          <Route
            path="/breakdown"
            element={<BreakdownPage matches={matches} pool={pool} />}
          />
          <Route
            path="/leaderboard"
            element={<LeaderboardPage matches={matches} pool={pool} />}
          />
          <Route
            path="/friends"
            element={<FriendsPage matches={matches} pool={pool} />}
          />
          <Route
            path="/friends/:friendId"
            element={<FriendPage matches={matches} pool={pool} />}
          />
        </Routes>
      </AppShell>

      <AdminSimulationPanel
        open={adminPanelOpen}
        onOpen={() => setAdminPanelOpen(true)}
        onClose={() => setAdminPanelOpen(false)}
        phase={pool.phase}
        setPhase={pool.setPhase}
        onRunSimulation={pool.simulateCurrentStage}
        onResetPhase={handleResetCurrentPhase}
        onResetTournament={handleResetTournament}
        onFillMyPredictions={pool.fillMyPredictionsForCurrentPhase}
        onGenerateFriendsPredictions={handleGenerateFriendsPredictions}
        availableSimulationDays={availableSimulationDays}
        selectedSimulationDay={selectedSimulationDay}
        setSelectedSimulationDay={setSelectedSimulationDay}
        onRunSelectedDaySimulation={handleRunSelectedDaySimulation}
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <FriendPredictionsProvider>
      <AppRoutes />
    </FriendPredictionsProvider>
  );
}

export default App;
