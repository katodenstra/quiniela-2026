
import type { PredictionsByMatchId, TournamentPhase } from "../state/usePoolState";

export type Friend = {
  id: string;
  name: string;
  avatarSeed: string;
};

export type FriendPredictionsByPhase = Record<TournamentPhase, PredictionsByMatchId>;

const FEATURED_FRIENDS: Friend[] = [
  { id: "ara", name: "Ara", avatarSeed: "ara" },
  { id: "juan", name: "Juan", avatarSeed: "juan" },
  { id: "sofi", name: "Sofi", avatarSeed: "sofi" },
  { id: "diego", name: "Diego", avatarSeed: "diego" },
  { id: "valeria", name: "Valeria", avatarSeed: "valeria" },
  { id: "bruno", name: "Bruno", avatarSeed: "bruno" },
  { id: "elena", name: "Elena", avatarSeed: "elena" },
  { id: "mateo", name: "Mateo", avatarSeed: "mateo" },
];

const EXTRA_FRIEND_NAMES = [
  "Camila",
  "Nora",
  "Paula",
  "Emilio",
  "Lucía",
  "Andrés",
  "Hugo",
  "Renata",
  "Daniel",
  "Clara",
  "Irene",
  "Leo",
  "Mónica",
  "Pablo",
  "Sara",
  "Tomás",
  "Noa",
  "Javier",
  "Marta",
  "Iván",
  "Luna",
  "Gael",
  "Elisa",
  "Marco",
];

const PHASE_MATCH_IDS: Record<TournamentPhase, number[]> = {
  groups: Array.from({ length: 72 }, (_, index) => index + 1),
  roundOf32: Array.from({ length: 16 }, (_, index) => 73 + index),
  roundOf16: Array.from({ length: 8 }, (_, index) => 89 + index),
  roundOf8: [],
  quarterfinals: Array.from({ length: 4 }, (_, index) => 97 + index),
  semifinals: [101, 102],
  final: [104],
};

const ALL_PHASES: TournamentPhase[] = [
  "groups",
  "roundOf32",
  "roundOf16",
  "quarterfinals",
  "semifinals",
  "final",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function randomFromSeed(seed: string) {
  let state = hashString(seed) || 1;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clampScore(score: number) {
  if (score < 0) return 0;
  if (score > 4) return 4;
  return score;
}

function getStyleBias(friendId: string) {
  const seed = hashString(friendId) % 5;

  switch (seed) {
    case 0:
      return { drawBias: 0.3, goalBias: -0.15, favoriteBias: 0.15 };
    case 1:
      return { drawBias: 0.12, goalBias: 0.25, favoriteBias: 0.2 };
    case 2:
      return { drawBias: 0.08, goalBias: 0.4, favoriteBias: -0.1 };
    case 3:
      return { drawBias: 0.18, goalBias: -0.05, favoriteBias: -0.2 };
    default:
      return { drawBias: 0.22, goalBias: 0.1, favoriteBias: 0.05 };
  }
}

function generatePrediction(friendId: string, phase: TournamentPhase, matchId: number) {
  const rng = randomFromSeed(`${friendId}:${phase}:${matchId}`);
  const bias = getStyleBias(friendId);

  const rawHome = rng();
  const rawAway = rng();
  const outcomeRoll = rng();

  let home = clampScore(Math.floor(rawHome * 4.2 + bias.goalBias * 2));
  let away = clampScore(Math.floor(rawAway * 4.2 + bias.goalBias * 2));

  if (outcomeRoll < bias.drawBias) {
    away = home;
  } else if (outcomeRoll < 0.5 + bias.favoriteBias) {
    if (home <= away) home = clampScore(away + 1);
  } else {
    if (away <= home) away = clampScore(home + 1);
  }

  return { home, away };
}

function generatePredictionsForPhase(
  friendId: string,
  phase: TournamentPhase,
): PredictionsByMatchId {
  return PHASE_MATCH_IDS[phase].reduce<PredictionsByMatchId>((acc, matchId) => {
    acc[matchId] = generatePrediction(friendId, phase, matchId);
    return acc;
  }, {});
}

function createFriendPredictions(friendId: string): FriendPredictionsByPhase {
  return ALL_PHASES.reduce<FriendPredictionsByPhase>((acc, phase) => {
    acc[phase] = generatePredictionsForPhase(friendId, phase);
    return acc;
  }, {
    groups: {},
    roundOf32: {},
    roundOf16: {},
    roundOf8: {},
    quarterfinals: {},
    semifinals: {},
    final: {},
  });
}

function generateExtraFriends(count: number): Friend[] {
  return Array.from({ length: count }, (_, index) => {
    const name = EXTRA_FRIEND_NAMES[index % EXTRA_FRIEND_NAMES.length];
    const suffix = index + 1;
    const id = `mock-${name.toLowerCase()}-${suffix}`;

    return {
      id,
      name: `${name} ${suffix}`,
      avatarSeed: id,
    };
  });
}

const friends: Friend[] = [...FEATURED_FRIENDS, ...generateExtraFriends(24)];

const friendPredictionsStore: Record<string, FriendPredictionsByPhase> = Object.fromEntries(
  friends.map((friend) => [friend.id, createFriendPredictions(friend.id)]),
);

export async function getFriends() {
  await sleep(250);
  return friends;
}

export async function getFriendPredictions(
  friendId: string,
  phase: TournamentPhase = "groups",
) {
  await sleep(300);
  const data = friendPredictionsStore[friendId];
  if (!data) throw new Error("Friend not found");
  return data[phase];
}

export async function getFriendPredictionsByPhase(friendId: string) {
  await sleep(300);
  const data = friendPredictionsStore[friendId];
  if (!data) throw new Error("Friend not found");
  return data;
}

export async function getAllFriendPredictions(
  phase: TournamentPhase = "groups",
) {
  await sleep(350);
  return Object.fromEntries(
    Object.entries(friendPredictionsStore).map(([friendId, predictionsByPhase]) => [
      friendId,
      predictionsByPhase[phase],
    ]),
  ) as Record<string, PredictionsByMatchId>;
}
