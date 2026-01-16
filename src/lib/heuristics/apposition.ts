import { isAdjectival } from "@/lib/utils/word-helpers";
import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

/**
 * Detect apposition: two nouns in the same case, adjacent or near-adjacent
 * Note: Participles are treated as adjectives and skipped
 */
export const applyAppositionHeuristic = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (word1.selectedEntry.type !== "Noun") continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    if (!cgn1) continue;

    // Look ahead for another noun in same case (allow 1-2 words gap for adjectives)
    for (let j = i + 1; j <= Math.min(i + 3, words.length - 1); j++) {
      const word2 = words[j];

      if (!word2.selectedEntry || !word2.selectedMorphology) continue;

      // Skip if it's an adjective or participle (could be modifying first noun)
      if (isAdjectival(word2.selectedEntry)) {
        continue;
      }

      if (word2.selectedEntry.type !== "Noun") break; // Stop if we hit non-noun

      const cgn2 = getCaseGenderNumber(word2.selectedMorphology);
      if (!cgn2) continue;

      // Same case = potential apposition
      if (cgn1.case === cgn2.case) {
        // Reject if already rejected
        const heuristicId = `apposition-${i}-${j}`;
        if (word2.rejectedHeuristics?.has(heuristicId)) continue;

        // Check if connection already exists
        const existingConn = word2.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i,
        );

        if (!existingConn) {
          word2.annotations.push({
            type: "modify",
            targetIndex: i,
            
            heuristic: `Apposition to "${word1.original}" (both ${cgn1.case})`,
          });
        }
      }

      break; // Only check first noun
    }
  }
};
