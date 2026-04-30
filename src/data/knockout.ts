import type { ThirdPlaceRow } from "./qualification";
import type { GroupStandingRow } from "./standings";
import type { ResultsByMatchId, TournamentPhase } from "../state/usePoolState";

export type KnockoutTeam = {
  source: string;
  teamName: string;
  teamCode: string | null;
  sourceMatchId?: number;
};

export type KnockoutMatch = {
  id: number;
  label: string;
  stage: Exclude<TournamentPhase, "groups" | "roundOf8">;
  group: null;
  round: string;
  matchday: null;
  date: string;
  time: string;
  venue: string;
  homeTeam: KnockoutTeam;
  awayTeam: KnockoutTeam;
  homeSourceMatchId?: number;
  awaySourceMatchId?: number;
};

export type KnockoutMatchesByPhase = Partial<
  Record<TournamentPhase, KnockoutMatch[]>
>;

type GroupCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

type BestThirdSlot = {
  winnerGroup: GroupCode;
  candidates: GroupCode[];
};

const GROUPS: GroupCode[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

// Central matrix for the Round of 32 slots where a group winner faces a
// qualified third-placed team. The selected third-place groups are assigned
// through this explicit compatibility table; no random pairing is used.
const BEST_THIRD_PAIRING_MATRIX: BestThirdSlot[] = [
  { winnerGroup: "E", candidates: ["A", "B", "C", "D", "F"] },
  { winnerGroup: "I", candidates: ["C", "D", "F", "G", "H"] },
  { winnerGroup: "A", candidates: ["C", "E", "F", "H", "I"] },
  { winnerGroup: "L", candidates: ["E", "H", "I", "J", "K"] },
  { winnerGroup: "D", candidates: ["B", "E", "F", "I", "J"] },
  { winnerGroup: "G", candidates: ["A", "E", "H", "I", "J"] },
  { winnerGroup: "B", candidates: ["E", "F", "G", "I", "J"] },
  { winnerGroup: "K", candidates: ["D", "E", "I", "J", "L"] },
];

const ROUND_OF_32_FIXTURES = [
  {
    id: 73,
    date: "2026-06-28",
    venue: "Los Angeles Stadium",
    home: "2A",
    away: "2B",
  },
  {
    id: 74,
    date: "2026-06-29",
    venue: "Boston Stadium",
    home: "1E",
    away: "3",
  },
  {
    id: 75,
    date: "2026-06-29",
    venue: "Estadio Monterrey",
    home: "1F",
    away: "2C",
  },
  {
    id: 76,
    date: "2026-06-29",
    venue: "Houston Stadium",
    home: "1C",
    away: "2F",
  },
  {
    id: 77,
    date: "2026-06-30",
    venue: "New York New Jersey Stadium",
    home: "1I",
    away: "3",
  },
  {
    id: 78,
    date: "2026-06-30",
    venue: "Dallas Stadium",
    home: "2E",
    away: "2I",
  },
  {
    id: 79,
    date: "2026-06-30",
    venue: "Mexico City Stadium",
    home: "1A",
    away: "3",
  },
  {
    id: 80,
    date: "2026-07-01",
    venue: "Atlanta Stadium",
    home: "1L",
    away: "3",
  },
  {
    id: 81,
    date: "2026-07-01",
    venue: "San Francisco Bay Area Stadium",
    home: "1D",
    away: "3",
  },
  {
    id: 82,
    date: "2026-07-01",
    venue: "Seattle Stadium",
    home: "1G",
    away: "3",
  },
  {
    id: 83,
    date: "2026-07-02",
    venue: "Toronto Stadium",
    home: "2K",
    away: "2L",
  },
  {
    id: 84,
    date: "2026-07-02",
    venue: "Los Angeles Stadium",
    home: "1H",
    away: "2J",
  },
  {
    id: 85,
    date: "2026-07-02",
    venue: "BC Place Vancouver",
    home: "1B",
    away: "3",
  },
  {
    id: 86,
    date: "2026-07-03",
    venue: "Miami Stadium",
    home: "1J",
    away: "2H",
  },
  {
    id: 87,
    date: "2026-07-03",
    venue: "Kansas City Stadium",
    home: "1K",
    away: "3",
  },
  {
    id: 88,
    date: "2026-07-03",
    venue: "Dallas Stadium",
    home: "2D",
    away: "2G",
  },
] as const;

const BRACKET_ROUTES: Array<{
  id: number;
  stage: KnockoutMatch["stage"];
  round: string;
  date: string;
  venue: string;
  homeSourceMatchId: number;
  awaySourceMatchId: number;
}> = [
  {
    id: 89,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-04",
    venue: "Philadelphia Stadium",
    homeSourceMatchId: 73,
    awaySourceMatchId: 75,
  },
  {
    id: 90,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-04",
    venue: "Houston Stadium",
    homeSourceMatchId: 74,
    awaySourceMatchId: 76,
  },
  {
    id: 91,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-05",
    venue: "New York New Jersey Stadium",
    homeSourceMatchId: 77,
    awaySourceMatchId: 79,
  },
  {
    id: 92,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-05",
    venue: "Mexico City Stadium",
    homeSourceMatchId: 78,
    awaySourceMatchId: 80,
  },
  {
    id: 93,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-06",
    venue: "Dallas Stadium",
    homeSourceMatchId: 81,
    awaySourceMatchId: 83,
  },
  {
    id: 94,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-06",
    venue: "Seattle Stadium",
    homeSourceMatchId: 82,
    awaySourceMatchId: 84,
  },
  {
    id: 95,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-07",
    venue: "Atlanta Stadium",
    homeSourceMatchId: 85,
    awaySourceMatchId: 87,
  },
  {
    id: 96,
    stage: "roundOf16",
    round: "Round of 16",
    date: "2026-07-07",
    venue: "BC Place Vancouver",
    homeSourceMatchId: 86,
    awaySourceMatchId: 88,
  },
  {
    id: 97,
    stage: "quarterfinals",
    round: "Quarterfinals",
    date: "2026-07-09",
    venue: "Boston Stadium",
    homeSourceMatchId: 89,
    awaySourceMatchId: 90,
  },
  {
    id: 98,
    stage: "quarterfinals",
    round: "Quarterfinals",
    date: "2026-07-10",
    venue: "Los Angeles Stadium",
    homeSourceMatchId: 91,
    awaySourceMatchId: 92,
  },
  {
    id: 99,
    stage: "quarterfinals",
    round: "Quarterfinals",
    date: "2026-07-11",
    venue: "Miami Stadium",
    homeSourceMatchId: 93,
    awaySourceMatchId: 94,
  },
  {
    id: 100,
    stage: "quarterfinals",
    round: "Quarterfinals",
    date: "2026-07-11",
    venue: "Kansas City Stadium",
    homeSourceMatchId: 95,
    awaySourceMatchId: 96,
  },
  {
    id: 101,
    stage: "semifinals",
    round: "Semifinals",
    date: "2026-07-14",
    venue: "Dallas Stadium",
    homeSourceMatchId: 97,
    awaySourceMatchId: 98,
  },
  {
    id: 102,
    stage: "semifinals",
    round: "Semifinals",
    date: "2026-07-15",
    venue: "Atlanta Stadium",
    homeSourceMatchId: 99,
    awaySourceMatchId: 100,
  },
  {
    id: 104,
    stage: "final",
    round: "Final",
    date: "2026-07-19",
    venue: "New York New Jersey Stadium",
    homeSourceMatchId: 101,
    awaySourceMatchId: 102,
  },
];

function getStandingTeam(
  standingsByGroup: Record<string, GroupStandingRow[]>,
  source: string,
): KnockoutTeam {
  const position = Number(source[0]);
  const group = source[1];
  const row = standingsByGroup[group]?.[position - 1];

  return {
    source,
    teamName: row?.teamName ?? source,
    teamCode: row?.teamCode ?? null,
  };
}

function getBestThirdTeam(
  bestThirdsByGroup: Map<string, ThirdPlaceRow>,
  group: GroupCode,
): KnockoutTeam {
  const row = bestThirdsByGroup.get(group);

  return {
    source: `3${group}`,
    teamName: row?.teamName ?? `3${group}`,
    teamCode: row?.teamCode ?? null,
  };
}

function getQualifiedThirdGroups(bestThirds: ThirdPlaceRow[]): GroupCode[] {
  return bestThirds
    .slice(0, 8)
    .map((row) => row.group)
    .filter((group): group is GroupCode =>
      GROUPS.includes(group as GroupCode),
    )
    .sort();
}

function assignThirdPlacedOpponents(
  qualifiedThirdGroups: GroupCode[],
): Record<GroupCode, GroupCode> {
  const qualified = new Set(qualifiedThirdGroups);
  const slots = [...BEST_THIRD_PAIRING_MATRIX].sort(
    (a, b) =>
      a.candidates.filter((group) => qualified.has(group)).length -
      b.candidates.filter((group) => qualified.has(group)).length,
  );

  function run(
    index: number,
    used: Set<GroupCode>,
    assignments: Partial<Record<GroupCode, GroupCode>>,
  ): Partial<Record<GroupCode, GroupCode>> | null {
    if (index === slots.length) return assignments;

    const slot = slots[index];
    const candidates = slot.candidates.filter(
      (group) => qualified.has(group) && !used.has(group),
    );

    for (const candidate of candidates) {
      used.add(candidate);
      assignments[slot.winnerGroup] = candidate;

      const result = run(index + 1, used, assignments);
      if (result) return result;

      used.delete(candidate);
      delete assignments[slot.winnerGroup];
    }

    return null;
  }

  const assignments = run(0, new Set(), {});
  if (!assignments) {
    throw new Error(
      `Unsupported third-place combination: ${qualifiedThirdGroups.join("")}`,
    );
  }

  return assignments as Record<GroupCode, GroupCode>;
}

function createWinnerPlaceholder(sourceMatchId: number): KnockoutTeam {
  return {
    source: `W${sourceMatchId}`,
    teamName: `Winner M${sourceMatchId}`,
    teamCode: null,
    sourceMatchId,
  };
}

function getMatchWinner(
  match: KnockoutMatch | undefined,
  results: ResultsByMatchId,
): KnockoutTeam | null {
  if (!match) return null;

  const result = results[match.id];
  if (!result) return null;

  const winner = result.home >= result.away ? match.homeTeam : match.awayTeam;
  return {
    ...winner,
    source: `W${match.id}`,
    sourceMatchId: match.id,
  };
}

function createRoutedMatch(
  route: (typeof BRACKET_ROUTES)[number],
  matchesById: Map<number, KnockoutMatch>,
  results: ResultsByMatchId,
): KnockoutMatch {
  const home =
    getMatchWinner(matchesById.get(route.homeSourceMatchId), results) ??
    createWinnerPlaceholder(route.homeSourceMatchId);
  const away =
    getMatchWinner(matchesById.get(route.awaySourceMatchId), results) ??
    createWinnerPlaceholder(route.awaySourceMatchId);

  return {
    id: route.id,
    label: `M${route.id}`,
    stage: route.stage,
    group: null,
    round: route.round,
    matchday: null,
    date: route.date,
    time: "TBD",
    venue: route.venue,
    homeTeam: home,
    awayTeam: away,
    homeSourceMatchId: route.homeSourceMatchId,
    awaySourceMatchId: route.awaySourceMatchId,
  };
}

export function generateRoundOf32(
  standingsByGroup: Record<string, GroupStandingRow[]>,
  bestThirds: ThirdPlaceRow[],
): KnockoutMatch[] {
  const qualifiedThirdGroups = getQualifiedThirdGroups(bestThirds);
  if (qualifiedThirdGroups.length < 8) return [];

  const thirdAssignments = assignThirdPlacedOpponents(qualifiedThirdGroups);
  const bestThirdsByGroup = new Map(bestThirds.map((row) => [row.group, row]));

  return ROUND_OF_32_FIXTURES.map((fixture) => {
    const home = getStandingTeam(standingsByGroup, fixture.home);
    const away =
      fixture.away === "3"
        ? getBestThirdTeam(
            bestThirdsByGroup,
            thirdAssignments[fixture.home[1] as GroupCode],
          )
        : getStandingTeam(standingsByGroup, fixture.away);

    return {
      id: fixture.id,
      label: `M${fixture.id}`,
      stage: "roundOf32",
      group: null,
      round: "Round of 32",
      matchday: null,
      date: fixture.date,
      time: "TBD",
      venue: fixture.venue,
      homeTeam: home,
      awayTeam: away,
    };
  });
}

export function generateKnockoutMatchesByPhase(
  standingsByGroup: Record<string, GroupStandingRow[]>,
  bestThirds: ThirdPlaceRow[],
  results: ResultsByMatchId,
): KnockoutMatchesByPhase {
  const roundOf32 = generateRoundOf32(standingsByGroup, bestThirds);
  const matchesById = new Map(roundOf32.map((match) => [match.id, match]));
  const byPhase: KnockoutMatchesByPhase = {
    roundOf32,
  };

  for (const route of BRACKET_ROUTES) {
    const match = createRoutedMatch(route, matchesById, results);
    matchesById.set(match.id, match);
    byPhase[route.stage] = [...(byPhase[route.stage] ?? []), match];
  }

  return byPhase;
}

export function isKnockoutPhaseResolved(
  matches: KnockoutMatch[] | undefined,
  results: ResultsByMatchId,
) {
  return (
    matches !== undefined &&
    matches.length > 0 &&
    matches.every((match) => results[match.id] !== undefined)
  );
}
