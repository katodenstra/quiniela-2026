import { useState } from "react";
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

function AppRoutes() {
  const pool = usePoolState(matches);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const {
    setGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictions,
  } = useFriendPredictions();

  const handleGenerateFriendsPredictions = async () => {
    const next = await getAllFriendPredictions(pool.phase);
    setGeneratedFriendPredictionsForPhase(pool.phase, next);
  };

  const handleResetCurrentPhase = () => {
    clearGeneratedFriendPredictionsForPhase(pool.phase);
    pool.resetCurrentPhase();
  };

  const handleResetTournament = () => {
    clearGeneratedFriendPredictions();
    pool.resetSimulation();
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
