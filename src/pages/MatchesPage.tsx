import { useMemo, useState } from "react";
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

import ScrollableTabs from "../components/ScrollableTabs";

type MatchFilter = "all" | "predicted" | "unpredicted";

function formatMatchDateLabel(date: string, time: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} • ${time}`;
}

function MatchesPage({ matches }: { matches: GroupStageMatch[] }) {
  const pool = usePoolState(matches);
  const {
    setGeneratedFriendPredictionsForPhase,
    generatedFriendPredictions,
    clearGeneratedFriendPredictionsForPhase,
    clearGeneratedFriendPredictions,
  } = useFriendPredictions();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const isGroupPhase = pool.phase === "groups";
  const isRoundOf32Phase = pool.phase === "roundOf32";

  const hasGroupResults =
    matches.length > 0 &&
    matches.every((match) => pool.results[match.id] !== undefined);

  const showStandings =
    isGroupPhase &&
    pool.viewMode === "group" &&
    hasGroupResults &&
    pool.visibleMatches.length > 0;

  const standingsByGroup = hasGroupResults
    ? Object.fromEntries(
        pool.groups.map((group) => [
          group,
          calculateGroupStandings(matches, pool.results, group),
        ]),
      )
    : {};

  const qualifiedThirdGroups = hasGroupResults
    ? getQualifiedThirdGroupSet(standingsByGroup)
    : new Set<string>();

  const standings = showStandings
    ? (standingsByGroup[pool.selectedGroup] ?? [])
    : [];

  const bestThirds = hasGroupResults
    ? getBestThirdPlacedTeams(standingsByGroup)
    : [];

  const roundOf32 =
    hasGroupResults && bestThirds.length >= 8
      ? generateRoundOf32(standingsByGroup, bestThirds)
      : [];

  const knockoutMatches = pool.phase === "roundOf32" ? roundOf32 : [];

  const filteredVisibleMatches = useMemo(() => {
    return pool.visibleMatches.filter((match) => {
      const status = pool.getMatchSubmissionStatus(match.id);
      const isPredicted = status === "saved" || status === "locked-saved";

      if (matchFilter === "predicted") return isPredicted;
      if (matchFilter === "unpredicted") return !isPredicted;
      return true;
    });
  }, [pool.visibleMatches, pool, matchFilter]);

  const filteredKnockoutMatches = useMemo(() => {
    return knockoutMatches.filter((match) => {
      const status = pool.getMatchSubmissionStatus(match.id);
      const isPredicted = status === "saved" || status === "locked-saved";

      if (matchFilter === "predicted") return isPredicted;
      if (matchFilter === "unpredicted") return !isPredicted;
      return true;
    });
  }, [knockoutMatches, pool, matchFilter]);

  const roundOf32PredictedCount = useMemo(() => {
    return knockoutMatches.reduce((count, match) => {
      const pred = pool.getPrediction(match.id);
      const isComplete = pred.home !== null && pred.away !== null;
      return count + (isComplete ? 1 : 0);
    }, 0);
  }, [knockoutMatches, pool]);

  const roundOf32MissingCount = Math.max(
    knockoutMatches.length - roundOf32PredictedCount,
    0,
  );

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
      {isGroupPhase && (
        <PageIntro
          title="Matches"
          description="Enter predictions, track saved progress and simulate the group stage."
        />
      )}
      {isGroupPhase && (
        <>
          {/* Action bar */}
          <ActionBar
            submissionStatus={pool.submissionStatus}
            missingPredictionsCount={pool.missingPredictionsCount}
          />
          {!pool.isEditable && (
            <div
              className="widget"
              style={{
                marginBottom: "1rem",
                padding: "0.95rem 1rem",
                borderRadius: "18px",
                color: "var(--text-secondary)",
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              Predictions are locked. You can review them, but they can no
              longer be edited.
            </div>
          )}

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
            <ScrollableTabs ariaLabel="Group tabs">
              <GroupTabs
                groups={pool.groups}
                selectedGroup={pool.selectedGroup}
                onChange={pool.setSelectedGroup}
                completion={pool.groupCompletion}
              />
            </ScrollableTabs>
          ) : (
            <ScrollableTabs ariaLabel="Matchday tabs">
              {pool.matchdays.map((day) => {
                const isActive = pool.selectedMatchday === day;
                const status = pool.matchdayCompletion[day] ?? "empty";

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
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.55rem",
                      }}
                    >
                      <span>Matchday {day}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "0.55rem",
                          height: "0.55rem",
                          borderRadius: "999px",
                          background:
                            status === "complete"
                              ? "var(--success-600, #47b881)"
                              : status === "partial"
                                ? "var(--warning-600, #ffad0d)"
                                : "rgba(255,255,255,0.2)",
                          boxShadow:
                            status === "empty"
                              ? "none"
                              : "0 0 0 4px rgba(255,255,255,0.03)",
                          flexShrink: 0,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </ScrollableTabs>
          )}

          {/* Progress + filter */}
          <div
            style={{
              maxWidth: "980px",
              margin: "0 auto 1.25rem",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontWeight: 500,
                fontSize: "0.98rem",
                whiteSpace: "nowrap",
                flex: "1 1 auto",
                minWidth: 0,
              }}
            >
              {pool.viewMode === "group"
                ? `${pool.totalInGroup - pool.predictedInGroup} remaining in Group ${pool.selectedGroup}`
                : `${pool.totalInGroup - pool.predictedInGroup} remaining in Matchday ${pool.selectedMatchday}`}{" "}
              • {pool.totalPredicted}/{pool.totalMatches} saved
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "nowrap",
                justifyContent: "flex-end",
                flex: "0 0 auto",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "0.94rem",
                }}
              >
                Filter matches by:
              </span>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {[
                  { key: "all", label: "All matches" },
                  { key: "predicted", label: "Predicted" },
                  { key: "unpredicted", label: "Not predicted" },
                ].map((option) => {
                  const isActive = matchFilter === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMatchFilter(option.key as MatchFilter)}
                      style={{
                        border: "none",
                        background: isActive
                          ? "rgba(58, 112, 226, 0.20)"
                          : "transparent",
                        color: isActive
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        padding: "0.5rem 0.8rem",
                        borderRadius: "999px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
            {filteredVisibleMatches.map((match) => {
              const pred = pool.getPrediction(match.id);
              const res = pool.results[match.id];
              const pts = res ? scorePrediction(pred, res) : undefined;
              const matchSubmissionStatus = pool.getMatchSubmissionStatus(
                match.id,
              );
              const headerContextLabel =
                pool.viewMode === "group"
                  ? `Matchday ${match.matchday}`
                  : `Group ${match.group}`;
              const headerDateLabel = formatMatchDateLabel(
                match.date,
                match.time,
              );
              const showSavedIndicator = matchSubmissionStatus === "saved";

              return (
                <MatchCard
                  key={match.id}
                  matchId={match.id}
                  homeTeamName={match.homeTeam.name}
                  homeTeamCode={match.homeTeam.code}
                  awayTeamName={match.awayTeam.name}
                  awayTeamCode={match.awayTeam.code}
                  kickoff={`${match.date} ${match.time}`}
                  headerContextLabel={headerContextLabel}
                  headerDateLabel={headerDateLabel}
                  venue={match.venue}
                  round={match.round}
                  prediction={pred}
                  onPredictionChange={pool.handlePredictionChange}
                  isLocked={!pool.isEditable}
                  result={res}
                  points={pts}
                  showSavedIndicator={showSavedIndicator}
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
            submissionStatus={pool.submissionStatus}
            missingPredictionsCount={pool.missingPredictionsCount}
          />
          {!pool.isEditable && (
            <div
              className="widget"
              style={{
                marginBottom: "1rem",
                padding: "0.95rem 1rem",
                borderRadius: "18px",
                color: "var(--text-secondary)",
                fontWeight: 500,
                lineHeight: 1.45,
              }}
            >
              Predictions are locked. You can review them, but they can no
              longer be edited.
            </div>
          )}

          <div
            style={{
              maxWidth: "980px",
              margin: "0 auto 1.25rem",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontWeight: 500,
                fontSize: "0.98rem",
                whiteSpace: "nowrap",
                flex: "1 1 auto",
                minWidth: 0,
              }}
            >
              {roundOf32MissingCount} remaining in Round of 32 •{" "}
              {roundOf32PredictedCount}/{knockoutMatches.length} saved{" "}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "0.94rem",
                }}
              >
                Filter matches by:
              </span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {[
                  { key: "all", label: "All matches" },
                  { key: "predicted", label: "Predicted" },
                  { key: "unpredicted", label: "Not predicted" },
                ].map((option) => {
                  const isActive = matchFilter === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMatchFilter(option.key as MatchFilter)}
                      style={{
                        border: "none",
                        background: isActive
                          ? "rgba(58, 112, 226, 0.20)"
                          : "transparent",
                        color: isActive
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        padding: "0.5rem 0.8rem",
                        borderRadius: "999px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div
            style={{
              maxWidth: "980px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {filteredKnockoutMatches.length === 0 && (
              <div
                className="widget"
                style={{
                  padding: "1rem 1.1rem",
                  borderRadius: "18px",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {matchFilter === "all"
                  ? "Round of 32 matches are not available yet."
                  : "No matches match the current filter."}
              </div>
            )}

            {filteredKnockoutMatches.map((match) => {
              const pred = pool.getPrediction(match.id);
              const matchSubmissionStatus = pool.getMatchSubmissionStatus(
                match.id,
              );
              const headerContextLabel = "Round of 32";
              const headerDateLabel = formatMatchDateLabel(
                match.date,
                match.time,
              );
              const showSavedIndicator = matchSubmissionStatus === "saved";

              return (
                <MatchCard
                  key={match.id}
                  matchId={match.id}
                  homeTeamName={match.homeTeam.teamName}
                  homeTeamCode={match.homeTeam.teamCode}
                  awayTeamName={match.awayTeam.teamName}
                  awayTeamCode={match.awayTeam.teamCode}
                  kickoff={`${match.date} • ${match.time}`}
                  headerContextLabel={headerContextLabel}
                  headerDateLabel={headerDateLabel}
                  venue={match.venue}
                  round={match.round}
                  prediction={pred}
                  onPredictionChange={pool.handlePredictionChange}
                  isLocked={!pool.isEditable}
                  showSavedIndicator={showSavedIndicator}
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
