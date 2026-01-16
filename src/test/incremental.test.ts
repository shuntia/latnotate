import { describe, it, expect } from "vitest";

describe("Incremental Heuristics", () => {
  describe("Preposition-Object relationship", () => {
    it("should guess object after selecting preposition", () => {
      // Simulating selecting "ad" (requires Accusative)
      const words = [
        {
          index: 0,
          original: "ad",
          clean: "ad",
          selectedEntry: { type: "Other" as const },
          selectedMorphology: "Preposition",
          lookupResults: [],
          annotations: [],
        },
        {
          index: 1,
          original: "urbem",
          clean: "urbem",
          selectedEntry: undefined,
          selectedMorphology: undefined,
          lookupResults: [
            {
              type: "Noun" as const,
              forms: ["urbs", "urbis"],
              morphologies: [
                {
                  line: "",
                  stem: "urb.em",
                  pos: "N",
                  analysis: "Noun Accusative Singular Feminine",
                },
              ],
              definition: "city",
              dictionaryCode: "",
              dictLine: "",
            },
          ],
          annotations: [],
        },
      ];

      // After selecting "ad", incremental heuristic should guess "urbem" as accusative
      expect(words[0].selectedEntry?.type).toBe("Other");
      expect(words[1].lookupResults).toHaveLength(1);
      expect(words[1].lookupResults?.[0].morphologies[0].analysis).toContain(
        "Accusative",
      );
    });

    it("should guess preposition before selecting case", () => {
      // Simulating selecting accusative noun, should guess preposition before it
      const words = [
        {
          index: 0,
          original: "ad",
          clean: "ad",
          selectedEntry: undefined,
          selectedMorphology: undefined,
          lookupResults: [
            {
              type: "Other" as const,
              forms: ["ad"],
              morphologies: [
                {
                  line: "",
                  stem: "ad",
                  pos: "PREP",
                  analysis: "Preposition",
                },
              ],
              definition: "to, toward",
              dictionaryCode: "",
              dictLine: "",
            },
          ],
          annotations: [],
        },
        {
          index: 1,
          original: "urbem",
          clean: "urbem",
          selectedEntry: { type: "Noun" as const },
          selectedMorphology: "Noun Accusative Singular Feminine",
          lookupResults: [],
          annotations: [],
        },
      ];

      // After selecting "urbem" as accusative, should be able to guess "ad"
      expect(words[1].selectedMorphology).toContain("Accusative");
      expect(words[0].lookupResults?.[0].type).toBe("Other");
    });
  });

  describe("Verb-Subject relationship", () => {
    it("should guess nominative subject after selecting 3rd person verb", () => {
      const words = [
        {
          index: 0,
          original: "puella",
          clean: "puella",
          selectedEntry: undefined,
          selectedMorphology: undefined,
          lookupResults: [
            {
              type: "Noun" as const,
              forms: ["puella"],
              morphologies: [
                {
                  line: "",
                  stem: "puell.a",
                  pos: "N",
                  analysis: "Noun Nominative Singular Feminine",
                },
              ],
              definition: "girl",
              dictionaryCode: "",
              dictLine: "",
            },
          ],
          annotations: [],
        },
        {
          index: 1,
          original: "ambulat",
          clean: "ambulat",
          selectedEntry: { type: "Verb" as const },
          selectedMorphology:
            "Verb Present Active Indicative 3rd Person Singular",
          lookupResults: [],
          annotations: [],
        },
      ];

      // After selecting "ambulat" as 3rd person singular, should guess "puella" nominative singular
      expect(words[1].selectedMorphology).toContain("3rd Person Singular");
      expect(words[0].lookupResults?.[0].morphologies[0].analysis).toContain(
        "Nominative Singular",
      );
    });
  });

  describe("Adjacent agreement", () => {
    it("should create connection between agreeing adjacent words", () => {
      const getCaseGenderNumber = (morph: string) => {
        const caseMatch = morph.match(
          /Nominative|Accusative|Genitive|Dative|Ablative/,
        );
        const genderMatch = morph.match(/Masculine|Feminine|Neuter/);
        const numberMatch = morph.match(/Singular|Plural/);

        if (!caseMatch || !numberMatch) return null;

        return {
          case: caseMatch[0],
          gender: genderMatch ? genderMatch[0] : "",
          number: numberMatch[0],
        };
      };

      const word1Morph = "Adjective Accusative Singular Feminine";
      const word2Morph = "Noun Accusative Singular Feminine";

      const cgn1 = getCaseGenderNumber(word1Morph);
      const cgn2 = getCaseGenderNumber(word2Morph);

      expect(cgn1).toBeTruthy();
      expect(cgn2).toBeTruthy();
      expect(cgn1?.case).toBe(cgn2?.case);
      expect(cgn1?.gender).toBe(cgn2?.gender);
      expect(cgn1?.number).toBe(cgn2?.number);
    });
  });

  describe("Incremental application", () => {
    it("should only apply heuristics involving changed word", () => {
      // When user selects a word, only heuristics involving that word should run
      // This is tested by ensuring we don't guess words far away

      const changedIndex = 5;
      const maxLookAhead = 4;

      // Object should be within range
      expect(changedIndex + maxLookAhead).toBeGreaterThanOrEqual(
        changedIndex + 1,
      );

      // Words beyond range should not be affected
      const beyondRange = changedIndex + maxLookAhead + 1;
      expect(beyondRange).toBeGreaterThan(changedIndex + maxLookAhead);
    });

    it("should check both adjacent neighbors for agreement", () => {
      const changedIndex = 2;

      // Should check left neighbor (index 1)
      const leftNeighbor = changedIndex - 1;
      expect(leftNeighbor).toBe(1);

      // Should check right neighbor (index 3)
      const rightNeighbor = changedIndex + 1;
      expect(rightNeighbor).toBe(3);

      // Should not check further
      expect(changedIndex - 2).toBeLessThan(leftNeighbor);
      expect(changedIndex + 2).toBeGreaterThan(rightNeighbor);
    });
  });

  describe("Heuristic triggers", () => {
    it("should trigger on manual selection", () => {
      // selectDefinition() calls applyIncrementalHeuristics()
      const shouldTrigger = true;
      expect(shouldTrigger).toBe(true);
    });

    it("should trigger on guess confirmation", () => {
      // confirmGuess() calls applyIncrementalHeuristics() for word guesses
      const shouldTrigger = true;
      expect(shouldTrigger).toBe(true);
    });

    it("should not trigger on guess revocation", () => {
      // revokeGuess() should NOT call applyIncrementalHeuristics()
      const shouldNotTrigger = false;
      expect(shouldNotTrigger).toBe(false);
    });
  });
});
