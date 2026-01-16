import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "./morphology";
import { WordEntry } from "@/lib/types";

export const cleanWord = (w: string) => w.replace(/[.,;?!:()"]/g, "").toLowerCase();

/**
 * Check if a word's entry is an adjective OR participle
 * Participles are treated as adjectives grammatically
 */
export const isAdjectival = (entry: WordEntry): boolean => {
  return entry.type === "Adjective" || entry.type === "Participle";
};

/**
 * Check if a word is a noun (but not adjective/participle)
 */
export const isNoun = (entry: WordEntry): boolean => {
  return entry.type === "Noun";
};

/**
 * Check if a word is noun-like (can be described by adjectives)
 * This includes nouns and pronouns with cases
 */
export const isNounLike = (entry: WordEntry): boolean => {
  if (entry.type === "Noun") return true;
  
  // Check if it's a pronoun with cases
  if (entry.type === "Other") {
    return entry.morphologies.some(m => 
      (m.analysis || m.line || "").includes("Pronoun")
    );
  }
  
  return false;
};

/**
 * Check if an entry is declinable (has case/gender/number)
 */
export const isDeclinable = (entry: WordEntry): boolean => {
  return isAdjectival(entry) || isNounLike(entry);
};

export const getGuaranteedCase = (word: SentenceWord): string | null => {
  if (!word.lookupResults || word.lookupResults.length === 0) return null;
  
  // Collect all cases from all entries
  const allCases = new Set<string>();
  
  for (const entry of word.lookupResults) {
    for (const morph of entry.morphologies) {
      const cgn = getCaseGenderNumber(morph.analysis);
      if (cgn) {
        allCases.add(cgn.case);
      }
    }
  }
  
  // If all morphologies agree on one case, it's guaranteed
  if (allCases.size === 1) {
    return Array.from(allCases)[0];
  }
  
  return null;
};

export const getGuaranteedPOS = (word: SentenceWord): string | null => {
  if (!word.lookupResults || word.lookupResults.length === 0) return null;
  
  const allPOS = new Set<string>();
  for (const entry of word.lookupResults) {
    allPOS.add(entry.type);
  }
  
  if (allPOS.size === 1) {
    return Array.from(allPOS)[0];
  }
  
  return null;
};

export const isGuaranteedPreposition = (word: SentenceWord): boolean => {
  return !!word.selectedEntry && word.selectedEntry.type === "Other" && 
         !!word.selectedMorphology && word.selectedMorphology.includes("Preposition");
};

export const isPotentialPreposition = (word: SentenceWord): boolean => {
  if (!word.lookupResults) return false;
  return word.lookupResults.some(entry => 
    entry.type === "Other" && 
    entry.morphologies.some(m => {
      const analysis = m.analysis || m.line || "";
      return analysis.includes("Preposition") || analysis.includes("PREP");
    })
  );
};

export const isConjunction = (word: SentenceWord): boolean => {
  const cleaned = cleanWord(word.original);
  
  // Common Latin conjunctions
  const conjunctions = [
    'et', 'ac', 'atque', 'que', '-que',
    'sed', 'autem', 'aut', 'vel', 
    'nam', 'enim', 'igitur', 'ergo',
    'an', 'ne', 'nec', 'neque',
    'quia', 'quod', 'quoniam', 'cum',
    'si', 'nisi', 'ut', 'ne'
  ];
  
  if (conjunctions.includes(cleaned)) return true;
  
  // Also check if selected as conjunction
  if (word.selectedEntry?.type === "Other" && 
      word.selectedMorphology?.includes("Conjunction")) {
    return true;
  }
  
  // Check if has conjunction entries
  return word.lookupResults?.some(entry =>
    entry.type === "Other" &&
    entry.morphologies.some(m => m.analysis.includes("Conjunction"))
  ) || false;
};

/**
 * Extract case requirements from a preposition's morphology
 * Returns array of cases the preposition can take (e.g., ["Accusative"], ["Ablative"], or ["Accusative", "Ablative"])
 */
export const getPrepositionCases = (word: SentenceWord): string[] | null => {
  if (!word.lookupResults) return null;
  
  const cases = new Set<string>();
  
  for (const entry of word.lookupResults) {
    if (entry.type !== "Other") continue;
    
    for (const morph of entry.morphologies) {
      if (!morph.analysis.includes("Preposition")) continue;
      
      // Extract case from morphology string
      // Format: "PREP ACC" or "Preposition Accusative"
      const accMatch = morph.analysis.match(/(Accusative|ACC)/i);
      const ablMatch = morph.analysis.match(/(Ablative|ABL)/i);
      
      if (accMatch) cases.add("Accusative");
      if (ablMatch) cases.add("Ablative");
    }
  }
  
  return cases.size > 0 ? Array.from(cases) : null;
};

/**
 * Get case requirements from selected preposition morphology
 * Returns the specific cases for the selected preposition form
 */
export const getSelectedPrepositionCases = (word: SentenceWord): string[] | null => {
  if (!word.selectedEntry || word.selectedEntry.type !== "Other") return null;
  if (!word.selectedMorphology || !word.selectedMorphology.includes("Preposition")) return null;
  
  const cases: string[] = [];
  
  // Extract case from selected morphology
  // Format: "PREP ACC" or "Preposition Accusative"
  const accMatch = word.selectedMorphology.match(/(Accusative|ACC)/i);
  const ablMatch = word.selectedMorphology.match(/(Ablative|ABL)/i);
  
  if (accMatch) cases.push("Accusative");
  if (ablMatch) cases.push("Ablative");
  
  return cases.length > 0 ? cases : null;
};
