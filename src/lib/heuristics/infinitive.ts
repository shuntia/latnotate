import { SentenceWord } from "@/lib/types/sentence";

/**
 * Infinitive Heuristic
 * 
 * If a word has an infinitive form among its possibilities, it's probably an infinitive.
 * Infinitives are very common in Latin and often distinguishable.
 */
export const applyInfinitiveHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word) => {
    // Skip if already has selection (manual or heuristic)
    if (word.selectedEntry) return;
    if (!word.lookupResults || word.lookupResults.length === 0) return;

    // Check all entries for infinitive possibilities
    let infinitiveEntry: typeof word.lookupResults[0] | null = null;
    let infinitiveMorphology: string | null = null;

    for (const entry of word.lookupResults) {
      if (entry.type !== "Verb") continue;

      // Check if any morphology contains "Infinitive"
      const infinitiveMorph = entry.morphologies.find((m) =>
        m.analysis.includes("Infinitive")
      );

      if (infinitiveMorph) {
        infinitiveEntry = entry;
        infinitiveMorphology = infinitiveMorph.analysis;
        break;
      }
    }

    // If we found an infinitive possibility, select it
    if (infinitiveEntry && infinitiveMorphology) {
      // Check if already rejected
      const heuristicId = `infinitive-${word.index}`;
      if (word.rejectedHeuristics?.has(heuristicId)) return;

      word.selectedEntry = infinitiveEntry;
      word.selectedMorphology = infinitiveMorphology;
      word.guessed = true;
      word.heuristic = "Word has infinitive form available - likely an infinitive";
    }
  });
};
