/**
 * Tests for rejected heuristics tracking system
 */

import { describe, it, expect } from "vitest";
import type { SentenceWord } from "../types/parser";

describe("Rejected Heuristics Tracking", () => {
  it("should track rejected et-prefix heuristics", () => {
    const word: SentenceWord = {
      original: "puerique",
      clean: "puerique",
      annotations: [],
      hasEtPrefix: true,
      etGuessed: true,
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting the et prefix
    word.hasEtPrefix = false;
    word.etGuessed = false;
    word.rejectedHeuristics!.add("et-prefix");

    expect(word.rejectedHeuristics!.has("et-prefix")).toBe(true);
    expect(word.hasEtPrefix).toBe(false);
  });

  it("should track rejected adjacent connection heuristics", () => {
    const word: SentenceWord = {
      original: "magnus",
      clean: "magnus",
      annotations: [
        {
          type: "modify",
          targetIndex: 1,
          guessed: true,
        },
      ],
      hasAdjacentConnection: true,
      adjacentGuessed: true,
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting the adjacent connection
    word.hasAdjacentConnection = false;
    word.adjacentGuessed = false;
    word.annotations = [];
    word.rejectedHeuristics!.add("adjacent-1");

    expect(word.rejectedHeuristics!.has("adjacent-1")).toBe(true);
    expect(word.hasAdjacentConnection).toBe(false);
    expect(word.annotations.length).toBe(0);
  });

  it("should track rejected genitive annotation heuristics", () => {
    const word: SentenceWord = {
      original: "Romae",
      clean: "romae",
      annotations: [
        {
          type: "possession",
          targetIndex: 2,
          guessed: true,
          heuristic: "Genitive noun modifying...",
        },
      ],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting the genitive connection
    const annotation = word.annotations[0];
    const heuristicId = `${annotation.type}-${annotation.targetIndex}`;
    word.rejectedHeuristics!.add(heuristicId);
    word.annotations = [];

    expect(word.rejectedHeuristics!.has("possession-2")).toBe(true);
    expect(word.annotations.length).toBe(0);
  });

  it("should track rejected prepositional bracket heuristics", () => {
    const word: SentenceWord = {
      original: "in",
      clean: "in",
      annotations: [
        {
          type: "preposition-scope",
          endIndex: 3,
          guessed: true,
          heuristic: "Prepositional phrase...",
        },
      ],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting the prepositional bracket
    const annotation = word.annotations[0];
    const heuristicId = `${annotation.type}-${annotation.endIndex}`;
    word.rejectedHeuristics!.add(heuristicId);
    word.annotations = [];

    expect(word.rejectedHeuristics!.has("preposition-scope-3")).toBe(true);
    expect(word.annotations.length).toBe(0);
  });

  it("should track rejected nominative guess heuristics", () => {
    const word: SentenceWord = {
      original: "puella",
      clean: "puella",
      annotations: [],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting nominative guess
    word.rejectedHeuristics!.add("nominative-guess");

    expect(word.rejectedHeuristics!.has("nominative-guess")).toBe(true);
  });

  it("should track rejected prepositional object guess", () => {
    const word: SentenceWord = {
      original: "templo",
      clean: "templo",
      annotations: [],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting prepositional object guess from preposition at index 0
    word.rejectedHeuristics!.add("prep-object-0");

    expect(word.rejectedHeuristics!.has("prep-object-0")).toBe(true);
  });

  it("should track rejected preposition guess", () => {
    const word: SentenceWord = {
      original: "in",
      clean: "in",
      annotations: [],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting preposition guess before word at index 1
    word.rejectedHeuristics!.add("prep-guess-1");

    expect(word.rejectedHeuristics!.has("prep-guess-1")).toBe(true);
  });

  it("should track rejected adjective-noun connection", () => {
    const word: SentenceWord = {
      original: "magnus",
      clean: "magnus",
      annotations: [
        {
          type: "modify",
          targetIndex: 2,
          guessed: true,
          heuristic: "Adjective modifying noun...",
        },
      ],
      rejectedHeuristics: new Set(),
    };

    // Simulate user rejecting the adjective-noun connection
    const annotation = word.annotations[0];
    const heuristicId = `${annotation.type}-${annotation.targetIndex}`;
    word.rejectedHeuristics!.add(heuristicId);
    word.annotations = [];

    expect(word.rejectedHeuristics!.has("modify-2")).toBe(true);
    expect(word.annotations.length).toBe(0);
  });

  it("should clear all rejected heuristics when rerunning all heuristics", () => {
    const word: SentenceWord = {
      original: "puella",
      clean: "puella",
      annotations: [],
      rejectedHeuristics: new Set([
        "et-prefix",
        "adjacent-1",
        "possession-2",
        "nominative-guess",
      ]),
    };

    // Simulate "Rerun All Heuristics" button
    word.rejectedHeuristics = undefined;

    expect(word.rejectedHeuristics).toBeUndefined();
  });

  it("should handle multiple rejections for same word", () => {
    const word: SentenceWord = {
      original: "magnus",
      clean: "magnus",
      annotations: [],
      rejectedHeuristics: new Set(),
    };

    // Reject multiple heuristics
    word.rejectedHeuristics!.add("modify-1");
    word.rejectedHeuristics!.add("modify-2");
    word.rejectedHeuristics!.add("adjacent-1");

    expect(word.rejectedHeuristics!.size).toBe(3);
    expect(word.rejectedHeuristics!.has("modify-1")).toBe(true);
    expect(word.rejectedHeuristics!.has("modify-2")).toBe(true);
    expect(word.rejectedHeuristics!.has("adjacent-1")).toBe(true);
  });

  it("should record rejections when clearing guessed annotations", () => {
    const word: SentenceWord = {
      original: "magnus",
      clean: "magnus",
      annotations: [
        {
          type: "modify",
          targetIndex: 1,
          guessed: true,
        },
        {
          type: "possession",
          targetIndex: 2,
          guessed: true,
        },
        {
          type: "preposition-scope",
          endIndex: 3,
          guessed: true,
        },
      ],
      rejectedHeuristics: new Set(),
    };

    // Simulate clearing all annotations (like Clear button does)
    for (const annotation of word.annotations) {
      if (annotation.guessed) {
        const heuristicId = annotation.targetIndex !== undefined
          ? `${annotation.type}-${annotation.targetIndex}`
          : annotation.endIndex !== undefined
          ? `${annotation.type}-${annotation.endIndex}`
          : annotation.type;
        word.rejectedHeuristics!.add(heuristicId);
      }
    }
    word.annotations = [];

    expect(word.rejectedHeuristics!.size).toBe(3);
    expect(word.rejectedHeuristics!.has("modify-1")).toBe(true);
    expect(word.rejectedHeuristics!.has("possession-2")).toBe(true);
    expect(word.rejectedHeuristics!.has("preposition-scope-3")).toBe(true);
    expect(word.annotations.length).toBe(0);
  });

  it("should preserve rejectedHeuristics across state updates", () => {
    const word: SentenceWord = {
      original: "puella",
      clean: "puella",
      annotations: [],
      rejectedHeuristics: new Set(["nominative-guess"]),
    };

    // Create new word object (simulating React state update)
    const newWord: SentenceWord = {
      ...word,
      annotations: [],
    };

    expect(newWord.rejectedHeuristics).toBeDefined();
    expect(newWord.rejectedHeuristics!.has("nominative-guess")).toBe(true);
  });
});
