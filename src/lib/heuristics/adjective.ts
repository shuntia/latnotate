import { isAdjectival } from "@/lib/utils/word-helpers";
import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

/**
 * Connect adjacent adjectives and nouns that agree in case/gender/number
 * Note: Participles are treated as adjectives
 */
export const applyAdjectiveNounGuessing = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (!word2.selectedEntry || !word2.selectedMorphology) continue;

    // Check if one is adjective/participle and other is noun
    const word1IsAdj = isAdjectival(word1.selectedEntry);
    const word2IsAdj = isAdjectival(word2.selectedEntry);
    const word1IsNoun = word1.selectedEntry.type === "Noun";
    const word2IsNoun = word2.selectedEntry.type === "Noun";

    // Skip if both are adjectives or both are nouns
    if ((word1IsAdj && word2IsAdj) || (word1IsNoun && word2IsNoun)) continue;
    if (!((word1IsAdj && word2IsNoun) || (word1IsNoun && word2IsAdj))) continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) continue;

    // Check if case, gender, and number match
    if (
      cgn1.case === cgn2.case &&
      cgn1.number === cgn2.number &&
      (cgn1.gender === cgn2.gender || !cgn1.gender || !cgn2.gender)
    ) {
      // Connect adjective to noun
      const fromIdx = word1IsAdj ? i : i + 1;
      const toIdx = word1IsAdj ? i + 1 : i;

      // Check if this specific connection was previously rejected
      if (words[fromIdx].rejectedHeuristics?.has(`modify-${toIdx}`)) continue;

      const existingConn = words[fromIdx].annotations.find(
        (a) => a.type === "modify" && a.targetIndex === toIdx,
      );

      if (!existingConn) {
        words[fromIdx].annotations.push({
          type: "modify",
          targetIndex: toIdx,
          
          heuristic: `Adjective/participle modifying noun: ${cgn1.case} ${cgn1.number}${cgn1.gender ? " " + cgn1.gender : ""}`,
        });

        // Track that the adjective depends on the noun
        if (!words[toIdx].dependentWords)
          words[toIdx].dependentWords = new Set();
        words[toIdx].dependentWords.add(fromIdx);
      }
    }
  }
};
