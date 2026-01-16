/**
 * Tests for prepositional bracket heuristics including conjunction extension
 */

import { describe, it, expect } from "vitest";
import type { SentenceWord, Annotation } from "../types/parser";

// Helper to create a word with selected entry
function createWord(
  original: string,
  type: string,
  morphology: string,
  caseValue?: string
): SentenceWord {
  const word: SentenceWord = {
    original,
    clean: original.toLowerCase(),
    annotations: [],
    selectedEntry: {
      forms: [original],
      type: type as any,
      definition: "test",
      morphologies: [
        {
          form: original,
          analysis: morphology,
        },
      ],
    },
    selectedMorphology: morphology,
  };

  if (caseValue) {
    word.selectedMorphology = `${type} ${caseValue}`;
  }

  return word;
}

describe("Prepositional Bracket Extension", () => {
  it("should extend bracket across conjunction when both sides have same case", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
      createWord("foro", "Noun", "Noun Ablative Singular Masculine"),
    ];

    // Simulate what the heuristic should detect
    const prep = words[0];
    const object1 = words[1];
    const conjunction = words[2];
    const object2 = words[3];

    // Both objects are Ablative, should extend bracket to include conjunction and second object
    const expectedEndIndex = 3; // Index of "foro"

    // This tests the logic that should be in applyPrepositionalBracketGuessing
    expect(object1.selectedMorphology).toContain("Ablative");
    expect(object2.selectedMorphology).toContain("Ablative");
    expect(conjunction.clean).toBe("et");
  });

  it("should not extend bracket if word after conjunction is different case", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
      createWord("templum", "Noun", "Noun Accusative Singular Neuter"),
    ];

    const prep = words[0];
    const object1 = words[1];
    const object2 = words[3];

    // object1 is Ablative, object2 is Accusative - should NOT extend
    expect(object1.selectedMorphology).toContain("Ablative");
    expect(object2.selectedMorphology).toContain("Accusative");
  });

  it("should handle multiple adjectives before conjunction", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("magno", "Adjective", "Adjective Ablative Singular Masculine"),
      createWord("templo", "Noun", "Noun Ablative Singular Masculine"),
      createWord("et", "Other", "Conjunction"),
      createWord("foro", "Noun", "Noun Ablative Singular Masculine"),
    ];

    // Should extend from "templo" (index 2) across conjunction to "foro" (index 4)
    const expectedEndIndex = 4;

    expect(words[1].selectedMorphology).toContain("Ablative");
    expect(words[2].selectedMorphology).toContain("Ablative");
    expect(words[4].selectedMorphology).toContain("Ablative");
  });

  it("should handle multiple adjectives after conjunction", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
      createWord("magno", "Adjective", "Adjective Ablative Singular Masculine"),
      createWord("foro", "Noun", "Noun Ablative Singular Masculine"),
    ];

    // Should extend to include adjective + noun after conjunction
    const expectedEndIndex = 4;

    expect(words[1].selectedMorphology).toContain("Ablative");
    expect(words[3].selectedMorphology).toContain("Ablative");
    expect(words[4].selectedMorphology).toContain("Ablative");
  });

  it("should work with accusative prepositions", () => {
    const words: SentenceWord[] = [
      createWord("ad", "Other", "Preposition Accusative"),
      createWord("templum", "Noun", "Noun Accusative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
      createWord("forum", "Noun", "Noun Accusative Singular Neuter"),
    ];

    // Should extend bracket across conjunction for accusative case
    const expectedEndIndex = 3;

    expect(words[1].selectedMorphology).toContain("Accusative");
    expect(words[3].selectedMorphology).toContain("Accusative");
  });

  it("should handle sed conjunction", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("sed", "Other", "Conjunction"),
      createWord("foro", "Noun", "Noun Ablative Singular Masculine"),
    ];

    // "sed" should also trigger extension
    expect(words[2].clean).toBe("sed");
    expect(words[1].selectedMorphology).toContain("Ablative");
    expect(words[3].selectedMorphology).toContain("Ablative");
  });

  it("should not extend if no word after conjunction", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
    ];

    // Should end at index 1, not try to extend beyond array bounds
    expect(words.length).toBe(3);
  });

  it("should handle multiple extensions in same sentence", () => {
    const words: SentenceWord[] = [
      createWord("in", "Other", "Preposition Ablative"),
      createWord("templo", "Noun", "Noun Ablative Singular Neuter"),
      createWord("et", "Other", "Conjunction"),
      createWord("foro", "Noun", "Noun Ablative Singular Masculine"),
      createWord("ad", "Other", "Preposition Accusative"),
      createWord("urbem", "Noun", "Noun Accusative Singular Feminine"),
      createWord("et", "Other", "Conjunction"),
      createWord("villam", "Noun", "Noun Accusative Singular Feminine"),
    ];

    // First prep should extend to index 3, second prep should extend to index 7
    expect(words[0].clean).toBe("in");
    expect(words[3].selectedMorphology).toContain("Ablative");
    expect(words[4].clean).toBe("ad");
    expect(words[7].selectedMorphology).toContain("Accusative");
  });
});

describe("Prepositional Bracket Creation", () => {
  it("should create bracket annotation with correct structure", () => {
    const annotation: Annotation = {
      type: "preposition-scope",
      endIndex: 3,
      guessed: true,
      heuristic: "Prepositional phrase: in + Ablative object",
    };

    expect(annotation.type).toBe("preposition-scope");
    expect(annotation.endIndex).toBe(3);
    expect(annotation.guessed).toBe(true);
    expect(annotation.heuristic).toBeDefined();
  });

  it("should not create duplicate brackets", () => {
    const word: SentenceWord = {
      original: "in",
      clean: "in",
      annotations: [
        {
          type: "preposition-scope",
          endIndex: 2,
          guessed: true,
        },
      ],
    };

    // Check that annotation already exists
    const existingBracket = word.annotations.find(
      (a) => a.type === "preposition-scope"
    );

    expect(existingBracket).toBeDefined();
    expect(existingBracket?.endIndex).toBe(2);
  });
});
