import { isAdjectival } from "@/lib/utils/word-helpers";
import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Connect participles to nouns they modify (by case/gender/number agreement)
export const applyParticipleModifierHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    if (word.selectedEntry.type !== "Participle") return;
    
    const partCgn = getCaseGenderNumber(word.selectedMorphology);
    if (!partCgn) return;
    
    // Reject if already rejected
    const heuristicId = `participle-modifier-${idx}`;
    if (word.rejectedHeuristics?.has(heuristicId)) return;
    
    // Look for nearby noun with matching case/gender/number (within ±3 words)
    for (let i = Math.max(0, idx - 3); i <= Math.min(words.length - 1, idx + 3); i++) {
      if (i === idx) continue;
      
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (candidate.selectedEntry.type !== "Noun") continue;
      
      const nounCgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (!nounCgn) continue;
      
      // Check agreement
      if (partCgn.case === nounCgn.case && 
          partCgn.gender === nounCgn.gender && 
          partCgn.number === nounCgn.number) {
        
        // Check if connection already exists
        const existingConn = word.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i
        );
        
        if (!existingConn) {
          word.annotations.push({
            type: "modify",
            targetIndex: i,
            guessed: true,
            heuristic: `Participle modifying "${candidate.original}" (${partCgn.case} ${partCgn.gender} ${partCgn.number})`,
          });
        }
        
        break; // Only connect to first match
      }
    }
  });
};
