import { describe, it, expect } from "vitest";
import type { Age, Area, Geo, WordEntry } from "@/lib/types";

describe("types", () => {
  it("should accept valid Age values", () => {
    const ages: Age[] = [
      "Any Age",
      "Archaic",
      "Early",
      "Classical",
      "Late",
      "Later",
      "Medieval",
      "Scholar",
      "Modern",
    ];

    ages.forEach((age) => {
      expect(typeof age).toBe("string");
    });
  });

  it("should accept valid Area values", () => {
    const areas: Area[] = [
      "Any Area",
      "Agriculture",
      "Biological",
      "Drama/Arts",
      "Ecclesiastic",
      "Grammar",
      "Legal",
      "Poetic",
      "Science",
      "Technical",
      "Military",
      "Mythology",
    ];

    areas.forEach((area) => {
      expect(typeof area).toBe("string");
    });
  });

  it("should accept valid Geo values", () => {
    const geos: Geo[] = [
      "Any Geo",
      "Africa",
      "Britain",
      "China",
      "Scandinavia",
      "Egypt",
      "France/Gaul",
      "Germany",
      "Greece",
      "Italy/Rome",
      "India",
      "Balkans",
      "Netherlands",
      "Persia",
      "Near East",
      "Russia",
      "Spain/Iberia",
      "Eastern Europe",
    ];

    geos.forEach((geo) => {
      expect(typeof geo).toBe("string");
    });
  });

  it("should create valid NounEntry", () => {
    const noun: WordEntry = {
      type: "Noun",
      dictLine: "puella, puellae",
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
    };

    expect(noun.type).toBe("Noun");
    expect(noun.forms).toHaveLength(2);
    expect(noun.morphologies).toHaveLength(1);
  });

  it("should create valid VerbEntry", () => {
    const verb: WordEntry = {
      type: "Verb",
      dictLine: "amo, amare, amavi, amatus",
      forms: ["amo", "amare", "amavi", "amatus"],
      morphologies: [
        {
          line: "am.o V 1 1 PRES ACTIVE IND 1 S",
          stem: "am.o",
          pos: "V",
          analysis: "Verb 1st Conjugation Present Active Indicative 1st Person Singular",
        },
      ],
      definition: "love, like",
      dictionaryCode: "XXXAO",
      conjugation: "1st",
    };

    expect(verb.type).toBe("Verb");
    expect(verb.conjugation).toBe("1st");
  });

  it("should fix typo: Britain not Britian", () => {
    const geo: Geo = "Britain";
    expect(geo).toBe("Britain");
  });
});
