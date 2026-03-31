import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import MatchesPage from "./pages/MatchesPage";
import BreakdownPage from "./pages/BreakdownPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import FriendsPage from "./pages/FriendsPage";
import FriendPage from "./pages/FriendPage";
import AppShell from "./components/AppShell";
import { groupStageMatches } from "./data/worldcup";
import { FriendPredictionsProvider } from "./state/FriendPredictionsContext";

const matches = groupStageMatches;

function App() {
  return (
    <FriendPredictionsProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<MatchesPage matches={matches} />} />
            <Route
              path="/breakdown"
              element={<BreakdownPage matches={matches} />}
            />
            <Route
              path="/leaderboard"
              element={<LeaderboardPage matches={matches} />}
            />
            <Route path="/friends" element={<FriendsPage />} />
            <Route
              path="/friends/:friendId"
              element={<FriendPage matches={matches} />}
            />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </FriendPredictionsProvider>
  );
}

export default App;
