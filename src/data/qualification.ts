import type { GroupStandingRow } from "./standings";

export type QualifiedStatus = "top2" | "bestThird" | "eliminated";

export type ThirdPlaceRow = GroupStandingRow & {
  group: string;
};

export function getBestThirdPlacedTeams(
  standingsByGroup: Record<string, GroupStandingRow[]>,
): ThirdPlaceRow[] {
  const thirdPlaced: ThirdPlaceRow[] = Object.entries(standingsByGroup)
    .map(([group, rows]) => {
      const row = rows[2];
      if (!row) return null;

      return {
        ...row,
        group,
      };
    })
    .filter((row): row is ThirdPlaceRow => row !== null);

  thirdPlaced.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return thirdPlaced;
}

export function getQualifiedThirdGroupSet(
  standingsByGroup: Record<string, GroupStandingRow[]>,
): Set<string> {
  const bestThirds = getBestThirdPlacedTeams(standingsByGroup).slice(0, 8);
  return new Set(bestThirds.map((row) => row.group));
}

export function getQualificationStatus(
  group: string,
  index: number,
  qualifiedThirdGroups: Set<string>,
): QualifiedStatus {
  if (index < 2) return "top2";
  if (index === 2 && qualifiedThirdGroups.has(group)) return "bestThird";
  return "eliminated";
}
