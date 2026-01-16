import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";
import { getGuaranteedPOS } from "@/lib/utils/word-helpers";

// Heuristically guess case for unselected adjectives next to selected nouns.
export const applyAdjectiveCaseGuessing = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length; i++) {
    const adjWord = words[i];

    // Skip if already selected
    if (adjWord.selectedEntry) continue;

    // Skip if not an adjective/participle (check all lookup results)
    if (!adjWord.lookupResults || adjWord.lookupResults.length === 0) continue;

    const guaranteedPOS = getGuaranteedPOS(adjWord);
    if (guaranteedPOS !== "Adjective" && guaranteedPOS !== "Participle") continue;

    // Check if adjective case guess was previously rejected
    if (adjWord.rejectedHeuristics?.has("adjective-case-guess")) continue;

    // Look for adjacent noun (before or after)
    const adjacentIndices = [i - 1, i + 1].filter(
      (idx) => idx >= 0 && idx < words.length,
    );

    for (const nounIdx of adjacentIndices) {
      const nounWord = words[nounIdx];

      // Must be a selected noun
      if (!nounWord.selectedEntry || !nounWord.selectedMorphology) continue;
      if (nounWord.selectedEntry.type !== "Noun") continue;

      const nounCGN = getCaseGenderNumber(nounWord.selectedMorphology);
      if (!nounCGN) continue;

      // Find matching morphology in the adjective
      for (const entry of adjWord.lookupResults) {
        if (entry.type !== "Adjective" && entry.type !== "Participle") continue;

        const matchingMorphs = entry.morphologies.filter((m) => {
          const adjCGN = getCaseGenderNumber(m.analysis);
          if (!adjCGN) return false;

          return (
            adjCGN.case === nounCGN.case &&
            adjCGN.number === nounCGN.number &&
            (adjCGN.gender === nounCGN.gender ||
              !adjCGN.gender ||
              !nounCGN.gender)
          );
        });

        if (matchingMorphs.length > 0) {
          // Guess this adjective's case based on the noun
          adjWord.selectedEntry = entry;
          adjWord.selectedMorphology = matchingMorphs[0].analysis;
          adjWord.guessed = true;
          adjWord.heuristic = `${entry.type} agreeing with noun "${nounWord.original}" (${nounCGN.case} ${nounCGN.number}${nounCGN.gender ? " " + nounCGN.gender : ""})`;

          // Create connection
          adjWord.annotations.push({
            type: "modify",
            targetIndex: nounIdx,
            guessed: true,
            heuristic: `Agreeing with "${nounWord.original}"`,
          });

          // Track that this adjective depends on the noun
          if (!nounWord.dependentWords) nounWord.dependentWords = new Set();
          nounWord.dependentWords.add(i);
          break;
        }
      }
    }
  }
};
