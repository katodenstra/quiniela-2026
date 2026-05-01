export type ScorePredictionInput = {
  home: number | null;
  away: number | null;
};

export type ScoreResultInput = {
  home: number;
  away: number;
};

export function getOutcome(home: number, away: number) {
  if (home === away) return "draw";
  return home > away ? "home" : "away";
}

export function scorePrediction(
  pred: ScorePredictionInput,
  res: ScoreResultInput,
) {
  if (pred.home === null || pred.away === null) return 0;

  if (pred.home === res.home && pred.away === res.away) return 3;

  const predOutcome = getOutcome(pred.home, pred.away);
  const resOutcome = getOutcome(res.home, res.away);
  if (predOutcome === resOutcome) return 1;

  return 0;
}
