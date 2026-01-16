import { Morphology } from "@/lib/types";
import { TagType, SentenceWord } from "@/lib/types/sentence";

export const getTagFromWord = (word: SentenceWord): TagType | null => {
  if (!word.selectedEntry) return null;
  const morph = word.selectedMorphology || "";
  const pos = word.selectedEntry.type;

  // 1. Case (Highest Priority for Nouns/Adjectives/Pronouns)
  if (morph.includes("Nominative")) return "NOM";
  if (morph.includes("Accusative")) return "ACC";
  if (morph.includes("Dative")) return "DAT";
  if (morph.includes("Ablative")) return "ABL";
  if (morph.includes("Locative")) return "LOC";
  if (morph.includes("Vocative")) return "VOC";
  if (morph.includes("Genitive")) return "GEN";

  // 2. Verb Forms
  if (morph.includes("Infinitive")) return "INF";

  // 3. Part of Speech (Fallback)
  const p = pos as string;
  if (p === "Adverb") return "ADV";
  if (p === "Conjunction") return "CONJ";
  if (p === "Preposition") return "PREP";
  if (p === "Interjection") return "INTERJ";
  if (p === "Pronoun") return "PRON";
  if (p === "Numeral") return "NUM";

  return null;
};

// Morphology sorting helpers
export const getCaseOrder = (analysis: string): number => {
  if (analysis.includes("Nominative")) return 0;
  if (analysis.includes("Genitive")) return 1;
  if (analysis.includes("Dative")) return 2;
  if (analysis.includes("Accusative")) return 3;
  if (analysis.includes("Ablative")) return 4;
  if (analysis.includes("Vocative")) return 5;
  if (analysis.includes("Locative")) return 6;
  return 999; // No case found
};

export const getNumberOrder = (analysis: string): number => {
  if (analysis.includes("Singular")) return 0;
  if (analysis.includes("Plural")) return 1;
  return 999;
};

export const getVoiceOrder = (analysis: string): number => {
  if (analysis.includes("Active")) return 0;
  if (analysis.includes("Passive")) return 1;
  return 999;
};

export const getMoodOrder = (analysis: string): number => {
  if (analysis.includes("Indicative")) return 0;
  if (analysis.includes("Subjunctive")) return 1;
  if (analysis.includes("Imperative")) return 2;
  if (analysis.includes("Infinitive")) return 3;
  return 999;
};

export const getPersonOrder = (analysis: string): number => {
  if (analysis.includes("1st Person")) return 0;
  if (analysis.includes("2nd Person")) return 1;
  if (analysis.includes("3rd Person")) return 2;
  return 999;
};

export const sortMorphologies = (morphologies: Morphology[], guessedAnalysis?: string) => {
  return morphologies.slice().sort((a, b) => {
    // Guessed morphology always comes first
    if (guessedAnalysis) {
      if (a.analysis === guessedAnalysis) return -1;
      if (b.analysis === guessedAnalysis) return 1;
    }

    // Sort by: Case → Number → Voice → Mood → Person
    const caseCompare = getCaseOrder(a.analysis) - getCaseOrder(b.analysis);
    if (caseCompare !== 0) return caseCompare;

    const numberCompare = getNumberOrder(a.analysis) - getNumberOrder(b.analysis);
    if (numberCompare !== 0) return numberCompare;

    const voiceCompare = getVoiceOrder(a.analysis) - getVoiceOrder(b.analysis);
    if (voiceCompare !== 0) return voiceCompare;

    const moodCompare = getMoodOrder(a.analysis) - getMoodOrder(b.analysis);
    if (moodCompare !== 0) return moodCompare;

    const personCompare = getPersonOrder(a.analysis) - getPersonOrder(b.analysis);
    return personCompare;
  });
};

export const formatMorphologyDisplay = (morphologies: Morphology[]): Map<string, string> => {
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
  
  // Remove common parts from display, except part of speech
  const fieldsToKeep = new Set([
    // Cases (always show if present)
    "Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative",
    // Number (always show if not common)
    "Singular", "Plural",
    // Person (always show if present)
    "1st", "2nd", "3rd", "Person",
    // Voice
    "Active", "Passive",
    // Mood
    "Indicative", "Subjunctive", "Imperative",
    // Tense
    "Present", "Imperfect", "Future", "Perfect", "Pluperfect",
    // Other verb forms
    "Infinitive", "Participle", "Gerund", "Supine",
    // Degree
    "Positive", "Comparative", "Superlative"
  ]);
  
  // Priority order for display: Case/Person first, then Number, then everything else
  const priorityOrder = [
    // Cases first
    "Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative",
    // Person first for verbs
    "1st", "2nd", "3rd",
    // Number
    "Singular", "Plural",
    // Voice
    "Active", "Passive",
    // Mood
    "Indicative", "Subjunctive", "Imperative",
    // Tense
    "Present", "Imperfect", "Future", "Perfect", "Pluperfect",
    // Everything else in original order
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
};

export const getVerbPersonNumber = (
  morph: string,
): { person: number; number: "S" | "P" } | null => {
  if (!morph.includes("Person")) return null;

  let person = 0;
  if (morph.includes("1st Person")) person = 1;
  else if (morph.includes("2nd Person")) person = 2;
  else if (morph.includes("3rd Person")) person = 3;

  let number: "S" | "P" | null = null;
  if (morph.includes("Singular")) number = "S";
  else if (morph.includes("Plural")) number = "P";

  if (person > 0 && number) return { person, number };
  return null;
};

export const isNominative = (morph: string): boolean => {
  return morph.includes("Nominative");
};

export const getGrammaticalNumber = (morph: string): "S" | "P" | null => {
  if (morph.includes("Singular")) return "S";
  if (morph.includes("Plural")) return "P";
  return null;
};

export const getCaseGenderNumber = (
  morph: string,
): { case: string; gender: string; number: string } | null => {
  const caseMatch =
    morph.match(/Nominative|Accusative|Genitive|Dative|Ablative|Vocative|Locative/);
  const genderMatch = morph.match(/Masculine|Feminine|Neuter|Common/);
  const numberMatch = morph.match(/Singular|Plural/);

  if (!caseMatch || !numberMatch) return null;

  return {
    case: caseMatch[0],
    gender: genderMatch ? genderMatch[0] : "",
    number: numberMatch[0],
  };
};
