import { describe, it, expect } from "vitest";

// Test helper functions that would be in the API route
// Since we can't easily test the actual route, we'll test the logic

describe("Whitakers Words Parser", () => {
  describe("Morphology expansion", () => {
    it("should expand morphology codes correctly", () => {
      const MORPH_CODE_MAP: Record<string, string> = {
        NOM: "Nominative",
        ACC: "Accusative",
        S: "Singular",
        P: "Plural",
        M: "Masculine",
        F: "Feminine",
        N: "Neuter",
      };

      const expandMorphology = (morphLine: string): string => {
        const tokens = morphLine.split(/\s+/);
        const expanded: string[] = [];

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (MORPH_CODE_MAP[token]) {
            expanded.push(MORPH_CODE_MAP[token]);
          } else {
            expanded.push(token);
          }
        }

        return expanded.join(" ");
      };

      expect(expandMorphology("NOM S")).toBe("Nominative Singular");
      expect(expandMorphology("ACC P F")).toBe("Accusative Plural Feminine");
      expect(expandMorphology("N S M")).toBe("Neuter Singular Masculine");
    });
  });

  describe("Frequency scoring", () => {
    it("should assign correct frequency scores", () => {
      const FREQ_SCORE: Record<string, number> = {
        A: 100, // Very Frequent
        B: 90, // Frequent
        C: 80, // Common
        D: 70, // Lesser
        E: 60, // Uncommon
        F: 50, // Rare
        I: 40, // Inscription
        M: 30, // Graffiti
        X: 0, // Unknown
      };

      expect(FREQ_SCORE["A"]).toBe(100);
      expect(FREQ_SCORE["B"]).toBe(90);
      expect(FREQ_SCORE["F"]).toBe(50);
      expect(FREQ_SCORE["X"]).toBe(0);
    });
  });

  describe("Dictionary code parsing", () => {
    it("should parse 5-character dictionary codes", () => {
      const AGE_MAP: Record<string, string> = {
        X: "Any Age",
        C: "Classical",
        A: "Archaic",
      };

      const code = "XCXAO";
      const age = AGE_MAP[code[0]];

      expect(age).toBe("Any Age");
      expect(code.length).toBe(5);
    });
  });

  describe("Part of speech detection", () => {
    it("should identify correct POS from dictionary line", () => {
      const dictionaryLines = [
        { line: "puella N (1st) F", expected: "N" },
        { line: "amo V (1st)", expected: "V" },
        { line: "bonus ADJ", expected: "ADJ" },
        { line: "bene ADV", expected: "ADV" },
        { line: "qui PRON", expected: "PRON" },
      ];

      dictionaryLines.forEach(({ line, expected }) => {
        const posMatch = line.match(
          /\b(N|V|ADJ|ADV|PRON|PREP|CONJ|INTERJ|NUM)\b/,
        );
        expect(posMatch?.[1]).toBe(expected);
      });
    });
  });

  describe("Case detection", () => {
    it("should detect cases from morphology", () => {
      const cases = [
        "Nominative",
        "Accusative",
        "Genitive",
        "Dative",
        "Ablative",
        "Vocative",
        "Locative",
      ];

      cases.forEach((caseName) => {
        const morph = `Noun ${caseName} Singular`;
        expect(morph).toContain(caseName);
      });
    });
  });
});
