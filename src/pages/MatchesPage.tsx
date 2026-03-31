import { useState } from "react";
import MatchCard from "../components/MatchCard";
import GroupTabs from "../components/GroupTabs";
import ActionBar from "../components/ActionBar";
import { scorePrediction, usePoolState } from "../state/usePoolState";
import PageIntro from "../components/PageIntro";
import type { GroupStageMatch } from "../data/worldcup";
import GroupStandingsTable from "../components/GroupStandingsTable";
import { calculateGroupStandings } from "../data/standings";
import BestThirdsTable from "../components/BestThirdsTable";
import {
  getBestThirdPlacedTeams,
  getQualifiedThirdGroupSet,
  getQualificationStatus,
} from "../data/qualification";
import KnockoutBracket from "../components/KnockoutBracket";
import { generateRoundOf32 } from "../data/knockout";
import AdminSimulationPanel from "../components/AdminSimulationPanel";
import { getAllFriendPredictions } from "../api/mockApi";
import { useFriendPredictions } from "../state/FriendPredictionsContext";

function MatchesPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const {
    setGeneratedFriendPredictionsForPhase,
    generatedFriendPredictions,
    clearGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictions,
  } = useFriendPredictions();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const isGroupPhase = pool.phase === "groups";
  const isRoundOf32Phase = pool.phase === "roundOf32";

  const showStandings =
    pool.viewMode === "group" &&
    pool.predictionState === "locked" &&
    pool.visibleMatches.length > 0;

  const standingsByGroup = showStandings
    ? Object.fromEntries(
        pool.groups.map((group) => [
          group,
          calculateGroupStandings(matches, pool.results, group),
        ]),
      )
    : {};

  const qualifiedThirdGroups = showStandings
    ? getQualifiedThirdGroupSet(standingsByGroup)
    : new Set<string>();

  const standings = showStandings
    ? (standingsByGroup[pool.selectedGroup] ?? [])
    : [];

  const bestThirds = showStandings
    ? getBestThirdPlacedTeams(standingsByGroup)
    : [];

  const roundOf32 =
    showStandings && bestThirds.length >= 8
      ? generateRoundOf32(standingsByGroup, bestThirds)
      : [];

  const knockoutMatches = pool.phase === "roundOf32" ? roundOf32 : [];

  const handleGenerateFriendsPredictions = async () => {
    const next = await getAllFriendPredictions(pool.phase);
    setGeneratedFriendPredictionsForPhase(pool.phase, next);
    console.log("Generated friend predictions for phase:", pool.phase, next);
  };

  const handleResetCurrentPhase = () => {
    clearGeneratedFriendPredictionsForPhase(pool.phase);
    pool.resetDraft();
  };

  const handleResetTournament = () => {
    clearGeneratedFriendPredictions();
    pool.resetSimulation();
  };

  const generatedFriendsCount = Object.keys(
    generatedFriendPredictions[pool.phase] ?? {},
  ).length;

  return (
    <section>
      <PageIntro
        title="Matches"
        description="Enter predictions, manage submission state and simulate the group stage."
      />
      {isGroupPhase && (
        <>
          {/* Action bar */}
          <ActionBar
            predictionState={pool.predictionState}
            setPredictionState={pool.setPredictionState}
            resetDraft={pool.resetDraft}
            simulateCurrentStage={pool.simulateCurrentStage}
            resetSimulation={pool.resetSimulation}
            totalPredicted={pool.totalPredicted}
            totalMatches={pool.totalMatches}
            myPoints={pool.myPoints}
            showPoints={pool.predictionState === "locked"}
            phase={pool.phase}
          />
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => pool.setViewMode("group")}
              style={{
                border: "1px solid var(--border-subtle)",
                background:
                  pool.viewMode === "group"
                    ? "rgba(58, 112, 226, 0.20)"
                    : "rgba(255,255,255,0.04)",
                color:
                  pool.viewMode === "group"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                padding: "0.6rem 0.95rem",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              By group
            </button>

            <button
              type="button"
              onClick={() => pool.setViewMode("matchday")}
              style={{
                border: "1px solid var(--border-subtle)",
                background:
                  pool.viewMode === "matchday"
                    ? "rgba(58, 112, 226, 0.20)"
                    : "rgba(255,255,255,0.04)",
                color:
                  pool.viewMode === "matchday"
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                padding: "0.6rem 0.95rem",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              By matchday
            </button>
          </div>
          {/* Group tabs */}
          {pool.viewMode === "group" ? (
            <GroupTabs
              groups={pool.groups}
              selectedGroup={pool.selectedGroup}
              onChange={pool.setSelectedGroup}
            />
          ) : (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {pool.matchdays.map((day) => {
                const isActive = pool.selectedMatchday === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pool.setSelectedMatchday(day)}
                    style={{
                      border: "1px solid",
                      borderColor: isActive
                        ? "rgba(58, 112, 226, 0.45)"
                        : "var(--border-subtle)",
                      background: isActive
                        ? "rgba(58, 112, 226, 0.20)"
                        : "rgba(255,255,255,0.04)",
                      color: isActive
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                      padding: "0.6rem 0.95rem",
                      borderRadius: "999px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    Matchday {day}
                  </button>
                );
              })}
            </div>
          )}

          {/* Progress */}
          <div
            style={{
              marginBottom: "1.25rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "0.98rem",
            }}
          >
            {pool.viewMode === "group"
              ? `Group ${pool.selectedGroup}`
              : `Matchday ${pool.selectedMatchday}`}{" "}
            — {pool.predictedInGroup}/{pool.totalInGroup} predicted • Total:{" "}
            {pool.totalPredicted}/{pool.totalMatches}
          </div>

          {showStandings && standings.length > 0 && (
            <GroupStandingsTable
              group={pool.selectedGroup}
              rows={standings}
              getRowStatus={(index) =>
                getQualificationStatus(
                  pool.selectedGroup,
                  index,
                  qualifiedThirdGroups,
                )
              }
            />
          )}

          {showStandings && bestThirds.length > 0 && (
            <BestThirdsTable rows={bestThirds} />
          )}

          {showStandings && roundOf32.length > 0 && (
            <KnockoutBracket matches={roundOf32} />
          )}

          {/* Cards container */}
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {" "}
            {pool.visibleMatches.map((match) => {
              const pred = pool.getPrediction(match.id);
              const res = pool.results[match.id];
              const pts = res ? scorePrediction(pred, res) : undefined;

              return (
                <MatchCard
                  key={match.id}
                  matchId={match.id}
                  homeTeamName={match.homeTeam.name}
                  homeTeamCode={match.homeTeam.code}
                  awayTeamName={match.awayTeam.name}
                  awayTeamCode={match.awayTeam.code}
                  kickoff={`${match.date} ${match.time}`}
                  venue={match.venue}
                  round={match.round}
                  prediction={pred}
                  onPredictionChange={pool.handlePredictionChange}
                  isLocked={pool.predictionState === "locked"}
                  result={res}
                  points={pts}
                />
              );
            })}
          </div>
        </>
      )}

      {isRoundOf32Phase && (
        <>
          <PageIntro
            title="Round of 32"
            description="Group stage is complete. Now predict the first knockout round."
          />

          <ActionBar
            phase={pool.phase}
            predictionState={pool.predictionState}
            setPredictionState={pool.setPredictionState}
            resetDraft={pool.resetDraft}
            simulateCurrentStage={pool.simulateCurrentStage}
            resetSimulation={pool.resetSimulation}
            totalPredicted={pool.totalPredicted}
            totalMatches={knockoutMatches.length}
            myPoints={pool.myPoints}
            showPoints={false}
          />

          <div
            style={{
              marginBottom: "1.25rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
              fontSize: "0.98rem",
            }}
          >
            Round of 32 — {pool.predictedInGroup}/{knockoutMatches.length}{" "}
            predicted
          </div>

          <div
            style={{
              maxWidth: "980px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {knockoutMatches.map((match) => {
              const pred = pool.getPrediction(match.id);

              return (
                <MatchCard
                  key={match.id}
                  matchId={match.id}
                  homeTeamName={match.homeTeam.teamName}
                  homeTeamCode={match.homeTeam.teamCode}
                  awayTeamName={match.awayTeam.teamName}
                  awayTeamCode={match.awayTeam.teamCode}
                  kickoff={`${match.date} • ${match.time}`}
                  venue={match.venue}
                  round={match.round}
                  prediction={pred}
                  onPredictionChange={pool.handlePredictionChange}
                  isLocked={false}
                />
              );
            })}
          </div>
        </>
      )}
      {generatedFriendsCount > 0 && (
        <div
          style={{
            position: "fixed",
            top: "1.25rem",
            right: "7.5rem",
            zIndex: 999,
            padding: "0.55rem 0.8rem",
            borderRadius: "999px",
            border: "1px solid var(--border-subtle)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "var(--shadow-soft)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {generatedFriendsCount} friend sets loaded
        </div>
      )}
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
    </section>
  );
}

export default MatchesPage;
