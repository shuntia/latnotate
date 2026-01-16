import { isAdjectival } from "@/lib/utils/word-helpers";
import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

/**
 * If a participle can find a preceding agreeing noun, create a "brace" annotation
 * to visually group them together (similar to preposition brackets).
 */
export const applyParticipleBraceHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    
    // Check if this is a participle
    if (word.selectedEntry.type !== "Participle") return;
    
    const partCgn = getCaseGenderNumber(word.selectedMorphology);
    if (!partCgn) return;
    
    // Look backward for an agreeing noun (within 5 words)
    for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      
      // Check if it's a noun
      if (candidate.selectedEntry.type !== "Noun") continue;
      
      const nounCgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (!nounCgn) continue;
      
      // Check agreement
      if (partCgn.case === nounCgn.case &&
          partCgn.gender === nounCgn.gender &&
          partCgn.number === nounCgn.number) {
        
        // Reject if already rejected
        const heuristicId = `part-brace-${i}-${idx}`;
        if (word.rejectedHeuristics?.has(heuristicId)) continue;
        
        // Add a "brace" annotation (using preposition-scope type for visual consistency)
        // The brace goes FROM the noun TO the participle
        const existingBrace = candidate.annotations.find(
          (a) => a.type === "preposition-scope" && a.targetIndex === idx
        );
        
        if (!existingBrace) {
          candidate.annotations.push({
            type: "preposition-scope",
            targetIndex: idx,
            guessed: true,
            heuristic: `Participle "${word.original}" modifying noun "${candidate.original}"`,
          });
        }
        
        return; // Only create one brace per participle
      }
    }
  });
};
