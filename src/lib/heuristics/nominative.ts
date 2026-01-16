import { SentenceWord } from "@/lib/types/sentence";
import {
  getVerbPersonNumber,
  isNominative,
  getGrammaticalNumber,
} from "@/lib/utils/morphology";
import { cleanWord, isAdjectival, isNoun } from "@/lib/utils/word-helpers";

// Helper to check if a word is a sentence separator
const isSentenceSeparator = (word: SentenceWord): boolean => {
  const cleaned = cleanWord(word.original);
  
  // Period, semicolon, colon, question mark, exclamation
  if (!cleaned || cleaned === '.' || cleaned === ';' || cleaned === ':' || cleaned === '?' || cleaned === '!') {
    return true;
  }
  
  // Quotes
  if (word.original === '"' || word.original === "'" || word.original === '«' || word.original === '»') {
    return true;
  }
  
  return false;
};

export const applyNominativeChunkGuessing = (words: SentenceWord[]): void => {
  // Find first verb to limit scope
  const firstVerbIdx = words.findIndex(
    (w) => w.selectedEntry?.type === "Verb" && w.selectedMorphology,
  );
  if (firstVerbIdx === -1) return;

  const verb = words[firstVerbIdx];
  const verbInfo = getVerbPersonNumber(verb.selectedMorphology!);
  if (!verbInfo || verbInfo.person !== 3) return;

  // Find sentence boundaries around the verb
  // Boundary = sentence punctuation OR previous verb (not participle)
  let sentenceStart = 0;
  let sentenceEnd = words.length - 1;
  
  // Look backward from verb to find sentence start (punctuation or previous verb)
  for (let i = firstVerbIdx - 1; i >= 0; i--) {
    if (isSentenceSeparator(words[i])) {
      sentenceStart = i + 1;
      break;
    }
    // Also stop at previous verb (not participle - participles are treated as adjectives)
    if (words[i].selectedEntry?.type === "Verb" && words[i].selectedMorphology) {
      sentenceStart = i + 1;
      break;
    }
  }
  
  // Look forward from verb to find sentence end (punctuation only, not next verb)
  for (let i = firstVerbIdx + 1; i < words.length; i++) {
    if (isSentenceSeparator(words[i])) {
      sentenceEnd = i - 1;
      break;
    }
  }

  // Find the first potential nominative in this sentence
  // Prefer nouns, but accept adjectives/participles as substantives
  let bestMatch: { word: SentenceWord, idx: number, entry: any, morph: any, isNoun: boolean } | null = null;
  
  for (let i = sentenceStart; i <= sentenceEnd; i++) {
    const word = words[i];
    if (word.selectedEntry) continue;

    // Check if nominative guess was previously rejected for this word
    if (word.rejectedHeuristics?.has('nominative-guess')) continue;

    const entries = word.lookupResults || [];
    for (const entry of entries) {
      const nomMorphs = entry.morphologies.filter((m) => {
        const isNom = isNominative(m.analysis);
        const num = getGrammaticalNumber(m.analysis);
        return isNom && num === verbInfo.number;
      });

      if (nomMorphs.length > 0) {
        const isNoun = entry.type === "Noun";
        
        // If we found a noun, use it immediately
        if (isNoun) {
          word.selectedEntry = entry;
          word.selectedMorphology = nomMorphs[0].analysis;
          word.guessed = true;
          word.heuristic = `Subject of "${verb.original}" (${verbInfo.number === "S" ? "singular" : "plural"} 3rd person)`;
          
          // Track that this nominative depends on the verb
          if (!verb.dependentWords) verb.dependentWords = new Set();
          verb.dependentWords.add(i);
          
          return; // Stop after finding first noun
        }
        
        // If it's an adjective or participle, save it as potential substantive
        if (!bestMatch && isAdjectival(entry)) {
          bestMatch = { word, idx: i, entry, morph: nomMorphs[0], isNoun: false };
        }
      }
    }
  }
  
  // If no noun found, use the first adjective/participle as substantive
  if (bestMatch) {
    bestMatch.word.selectedEntry = bestMatch.entry;
    bestMatch.word.selectedMorphology = bestMatch.morph.analysis;
    bestMatch.word.guessed = true;
    bestMatch.word.heuristic = `Subject of "${verb.original}" (${verbInfo.number === "S" ? "singular" : "plural"} 3rd person) - substantive ${bestMatch.entry.type.toLowerCase()}`;
    
    // Track that this nominative depends on the verb
    if (!verb.dependentWords) verb.dependentWords = new Set();
    verb.dependentWords.add(bestMatch.idx);
  }
};
