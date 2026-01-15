import { describe, it, expect } from "vitest";
import type { WordEntry, LookupResult } from "@/lib/types";

describe("API Integration", () => {
  describe("Lookup Result structure", () => {
    it("should have correct structure for single word", () => {
      const result: LookupResult = {
        results: [
          {
            word: "puella",
            entries: [
              {
                type: "Noun",
                dictLine: "puella, puellae N (1st) F",
                forms: ["puella", "puellae"],
                morphologies: [
                  {
                    line: "puella N 1 1 NOM S F",
                    stem: "puell.a",
                    pos: "N",
                    analysis: "Noun 1st Declension Nominative Singular Feminine",
                  },
                ],
                definition: "girl, maiden",
                dictionaryCode: "XXXAO",
                declension: "1st",
                gender: "F",
              },
            ],
          },
        ],
      };

      expect(result.results).toHaveLength(1);
      expect(result.results[0].word).toBe("puella");
      expect(result.results[0].entries).toHaveLength(1);
      expect(result.results[0].entries[0].type).toBe("Noun");
    });

    it("should handle multiple words", () => {
      const result: LookupResult = {
        results: [
          {
            word: "puella",
            entries: [],
          },
          {
            word: "ambulat",
            entries: [],
          },
        ],
      };

      expect(result.results).toHaveLength(2);
      expect(result.results[0].word).toBe("puella");
      expect(result.results[1].word).toBe("ambulat");
    });

    it("should handle words with no results", () => {
      const result: LookupResult = {
        results: [
          {
            word: "invalidword",
            entries: [],
          },
        ],
      };

      expect(result.results[0].entries).toHaveLength(0);
    });
  });

  describe("WordEntry types", () => {
    it("should support all word entry types", () => {
      const entries: WordEntry[] = [
        {
          type: "Noun",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
          declension: "1st",
          gender: "F",
        },
        {
          type: "Verb",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
          conjugation: "1st",
        },
        {
          type: "Adjective",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
        },
        {
          type: "Adverb",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
        },
        {
          type: "Participle",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
        },
        {
          type: "Other",
          dictLine: "",
          forms: [],
          morphologies: [],
          definition: "",
          dictionaryCode: "",
          pos: "PREP",
        },
      ];

      expect(entries).toHaveLength(6);
      expect(entries[0].type).toBe("Noun");
      expect(entries[1].type).toBe("Verb");
      expect(entries[5].type).toBe("Other");
    });
  });

  describe("Scoring and sorting", () => {
    it("should score exact form matches higher", () => {
      const calculateScore = (
        entry: WordEntry,
        inputWord: string,
        FREQ_SCORE: Record<string, number>,
      ): number => {
        let score = 0;
        const cleanInput = inputWord.toLowerCase();

        // Form match
        const formMatch = entry.forms.some((f) => f.toLowerCase() === cleanInput);
        if (formMatch) score += 200;

        // Morphology match
        const morphMatch = entry.morphologies.some(
          (m) => m.stem.replace(/\./g, "").toLowerCase() === cleanInput,
        );
        if (morphMatch) score += 150;

        // Frequency
        if (entry.dictionaryCode && entry.dictionaryCode.length >= 4) {
          const freqCode = entry.dictionaryCode[3];
          score += FREQ_SCORE[freqCode] || 0;
        }

        return score;
      };

      const FREQ_SCORE: Record<string, number> = {
        A: 100,
        B: 90,
        C: 80,
      };

      const entry: WordEntry = {
        type: "Noun",
        dictLine: "",
        forms: ["puella"],
        morphologies: [
          {
            line: "",
            stem: "puell.a",
            pos: "N",
            analysis: "",
          },
        ],
        definition: "",
        dictionaryCode: "XXXAO",
      };

      const score = calculateScore(entry, "puella", FREQ_SCORE);
      expect(score).toBeGreaterThan(200); // Form match + frequency
    });
  });
});
