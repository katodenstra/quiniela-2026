import type { ThirdPlaceRow } from "./qualification";
import type { GroupStandingRow } from "./standings";

export type KnockoutTeam = {
  source: string;
  teamName: string;
  teamCode: string | null;
};

export type KnockoutMatch = {
  id: number;
  label: string;
  stage: "roundOf32";
  group: null;
  round: "Round of 32";
  matchday: null;
  date: string;
  time: string;
  venue: string;
  homeTeam: KnockoutTeam;
  awayTeam: KnockoutTeam;
};

function pickTopTwo(
  standingsByGroup: Record<string, GroupStandingRow[]>,
): KnockoutTeam[] {
  const groups = Object.keys(standingsByGroup).sort();

  return groups.flatMap((group) => {
    const rows = standingsByGroup[group] ?? [];

    return rows.slice(0, 2).map((row, index) => ({
      source: index === 0 ? `1${group}` : `2${group}`,
      teamName: row.teamName,
      teamCode: row.teamCode,
    }));
  });
}

function pickBestThirds(bestThirds: ThirdPlaceRow[]): KnockoutTeam[] {
  return bestThirds.slice(0, 8).map((row) => ({
    source: `3${row.group}`,
    teamName: row.teamName,
    teamCode: row.teamCode,
  }));
}

export function generateRoundOf32(
  standingsByGroup: Record<string, GroupStandingRow[]>,
  bestThirds: ThirdPlaceRow[],
): KnockoutMatch[] {
  const topTwo = pickTopTwo(standingsByGroup);
  const thirds = pickBestThirds(bestThirds);

  const qualified = [...topTwo, ...thirds];

  // Simple seeded pairing for MVP:
  // strongest early order vs later order
  const firstHalf = qualified.slice(0, 16);
  const secondHalf = qualified.slice(16).reverse();

  return firstHalf.map((team, index) => ({
    id: 1000 + index + 1,
    label: `Round of 32 • Match ${index + 1}`,
    stage: "roundOf32" as const,
    group: null,
    round: "Round of 32" as const,
    matchday: null,
    date: "TBD",
    time: "TBD",
    venue: "TBD",
    homeTeam: team,
    awayTeam: secondHalf[index],
  }));
}
