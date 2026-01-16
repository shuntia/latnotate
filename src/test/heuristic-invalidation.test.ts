import { describe, it, expect } from "vitest";
import {
  detectChanges,
  getInvalidatedHeuristics,
  undoHeuristicsForWord,
  undoDependentHeuristics,
} from "@/lib/heuristics/invalidation";
import { SentenceWord } from "@/lib/types/sentence";

describe("Heuristic Invalidation", () => {
  const createMockWord = (overrides: Partial<SentenceWord> = {}): SentenceWord => ({
    id: "word-1",
    original: "test",
    clean: "test",
    index: 0,
    annotations: [],
    ...overrides,
  });

  describe("detectChanges", () => {
    it("should detect part of speech change", () => {
      const oldWord = createMockWord({
        selectedEntry: { type: "Adjective", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Nominative Singular",
      });
      const newWord = createMockWord({
        selectedEntry: { type: "Adverb", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Indeclinable",
      });

      const changes = detectChanges(oldWord, newWord);

      expect(changes.partOfSpeechChanged).toBe(true);
      expect(changes.caseChanged).toBe(true);
    });

    it("should detect case change only", () => {
      const oldWord = createMockWord({
        selectedEntry: { type: "Noun", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Nominative Singular",
      });
      const newWord = createMockWord({
        selectedEntry: { type: "Noun", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Accusative Singular",
      });

      const changes = detectChanges(oldWord, newWord);

      expect(changes.partOfSpeechChanged).toBe(false);
      expect(changes.caseChanged).toBe(true);
      expect(changes.numberChanged).toBe(false);
    });

    it("should detect no changes when same", () => {
      const oldWord = createMockWord({
        selectedEntry: { type: "Noun", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Nominative Singular Masculine",
      });
      const newWord = createMockWord({
        selectedEntry: { type: "Noun", forms: [], definition: "", morphologies: [] },
        selectedMorphology: "Nominative Singular Masculine",
      });

      const changes = detectChanges(oldWord, newWord);

      expect(changes.partOfSpeechChanged).toBe(false);
      expect(changes.caseChanged).toBe(false);
      expect(changes.genderChanged).toBe(false);
      expect(changes.numberChanged).toBe(false);
    });
  });

  describe("getInvalidatedHeuristics", () => {
    it("should invalidate adjective heuristics when part of speech changes", () => {
      const word = createMockWord({
        heuristic: "Inferred as adjective by agreement",
      });

      const changes = {
        partOfSpeechChanged: true,
        caseChanged: false,
        genderChanged: false,
        numberChanged: false,
        personChanged: false,
      };

      const invalidated = getInvalidatedHeuristics(word, 0, changes);

      expect(invalidated).toContain("adjective-agreement");
      expect(invalidated).toContain("adjective-connection");
    });

    it("should invalidate nominative heuristics when case changes", () => {
      const word = createMockWord({
        heuristic: "Inferred as nominative subject",
        selectedMorphology: "Nominative Singular",
      });

      const changes = {
        partOfSpeechChanged: false,
        caseChanged: true,
        genderChanged: false,
        numberChanged: false,
        personChanged: false,
      };

      const invalidated = getInvalidatedHeuristics(word, 0, changes);

      expect(invalidated).toContain("nominative-subject");
      expect(invalidated).toContain("nominative-chunk");
    });
  });

  describe("undoHeuristicsForWord", () => {
    it("should remove adjective agreement selection", () => {
      const words: SentenceWord[] = [
        createMockWord({
          id: "word-1",
          index: 0,
          selectedEntry: { type: "Adjective", forms: [], definition: "", morphologies: [] },
          selectedMorphology: "Nominative Singular",
          heuristic: "Inferred as adjective by agreement",
        }),
      ];

      const result = undoHeuristicsForWord(words, 0, ["adjective-agreement"]);

      expect(result[0].selectedEntry).toBeUndefined();
      expect(result[0].selectedMorphology).toBeUndefined();
      expect(result[0].heuristic).toBeUndefined();
    });

    it("should remove genitive possession arrows", () => {
      const words: SentenceWord[] = [
        createMockWord({
          id: "word-1",
          index: 0,
          annotations: [
            { type: "possession", targetIndex: 1 },
            { type: "modify", targetIndex: 2 },
          ],
        }),
      ];

      const result = undoHeuristicsForWord(words, 0, ["genitive-possession"]);

      expect(result[0].annotations).toHaveLength(1);
      expect(result[0].annotations[0].type).toBe("modify");
    });

    it("should remove et prefix when que-et heuristic invalidated", () => {
      const words: SentenceWord[] = [
        createMockWord({
          id: "word-1",
          index: 0,
          hasEtPrefix: true,
          etGuessed: true,
        }),
      ];

      const result = undoHeuristicsForWord(words, 0, ["que-et"]);

      expect(result[0].hasEtPrefix).toBe(false);
      expect(result[0].etGuessed).toBe(false);
    });
  });

  describe("undoDependentHeuristics", () => {
    it("should remove heuristics from dependent words", () => {
      const words: SentenceWord[] = [
        createMockWord({
          id: "word-1",
          index: 0,
          dependentWords: new Set([1, 2]),
          selectedEntry: { type: "Noun", forms: [], definition: "", morphologies: [] },
        }),
        createMockWord({
          id: "word-2",
          index: 1,
          selectedEntry: { type: "Adjective", forms: [], definition: "", morphologies: [] },
          heuristic: "Agrees with word-1",
        }),
        createMockWord({
          id: "word-3",
          index: 2,
          selectedEntry: { type: "Adjective", forms: [], definition: "", morphologies: [] },
          heuristic: "Agrees with word-1",
        }),
      ];

      const result = undoDependentHeuristics(words, 0);

      expect(result[1].selectedEntry).toBeUndefined();
      expect(result[1].heuristic).toBeUndefined();
      expect(result[2].selectedEntry).toBeUndefined();
      expect(result[2].heuristic).toBeUndefined();
      // Word 0 should be unchanged
      expect(result[0].selectedEntry).toBeDefined();
    });

    it("should remove annotations that depend on changed word", () => {
      const words: SentenceWord[] = [
        createMockWord({
          id: "word-1",
          index: 0,
          dependentWords: new Set([1]),
        }),
        createMockWord({
          id: "word-2",
          index: 1,
          annotations: [
            { type: "modify", targetIndex: 0, heuristic: "Modifies word-1" },
            { type: "modify", targetIndex: 2 }, // Manual annotation
          ],
        }),
      ];

      const result = undoDependentHeuristics(words, 0);

      expect(result[1].annotations).toHaveLength(1);
      expect(result[1].annotations[0].targetIndex).toBe(2);
    });
  });
});
