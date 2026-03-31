import type { GroupStageMatch } from "./worldcup";

export type MatchResult = {
  home: number;
  away: number;
};

export type GroupStandingRow = {
  teamName: string;
  teamCode: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

function createRow(
  teamName: string,
  teamCode: string | null,
): GroupStandingRow {
  return {
    teamName,
    teamCode,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

export function calculateGroupStandings(
  matches: GroupStageMatch[],
  results: Record<number, MatchResult>,
  group: GroupStageMatch["group"],
): GroupStandingRow[] {
  const groupMatches = matches.filter((match) => match.group === group);
  const table = new Map<string, GroupStandingRow>();

  for (const match of groupMatches) {
    const homeName = match.homeTeam.name;
    const awayName = match.awayTeam.name;

    if (!table.has(homeName)) {
      table.set(homeName, createRow(homeName, match.homeTeam.code));
    }

    if (!table.has(awayName)) {
      table.set(awayName, createRow(awayName, match.awayTeam.code));
    }

    const result = results[match.id];
    if (!result) continue;

    const home = table.get(homeName);
    const away = table.get(awayName);

    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.goalsFor += result.home;
    home.goalsAgainst += result.away;
    away.goalsFor += result.away;
    away.goalsAgainst += result.home;

    if (result.home > result.away) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (result.home < result.away) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows;
}
