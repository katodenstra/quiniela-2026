import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeFriendPoolInsights } from "./friendPoolInsights.ts";
import type { Friend } from "../api/mockApi";
import type { TournamentPhase } from "../state/usePoolState";
import type { FriendPoolInsightPhaseContext } from "./friendPoolInsights.ts";

const friends: Friend[] = [
  { id: "ara", name: "Ara", avatarSeed: "ara" },
  { id: "sofi", name: "Sofi", avatarSeed: "sofi" },
];

function phaseContext(
  phase: TournamentPhase,
  matches: FriendPoolInsightPhaseContext["matches"],
): FriendPoolInsightPhaseContext {
  return { phase, matches };
}

const groups = phaseContext("groups", [
  {
    id: 1,
    homeTeam: { name: "Brazil" },
    awayTeam: { name: "Japan" },
  },
  {
    id: 2,
    homeTeam: { name: "Spain" },
    awayTeam: { name: "Canada" },
  },
]);

const roundOf32 = phaseContext("roundOf32", [
  {
    id: 73,
    homeTeam: { teamName: "Brazil" },
    awayTeam: { teamName: "Spain" },
  },
]);

describe("computeFriendPoolInsights", () => {
  it("returns the team with the highest aggregated points", () => {
    const insights = computeFriendPoolInsights({
      friends,
      resolvedPhaseContexts: [groups],
      results: {
        1: { home: 2, away: 0 },
        2: { home: 1, away: 1 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
            2: { home: 2, away: 1 },
          },
          sofi: {
            1: { home: 1, away: 0 },
            2: { home: 0, away: 1 },
          },
        },
      },
    });

    assert.deepEqual(insights.mostReliableTeam, {
      teamName: "Brazil",
      points: 4,
    });
  });

  it("returns the team with the lowest aggregated points", () => {
    const insights = computeFriendPoolInsights({
      friends,
      resolvedPhaseContexts: [groups],
      results: {
        1: { home: 2, away: 0 },
        2: { home: 1, away: 1 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
            2: { home: 2, away: 1 },
          },
          sofi: {
            1: { home: 1, away: 0 },
            2: { home: 0, away: 1 },
          },
        },
      },
    });

    assert.deepEqual(insights.leastPredictableTeam, {
      teamName: "Canada",
      points: 0,
    });
  });

  it("ignores missing predictions and missing results safely", () => {
    const insights = computeFriendPoolInsights({
      friends,
      resolvedPhaseContexts: [groups],
      results: {
        1: { home: 2, away: 0 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
            2: { home: 1, away: 1 },
          },
          sofi: {},
        },
      },
    });

    assert.equal(insights.pointsByTeam.Brazil, 3);
    assert.equal(insights.pointsByTeam.Japan, 3);
    assert.equal(insights.pointsByTeam.Spain, undefined);
    assert.equal(insights.pointsByTeam.Canada, undefined);
  });

  it("aggregates across all scorable resolved phases", () => {
    const insights = computeFriendPoolInsights({
      friends,
      resolvedPhaseContexts: [groups, roundOf32],
      results: {
        1: { home: 2, away: 0 },
        2: { home: 1, away: 1 },
        73: { home: 3, away: 1 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
            2: { home: 2, away: 1 },
          },
          sofi: {
            1: { home: 1, away: 0 },
            2: { home: 0, away: 1 },
          },
        },
        roundOf32: {
          ara: {
            73: { home: 3, away: 1 },
          },
          sofi: {
            73: { home: 2, away: 0 },
          },
        },
      },
    });

    assert.equal(insights.pointsByTeam.Brazil, 8);
    assert.equal(insights.pointsByTeam.Spain, 4);
  });

  it("uses team name as deterministic tie-breaker", () => {
    const insights = computeFriendPoolInsights({
      friends: [friends[0]],
      resolvedPhaseContexts: [groups],
      results: {
        1: { home: 2, away: 0 },
        2: { home: 1, away: 1 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
            2: { home: 1, away: 1 },
          },
        },
      },
    });

    assert.deepEqual(insights.mostReliableTeam, {
      teamName: "Brazil",
      points: 3,
    });
    assert.deepEqual(insights.leastPredictableTeam, {
      teamName: "Brazil",
      points: 3,
    });
  });

  it("does not double count a match for the same friend prediction", () => {
    const insights = computeFriendPoolInsights({
      friends: [friends[0]],
      resolvedPhaseContexts: [groups],
      results: {
        1: { home: 2, away: 0 },
      },
      friendPredictionsByPhase: {
        groups: {
          ara: {
            1: { home: 2, away: 0 },
          },
        },
      },
    });

    assert.deepEqual(insights.pointsByTeam, {
      Brazil: 3,
      Japan: 3,
    });
  });

  it("returns safe empty output when there is no usable data", () => {
    const insights = computeFriendPoolInsights({
      friends,
      resolvedPhaseContexts: [],
      results: {},
      friendPredictionsByPhase: {},
    });

    assert.deepEqual(insights, {
      mostReliableTeam: null,
      leastPredictableTeam: null,
      pointsByTeam: {},
    });
  });
});
