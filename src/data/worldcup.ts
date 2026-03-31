import raw from "./worldcup.json";

export type AppGroupId =
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

export type ViewMode = "group" | "matchday";

export type TeamRef = {
  name: string;
  code: string | null;
  isPlaceholder: boolean;
};

export type AppMatch = {
  id: number;
  stage: "group" | "knockout";
  group: AppGroupId | null;
  round: string;
  matchday: number | null;
  date: string;
  time: string;
  venue: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
};

export type GroupStageMatch = AppMatch & {
  stage: "group";
  group: AppGroupId;
};

type RawMatch = {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
};

type RawTournament = {
  name: string;
  matches: RawMatch[];
};

const countryCodeMap: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  "Curaçao": "cw",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  "Ivory Coast": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Spain: "es",
  Switzerland: "ch",
  Tunisia: "tn",
  USA: "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
};

function isPlaceholderTeam(name: string) {
  return (
    /^\d+[A-L]$/.test(name) || // knockout placeholders like 2A
    /winner/i.test(name) ||
    /runner-up/i.test(name) ||
    /path/i.test(name)
  );
}

function normalizeGroup(group?: string): AppGroupId | null {
  if (!group) return null;
  const match = group.match(/^Group\s+([A-L])$/i);
  return match ? (match[1].toUpperCase() as AppGroupId) : null;
}

function extractMatchday(round: string): number | null {
  const match = round.match(/^Matchday\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function normalizeTeam(name: string): TeamRef {
  const placeholder = isPlaceholderTeam(name);

  return {
    name,
    code: placeholder ? null : (countryCodeMap[name] ?? null),
    isPlaceholder: placeholder,
  };
}

const tournament = raw as RawTournament;

export const allMatches: AppMatch[] = tournament.matches.map((match, index) => {
  const group = normalizeGroup(match.group);
  const matchday = extractMatchday(match.round);

  return {
    id: match.num ?? index + 1,
    stage: group ? "group" : "knockout",
    group,
    round: match.round,
    matchday,
    date: match.date,
    time: match.time,
    venue: match.ground,
    homeTeam: normalizeTeam(match.team1),
    awayTeam: normalizeTeam(match.team2),
  };
});

export const groupStageMatches = allMatches.filter(
  (match): match is GroupStageMatch => match.stage === "group",
);

export const groupIds = Array.from(
  new Set(
    groupStageMatches
      .map((match) => match.group)
      .filter((group): group is AppGroupId => group !== null),
  ),
);

export const matchdays = Array.from(
  new Set(
    groupStageMatches
      .map((match) => match.matchday)
      .filter((day): day is number => day !== null),
  ),
).sort((a, b) => a - b);
