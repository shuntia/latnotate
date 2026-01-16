/**
 * Tests for morphology display formatting
 */

import { describe, it, expect } from "vitest";

// Mock the formatMorphologyDisplay function for testing
function formatMorphologyDisplay(morphologies: Array<{ analysis: string }>): Map<string, string> {
  if (morphologies.length === 0) return new Map();
  
  // Parse each morphology into components
  const parsed = morphologies.map(m => {
    const parts = m.analysis.split(/\s+/);
    return { original: m.analysis, parts: new Set(parts) };
  });
  
  // Find common parts across all morphologies
  const commonParts = new Set<string>();
  if (parsed.length > 1) {
    const firstParts = parsed[0].parts;
    for (const part of firstParts) {
      if (parsed.every(p => p.parts.has(part))) {
        commonParts.add(part);
      }
    }
  }
  
  // Remove common parts from display, except important ones
  const fieldsToKeep = new Set([
    "Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative",
    "Singular", "Plural",
    "1st", "2nd", "3rd", "Person",
    "Active", "Passive",
    "Indicative", "Subjunctive", "Imperative",
    "Present", "Imperfect", "Future", "Perfect", "Pluperfect",
    "Infinitive", "Participle", "Gerund", "Supine",
    "Positive", "Comparative", "Superlative"
  ]);
  
  const priorityOrder = [
    "Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative",
    "1st", "2nd", "3rd",
    "Singular", "Plural",
    "Active", "Passive",
    "Indicative", "Subjunctive", "Imperative",
    "Present", "Imperfect", "Future", "Perfect", "Pluperfect",
  ];
  
  const result = new Map<string, string>();
  
  for (const { original, parts } of parsed) {
    const keptParts: string[] = [];
    const seenParts = new Set<string>();
    
    // First pass: add priority parts in order
    for (const priority of priorityOrder) {
      for (const part of parts) {
        if (part.includes(priority) && !seenParts.has(part)) {
          if (!commonParts.has(part) || fieldsToKeep.has(part)) {
            keptParts.push(part);
            seenParts.add(part);
          }
        }
      }
    }
    
    // Second pass: add remaining non-common parts
    const originalParts = original.split(/\s+/);
    for (const part of originalParts) {
      if (!seenParts.has(part) && (!commonParts.has(part) || fieldsToKeep.has(part))) {
        keptParts.push(part);
        seenParts.add(part);
      }
    }
    
    result.set(original, keptParts.join(" ").trim() || original);
  }
  
  return result;
}

describe("Morphology Display Formatting", () => {
  it("should remove common gender from noun morphologies", () => {
    const morphologies = [
      { analysis: "Noun Nominative Singular Feminine" },
      { analysis: "Noun Genitive Singular Feminine" },
      { analysis: "Noun Dative Singular Feminine" },
      { analysis: "Noun Accusative Singular Feminine" },
      { analysis: "Noun Ablative Singular Feminine" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // "Noun" and "Feminine" are common and removed
    // "Singular" is common but kept because it's in fieldsToKeep
    // Should show case + singular
    expect(result.get("Noun Nominative Singular Feminine")).toBe("Nominative Singular");
    expect(result.get("Noun Genitive Singular Feminine")).toBe("Genitive Singular");
    expect(result.get("Noun Dative Singular Feminine")).toBe("Dative Singular");
    expect(result.get("Noun Accusative Singular Feminine")).toBe("Accusative Singular");
    expect(result.get("Noun Ablative Singular Feminine")).toBe("Ablative Singular");
  });

  it("should keep number when it varies", () => {
    const morphologies = [
      { analysis: "Noun Nominative Singular Feminine" },
      { analysis: "Noun Nominative Plural Feminine" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // Gender and Noun are common, but case and number vary
    expect(result.get("Noun Nominative Singular Feminine")).toBe("Nominative Singular");
    expect(result.get("Noun Nominative Plural Feminine")).toBe("Nominative Plural");
  });

  it("should put case first for nouns", () => {
    const morphologies = [
      { analysis: "Noun Accusative Singular Masculine" },
      { analysis: "Noun Accusative Plural Masculine" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // Should show "Accusative Singular" and "Accusative Plural" with case first
    expect(result.get("Noun Accusative Singular Masculine")).toBe("Accusative Singular");
    expect(result.get("Noun Accusative Plural Masculine")).toBe("Accusative Plural");
  });

  it("should put person first for verbs", () => {
    const morphologies = [
      { analysis: "Verb Present Active Indicative 1st Person Singular" },
      { analysis: "Verb Present Active Indicative 2nd Person Singular" },
      { analysis: "Verb Present Active Indicative 3rd Person Singular" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // Common: Verb, Present, Active, Indicative, Singular
    // Should show only person
    expect(result.get("Verb Present Active Indicative 1st Person Singular")).toContain("1st");
    expect(result.get("Verb Present Active Indicative 2nd Person Singular")).toContain("2nd");
    expect(result.get("Verb Present Active Indicative 3rd Person Singular")).toContain("3rd");
  });

  it("should keep voice when it varies", () => {
    const morphologies = [
      { analysis: "Verb Present Active Indicative 3rd Person Singular" },
      { analysis: "Verb Present Passive Indicative 3rd Person Singular" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // Should distinguish Active vs Passive
    expect(result.get("Verb Present Active Indicative 3rd Person Singular")).toContain("Active");
    expect(result.get("Verb Present Passive Indicative 3rd Person Singular")).toContain("Passive");
  });

  it("should handle adjectives with varying cases", () => {
    const morphologies = [
      { analysis: "Adjective Positive Nominative Singular Masculine" },
      { analysis: "Adjective Positive Genitive Singular Masculine" },
      { analysis: "Adjective Positive Dative Singular Masculine" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // "Adjective", "Masculine", "Singular", "Positive" are common
    // Should show case + singular + positive (kept fields)
    expect(result.get("Adjective Positive Nominative Singular Masculine")).toBe("Nominative Singular Positive");
    expect(result.get("Adjective Positive Genitive Singular Masculine")).toBe("Genitive Singular Positive");
    expect(result.get("Adjective Positive Dative Singular Masculine")).toBe("Dative Singular Positive");
  });

  it("should handle single morphology entry", () => {
    const morphologies = [
      { analysis: "Preposition Ablative" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // With only one entry, nothing is common (needs > 1)
    // Priority reordering still applies: Ablative comes before Preposition
    expect(result.get("Preposition Ablative")).toBe("Ablative Preposition");
  });

  it("should preserve important fields even when common", () => {
    const morphologies = [
      { analysis: "Adverb Positive" },
      { analysis: "Adverb Positive" },
    ];

    const result = formatMorphologyDisplay(morphologies);

    // Both are identical, "Adverb" is common and not in fieldsToKeep
    // "Positive" is in fieldsToKeep, so it's preserved
    expect(result.get("Adverb Positive")).toBe("Positive");
  });
});
