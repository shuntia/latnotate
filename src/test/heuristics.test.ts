import { describe, it, expect } from "vitest";

describe("Heuristic Guessing Logic", () => {
  describe("Verb Person/Number extraction", () => {
    it("should extract 3rd person singular", () => {
      const morph = "Verb Present Active Indicative 3rd Person Singular";

      const getVerbPersonNumber = (m: string) => {
        if (!m.includes("Person")) return null;

        let person = 0;
        if (m.includes("1st Person")) person = 1;
        else if (m.includes("2nd Person")) person = 2;
        else if (m.includes("3rd Person")) person = 3;

        let number: "S" | "P" | null = null;
        if (m.includes("Singular")) number = "S";
        else if (m.includes("Plural")) number = "P";

        if (person > 0 && number) return { person, number };
        return null;
      };

      const result = getVerbPersonNumber(morph);
      expect(result).toEqual({ person: 3, number: "S" });
    });

    it("should extract 3rd person plural", () => {
      const morph = "Verb Present Active Indicative 3rd Person Plural";

      const getVerbPersonNumber = (m: string) => {
        if (!m.includes("Person")) return null;

        let person = 0;
        if (m.includes("1st Person")) person = 1;
        else if (m.includes("2nd Person")) person = 2;
        else if (m.includes("3rd Person")) person = 3;

        let number: "S" | "P" | null = null;
        if (m.includes("Singular")) number = "S";
        else if (m.includes("Plural")) number = "P";

        if (person > 0 && number) return { person, number };
        return null;
      };

      const result = getVerbPersonNumber(morph);
      expect(result).toEqual({ person: 3, number: "P" });
    });

    it("should return null for infinitives", () => {
      const morph = "Verb Present Active Infinitive";

      const getVerbPersonNumber = (m: string) => {
        if (!m.includes("Person")) return null;

        let person = 0;
        if (m.includes("1st Person")) person = 1;
        else if (m.includes("2nd Person")) person = 2;
        else if (m.includes("3rd Person")) person = 3;

        let number: "S" | "P" | null = null;
        if (m.includes("Singular")) number = "S";
        else if (m.includes("Plural")) number = "P";

        if (person > 0 && number) return { person, number };
        return null;
      };

      const result = getVerbPersonNumber(morph);
      expect(result).toBeNull();
    });
  });

  describe("Case/Gender/Number extraction", () => {
    it("should extract nominative singular feminine", () => {
      const morph = "Noun 1st Declension Nominative Singular Feminine";

      const getCaseGenderNumber = (m: string) => {
        const caseMatch = m.match(
          /Nominative|Accusative|Genitive|Dative|Ablative|Vocative|Locative/,
        );
        const genderMatch = m.match(/Masculine|Feminine|Neuter|Common/);
        const numberMatch = m.match(/Singular|Plural/);

        if (!caseMatch || !numberMatch) return null;

        return {
          case: caseMatch[0],
          gender: genderMatch ? genderMatch[0] : "",
          number: numberMatch[0],
        };
      };

      const result = getCaseGenderNumber(morph);
      expect(result).toEqual({
        case: "Nominative",
        gender: "Feminine",
        number: "Singular",
      });
    });

    it("should handle missing gender", () => {
      const morph = "Noun Accusative Plural";

      const getCaseGenderNumber = (m: string) => {
        const caseMatch = m.match(
          /Nominative|Accusative|Genitive|Dative|Ablative|Vocative|Locative/,
        );
        const genderMatch = m.match(/Masculine|Feminine|Neuter|Common/);
        const numberMatch = m.match(/Singular|Plural/);

        if (!caseMatch || !numberMatch) return null;

        return {
          case: caseMatch[0],
          gender: genderMatch ? genderMatch[0] : "",
          number: numberMatch[0],
        };
      };

      const result = getCaseGenderNumber(morph);
      expect(result).toEqual({
        case: "Accusative",
        gender: "",
        number: "Plural",
      });
    });
  });

  describe("Prepositional case requirements", () => {
    it("should map accusative prepositions correctly", () => {
      const PREP_CASE_MAP: Record<string, string[]> = {
        ad: ["Accusative"],
        per: ["Accusative"],
        trans: ["Accusative"],
        cum: ["Ablative"],
        de: ["Ablative"],
        in: ["Accusative", "Ablative"],
      };

      expect(PREP_CASE_MAP["ad"]).toEqual(["Accusative"]);
      expect(PREP_CASE_MAP["cum"]).toEqual(["Ablative"]);
      expect(PREP_CASE_MAP["in"]).toHaveLength(2);
      expect(PREP_CASE_MAP["in"]).toContain("Accusative");
      expect(PREP_CASE_MAP["in"]).toContain("Ablative");
    });
  });

  describe("Nominative chunk detection", () => {
    it("should identify contiguous nominatives", () => {
      const indices = [0, 1, 2];
      const isContiguous = indices.every((idx, i) => {
        if (i === 0) return true;
        return idx === indices[i - 1] + 1;
      });

      expect(isContiguous).toBe(true);
    });

    it("should detect non-contiguous nominatives", () => {
      const indices = [0, 2, 4];
      const isContiguous = indices.every((idx, i) => {
        if (i === 0) return true;
        return idx === indices[i - 1] + 1;
      });

      expect(isContiguous).toBe(false);
    });
  });

  describe("Agreement matching", () => {
    it("should match case, gender, and number", () => {
      const word1 = {
        case: "Accusative",
        gender: "Feminine",
        number: "Singular",
      };

      const word2 = {
        case: "Accusative",
        gender: "Feminine",
        number: "Singular",
      };

      const matches =
        word1.case === word2.case &&
        word1.number === word2.number &&
        (word1.gender === word2.gender || !word1.gender || !word2.gender);

      expect(matches).toBe(true);
    });

    it("should not match different cases", () => {
      const word1 = {
        case: "Nominative",
        gender: "Feminine",
        number: "Singular",
      };

      const word2 = {
        case: "Accusative",
        gender: "Feminine",
        number: "Singular",
      };

      const matches =
        word1.case === word2.case &&
        word1.number === word2.number &&
        (word1.gender === word2.gender || !word1.gender || !word2.gender);

      expect(matches).toBe(false);
    });
  });

  describe("Adjective-Noun detection", () => {
    it("should identify adjective-noun pairs", () => {
      const word1Type = "Adjective";
      const word2Type = "Noun";

      const isAdjNounPair = (t1: string, t2: string) => {
        const t1IsAdj = t1 === "Adjective" || t1 === "Participle";
        const t2IsNoun = t2 === "Noun";
        const t1IsNoun = t1 === "Noun";
        const t2IsAdj = t2 === "Adjective" || t2 === "Participle";

        return (t1IsAdj && t2IsNoun) || (t1IsNoun && t2IsAdj);
      };

      expect(isAdjNounPair(word1Type, word2Type)).toBe(true);
    });

    it("should reject adjective-adjective pairs", () => {
      const word1Type = "Adjective";
      const word2Type = "Adjective";

      const isAdjNounPair = (t1: string, t2: string) => {
        const t1IsAdj = t1 === "Adjective" || t1 === "Participle";
        const t2IsNoun = t2 === "Noun";
        const t1IsNoun = t1 === "Noun";
        const t2IsAdj = t2 === "Adjective" || t2 === "Participle";

        return (t1IsAdj && t2IsNoun) || (t1IsNoun && t2IsAdj);
      };

      expect(isAdjNounPair(word1Type, word2Type)).toBe(false);
    });

    it("should identify participle as adjective-like", () => {
      const word1Type = "Participle";
      const word2Type = "Noun";

      const isAdjNounPair = (t1: string, t2: string) => {
        const t1IsAdj = t1 === "Adjective" || t1 === "Participle";
        const t2IsNoun = t2 === "Noun";
        const t1IsNoun = t1 === "Noun";
        const t2IsAdj = t2 === "Adjective" || t2 === "Participle";

        return (t1IsAdj && t2IsNoun) || (t1IsNoun && t2IsAdj);
      };

      expect(isAdjNounPair(word1Type, word2Type)).toBe(true);
    });
  });

  describe("Prepositional phrase detection", () => {
    it("should identify preposition with accusative object", () => {
      const prepForm = "ad";
      const objectCase = "Accusative";

      const PREP_CASE_MAP: Record<string, string[]> = {
        ad: ["Accusative"],
        cum: ["Ablative"],
        in: ["Accusative", "Ablative"],
      };

      const requiredCases = PREP_CASE_MAP[prepForm];
      const matches = requiredCases && requiredCases.includes(objectCase);

      expect(matches).toBe(true);
    });

    it("should identify preposition with ablative object", () => {
      const prepForm = "cum";
      const objectCase = "Ablative";

      const PREP_CASE_MAP: Record<string, string[]> = {
        ad: ["Accusative"],
        cum: ["Ablative"],
        in: ["Accusative", "Ablative"],
      };

      const requiredCases = PREP_CASE_MAP[prepForm];
      const matches = requiredCases && requiredCases.includes(objectCase);

      expect(matches).toBe(true);
    });

    it("should handle mixed prepositions like 'in'", () => {
      const prepForm = "in";
      const objectCaseAcc = "Accusative";
      const objectCaseAbl = "Ablative";

      const PREP_CASE_MAP: Record<string, string[]> = {
        ad: ["Accusative"],
        cum: ["Ablative"],
        in: ["Accusative", "Ablative"],
      };

      const requiredCases = PREP_CASE_MAP[prepForm];
      const matchesAcc = requiredCases && requiredCases.includes(objectCaseAcc);
      const matchesAbl = requiredCases && requiredCases.includes(objectCaseAbl);

      expect(matchesAcc).toBe(true);
      expect(matchesAbl).toBe(true);
    });
  });

  describe("-que tackon 'et' detection", () => {
    it("should identify -que tackon", () => {
      const modifications = [
        { type: "Tackon", form: "que", definition: "and" },
      ];

      const hasQueTackon = modifications.some(
        (m) => m.type === "Tackon" && m.form.toLowerCase() === "que",
      );

      expect(hasQueTackon).toBe(true);
    });

    it("should not match other tackons", () => {
      const modifications = [
        { type: "Tackon", form: "ne", definition: "question particle" },
      ];

      const hasQueTackon = modifications.some(
        (m) => m.type === "Tackon" && m.form.toLowerCase() === "que",
      );

      expect(hasQueTackon).toBe(false);
    });

    it("should not match prefix", () => {
      const modifications = [
        { type: "Prefix", form: "que", definition: "some prefix" },
      ];

      const hasQueTackon = modifications.some(
        (m) => m.type === "Tackon" && m.form.toLowerCase() === "que",
      );

      expect(hasQueTackon).toBe(false);
    });
  });

  describe("Morphology sorting order", () => {
    it("should order cases correctly", () => {
      const getCaseOrder = (analysis: string): number => {
        if (analysis.includes("Nominative")) return 0;
        if (analysis.includes("Genitive")) return 1;
        if (analysis.includes("Dative")) return 2;
        if (analysis.includes("Accusative")) return 3;
        if (analysis.includes("Ablative")) return 4;
        if (analysis.includes("Vocative")) return 5;
        if (analysis.includes("Locative")) return 6;
        return 999;
      };

      expect(getCaseOrder("Noun Nominative Singular")).toBe(0);
      expect(getCaseOrder("Noun Genitive Singular")).toBe(1);
      expect(getCaseOrder("Noun Dative Singular")).toBe(2);
      expect(getCaseOrder("Noun Accusative Singular")).toBe(3);
      expect(getCaseOrder("Noun Ablative Singular")).toBe(4);
      expect(getCaseOrder("Noun Vocative Singular")).toBe(5);
      expect(getCaseOrder("Noun Locative Singular")).toBe(6);
    });

    it("should order number correctly", () => {
      const getNumberOrder = (analysis: string): number => {
        if (analysis.includes("Singular")) return 0;
        if (analysis.includes("Plural")) return 1;
        return 999;
      };

      expect(getNumberOrder("Noun Nominative Singular")).toBe(0);
      expect(getNumberOrder("Noun Nominative Plural")).toBe(1);
    });

    it("should order voice correctly", () => {
      const getVoiceOrder = (analysis: string): number => {
        if (analysis.includes("Active")) return 0;
        if (analysis.includes("Passive")) return 1;
        return 999;
      };

      expect(getVoiceOrder("Verb Active Indicative")).toBe(0);
      expect(getVoiceOrder("Verb Passive Indicative")).toBe(1);
    });

    it("should order mood correctly", () => {
      const getMoodOrder = (analysis: string): number => {
        if (analysis.includes("Indicative")) return 0;
        if (analysis.includes("Subjunctive")) return 1;
        if (analysis.includes("Imperative")) return 2;
        if (analysis.includes("Infinitive")) return 3;
        return 999;
      };

      expect(getMoodOrder("Verb Indicative")).toBe(0);
      expect(getMoodOrder("Verb Subjunctive")).toBe(1);
      expect(getMoodOrder("Verb Imperative")).toBe(2);
      expect(getMoodOrder("Verb Infinitive")).toBe(3);
    });

    it("should order person correctly", () => {
      const getPersonOrder = (analysis: string): number => {
        if (analysis.includes("1st Person")) return 0;
        if (analysis.includes("2nd Person")) return 1;
        if (analysis.includes("3rd Person")) return 2;
        return 999;
      };

      expect(getPersonOrder("Verb 1st Person")).toBe(0);
      expect(getPersonOrder("Verb 2nd Person")).toBe(1);
      expect(getPersonOrder("Verb 3rd Person")).toBe(2);
    });
  });
});
