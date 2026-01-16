import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

export const applyAdjacentAgreementGuessing = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (!word2.selectedEntry || !word2.selectedMorphology) continue;

    // Check if this specific connection was previously rejected
    if (word1.rejectedHeuristics?.has(`adjacent-${i + 1}`)) continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) continue;

    // Check if case, gender, and number match
    if (
      cgn1.case === cgn2.case &&
      cgn1.number === cgn2.number &&
      (cgn1.gender === cgn2.gender || !cgn1.gender || !cgn2.gender)
    ) {
      // Create connection annotation
      const existingConn = word1.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === i + 1,
      );

      if (!existingConn) {
        word1.annotations.push({
          type: "modify",
          targetIndex: i + 1,
          guessed: true,
          heuristic: `Agreement: ${cgn1.case} ${cgn1.number}${cgn1.gender ? " " + cgn1.gender : ""}`,
        });
        
        // Mark word1 as having an adjacent connection
        word1.hasAdjacentConnection = true;
        word1.adjacentGuessed = true;
        
        // Track mutual dependency for adjacent connections
        if (!word1.dependentWords) word1.dependentWords = new Set();
        if (!word2.dependentWords) word2.dependentWords = new Set();
        word1.dependentWords.add(i + 1);
        word2.dependentWords.add(i);
      }
    }
  }
};
