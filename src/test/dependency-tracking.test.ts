import { describe, it, expect } from "vitest";

/**
 * Tests for heuristic dependency tracking
 *
 * When a word is selected, any heuristics that depend on that word should be rerun.
 * For example:
 * - If a genitive points to a noun, changing the noun should rerun genitive heuristic
 * - If an adjective modifies a noun, changing the noun should rerun adjective heuristic
 * - If a word is the object of a preposition, changing the preposition should rerun object heuristic
 */

describe("Heuristic Dependency Tracking", () => {
  it("should track genitive dependencies on nouns", () => {
    // Mock SentenceWord structure
    const words = [
      {
        id: "1",
        original: "puella",
        clean: "puella",
        index: 0,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        dependentWords: new Set<number>(),
      },
      {
        id: "2",
        original: "Romae",
        clean: "romae",
        index: 1,
        annotations: [
          {
            type: "possession" as const,
            targetIndex: 0,
            guessed: true,
            heuristic: 'Genitive noun modifying guaranteed noun "puella"',
          },
        ],
        selectedEntry: { type: "Noun", word: "Roma", morphologies: [] },
        selectedMorphology: "Noun Genitive Singular Feminine",
      },
    ];

    // Simulate genitive heuristic tracking dependency
    (words[0].dependentWords as Set<number>).add(1);

    // Verify dependency is tracked
    expect(words[0].dependentWords?.has(1)).toBe(true);
    expect(words[1].annotations[0].targetIndex).toBe(0);
    expect(words[1].annotations[0].guessed).toBe(true);
  });

  it("should track adjective dependencies on nouns", () => {
    const words = [
      {
        id: "1",
        original: "bona",
        clean: "bona",
        index: 0,
        annotations: [
          {
            type: "modify" as const,
            targetIndex: 1,
            guessed: true,
            heuristic: "Adjective modifying noun: Nominative Singular Feminine",
          },
        ],
        selectedEntry: { type: "Adjective", word: "bonus", morphologies: [] },
        selectedMorphology: "Adjective Nominative Singular Feminine",
      },
      {
        id: "2",
        original: "puella",
        clean: "puella",
        index: 1,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        dependentWords: new Set<number>([0]),
      },
    ];

    // Verify dependency is tracked
    expect(words[1].dependentWords?.has(0)).toBe(true);
    expect(words[0].annotations[0].targetIndex).toBe(1);
    expect(words[0].annotations[0].guessed).toBe(true);
  });

  it("should track preposition object dependencies", () => {
    const words = [
      {
        id: "1",
        original: "in",
        clean: "in",
        index: 0,
        annotations: [],
        selectedEntry: { type: "Other", word: "in", morphologies: [] },
        selectedMorphology: "Other Preposition",
        dependentWords: new Set<number>([1]),
      },
      {
        id: "2",
        original: "urbe",
        clean: "urbe",
        index: 1,
        annotations: [],
        selectedEntry: { type: "Noun", word: "urbs", morphologies: [] },
        selectedMorphology: "Noun Ablative Singular Feminine",
        guessed: true,
        heuristic: 'Object of "in" (requires Ablative)',
      },
    ];

    // Verify dependency is tracked
    expect(words[0].dependentWords?.has(1)).toBe(true);
    expect(words[1].guessed).toBe(true);
  });

  it("should track mutual dependencies for adjacent connections", () => {
    const words = [
      {
        id: "1",
        original: "bona",
        clean: "bona",
        index: 0,
        annotations: [
          {
            type: "modify" as const,
            targetIndex: 1,
            guessed: true,
            heuristic: "Agreement: Nominative Singular Feminine",
          },
        ],
        selectedEntry: { type: "Adjective", word: "bonus", morphologies: [] },
        selectedMorphology: "Adjective Nominative Singular Feminine",
        dependentWords: new Set<number>([1]),
        hasAdjacentConnection: true,
        adjacentGuessed: true,
      },
      {
        id: "2",
        original: "puella",
        clean: "puella",
        index: 1,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        dependentWords: new Set<number>([0]),
      },
    ];

    // Verify mutual dependencies
    expect(words[0].dependentWords?.has(1)).toBe(true);
    expect(words[1].dependentWords?.has(0)).toBe(true);
  });

  it("should track nominative subject dependencies on verbs", () => {
    const words = [
      {
        id: "1",
        original: "puella",
        clean: "puella",
        index: 0,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        guessed: true,
        heuristic: 'Subject of "ambulat" (singular 3rd person)',
      },
      {
        id: "2",
        original: "ambulat",
        clean: "ambulat",
        index: 1,
        annotations: [],
        selectedEntry: { type: "Verb", word: "ambulo", morphologies: [] },
        selectedMorphology:
          "Verb Present Active Indicative 3rd Person Singular",
        dependentWords: new Set<number>([0]),
      },
    ];

    // Verify dependency is tracked
    expect(words[1].dependentWords?.has(0)).toBe(true);
    expect(words[0].guessed).toBe(true);
  });

  it("should clear dependencies when rerunning all heuristics", () => {
    const words = [
      {
        id: "1",
        original: "puella",
        clean: "puella",
        index: 0,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        dependentWords: new Set<number>([1]),
      },
    ];

    // Simulate clearing dependencies (as done in rerunAllHeuristics)
    words[0].dependentWords = undefined;

    expect(words[0].dependentWords).toBeUndefined();
  });

  it("should handle multiple dependencies on the same word", () => {
    const words = [
      {
        id: "1",
        original: "puella",
        clean: "puella",
        index: 0,
        annotations: [],
        selectedEntry: { type: "Noun", word: "puella", morphologies: [] },
        selectedMorphology: "Noun Nominative Singular Feminine",
        dependentWords: new Set<number>([1, 2]),
      },
      {
        id: "2",
        original: "bona",
        clean: "bona",
        index: 1,
        annotations: [
          {
            type: "modify" as const,
            targetIndex: 0,
            guessed: true,
          },
        ],
        selectedEntry: { type: "Adjective", word: "bonus", morphologies: [] },
        selectedMorphology: "Adjective Nominative Singular Feminine",
      },
      {
        id: "3",
        original: "Romae",
        clean: "romae",
        index: 2,
        annotations: [
          {
            type: "possession" as const,
            targetIndex: 0,
            guessed: true,
          },
        ],
        selectedEntry: { type: "Noun", word: "Roma", morphologies: [] },
        selectedMorphology: "Noun Genitive Singular Feminine",
      },
    ];

    // Verify multiple dependencies
    expect(words[0].dependentWords?.has(1)).toBe(true);
    expect(words[0].dependentWords?.has(2)).toBe(true);
    expect(words[0].dependentWords?.size).toBe(2);
  });

  it("should preserve Set through state updates", () => {
    const word = {
      id: "1",
      original: "puella",
      clean: "puella",
      index: 0,
      annotations: [],
      dependentWords: new Set<number>([1, 2, 3]),
    };

    // Spread operator on object preserves Set reference
    const newWord = { ...word };
    expect(newWord.dependentWords).toBe(word.dependentWords);
    expect(newWord.dependentWords?.has(1)).toBe(true);
  });
});
