import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFriendDelta,
  getClosestRivals,
  getTopPerformersFallback,
  type FriendInsightEntry,
} from "./friendInsights.ts";

const entries: FriendInsightEntry[] = [
  { id: "ara", name: "Ara", points: 31 },
  { id: "sofi", name: "Sofi", points: 27 },
  { id: "juan", name: "Juan", points: 35 },
  { id: "diego", name: "Diego", points: 28 },
  { id: "bruno", name: "Bruno", points: 24 },
];

describe("getClosestRivals", () => {
  it("returns the 3 friends with the smallest absolute point difference", () => {
    const rivals = getClosestRivals(entries, 30);

    assert.deepEqual(
      rivals.map((item) => item.id),
      ["ara", "diego", "sofi"],
    );
  });

  it("handles ties deterministically by higher points then alphabetical name", () => {
    const rivals = getClosestRivals(
      [
        { id: "zara", name: "Zara", points: 28 },
        { id: "ana", name: "Ana", points: 32 },
        { id: "bea", name: "Bea", points: 32 },
        { id: "luis", name: "Luis", points: 28 },
      ],
      30,
      4,
    );

    assert.deepEqual(
      rivals.map((item) => item.id),
      ["ana", "bea", "luis", "zara"],
    );
  });

  it("labels positive, negative, and tied deltas", () => {
    const rivals = getClosestRivals(
      [
        { id: "above", name: "Above", points: 33 },
        { id: "below", name: "Below", points: 27 },
        { id: "tied", name: "Tied", points: 30 },
      ],
      30,
      3,
    );

    assert.equal(formatFriendDelta(3), "+3 vs you");
    assert.equal(formatFriendDelta(-3), "-3 vs you");
    assert.equal(formatFriendDelta(0), "Tied with you");
    assert.deepEqual(
      rivals.map((item) => [item.id, item.delta, item.deltaLabel]),
      [
        ["tied", 0, "Tied with you"],
        ["above", 3, "+3 vs you"],
        ["below", -3, "-3 vs you"],
      ],
    );
  });

  it("works when there are fewer than 3 friends", () => {
    const rivals = getClosestRivals(
      [{ id: "ara", name: "Ara", points: 31 }],
      30,
    );

    assert.deepEqual(
      rivals.map((item) => item.id),
      ["ara"],
    );
  });

  it("does not depend on UI order or rendering", () => {
    const first = getClosestRivals(entries, 30).map((item) => item.id);
    const second = getClosestRivals([...entries].reverse(), 30).map(
      (item) => item.id,
    );

    assert.deepEqual(first, second);
  });
});

describe("getTopPerformersFallback", () => {
  it("returns the top 3 friends by cumulative points", () => {
    const topPerformers = getTopPerformersFallback(entries);

    assert.deepEqual(
      topPerformers.map((item) => item.id),
      ["juan", "ara", "diego"],
    );
  });

  it("uses alphabetical name as deterministic tie-breaker", () => {
    const topPerformers = getTopPerformersFallback(
      [
        { id: "zara", name: "Zara", points: 30 },
        { id: "ana", name: "Ana", points: 30 },
        { id: "bea", name: "Bea", points: 29 },
      ],
      3,
    );

    assert.deepEqual(
      topPerformers.map((item) => item.id),
      ["ana", "zara", "bea"],
    );
  });

  it("works with fewer than 3 friends", () => {
    const topPerformers = getTopPerformersFallback([
      { id: "ara", name: "Ara", points: 31 },
    ]);

    assert.deepEqual(
      topPerformers.map((item) => item.id),
      ["ara"],
    );
  });

  it("returns stable results when some entries have null points", () => {
    const topPerformers = getTopPerformersFallback([
      { id: "null", name: "Null", points: null },
      { id: "ara", name: "Ara", points: 2 },
      { id: "zero", name: "Zero", points: 0 },
    ]);

    assert.deepEqual(
      topPerformers.map((item) => [item.id, item.points]),
      [
        ["ara", 2],
        ["null", 0],
        ["zero", 0],
      ],
    );
  });

  it("uses the explicit fallback and does not fabricate matchday precision", () => {
    const topPerformers = getTopPerformersFallback(entries);

    assert.equal("matchday" in topPerformers[0], false);
    assert.deepEqual(Object.keys(topPerformers[0]).sort(), [
      "id",
      "name",
      "points",
    ]);
  });
});
