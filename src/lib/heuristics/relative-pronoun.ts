import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Relative pronouns: qui, quae, quod, cuius, cui, quem, quam, quo, qua, etc.
const RELATIVE_PRONOUN_FORMS = new Set([
  "qui", "quae", "quod", "cuius", "cui", "quem", "quam", "quo", "qua",
  "quos", "quas", "quibus", "quorum", "quarum"
]);

export const applyRelativePronounHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    
    // Check if this is a relative pronoun
    const clean = word.clean.toLowerCase();
    if (!RELATIVE_PRONOUN_FORMS.has(clean)) return;
    
    // Pronouns are in "Other" category - check morphology
    if (word.selectedEntry.type !== "Other") return;
    if (!word.selectedMorphology?.includes("Pronoun")) return;
    
    const pronounCGN = getCaseGenderNumber(word.selectedMorphology);
    if (!pronounCGN) return;
    
    // Reject heuristic if already rejected
    const heuristicId = `relative-pronoun-${idx}`;
    if (word.rejectedHeuristics?.has(heuristicId)) return;
    
    // Look for antecedent (noun with matching gender/number) before the pronoun
    // Search backwards, prioritizing closest nouns
    for (let i = idx - 1; i >= Math.max(0, idx - 10); i--) {
      const candidate = words[i];
      
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (candidate.selectedEntry.type !== "Noun") continue;
      
      const candidateCGN = getCaseGenderNumber(candidate.selectedMorphology);
      if (!candidateCGN) continue;
      
      // Match gender and number (case can differ!)
      if (candidateCGN.gender === pronounCGN.gender && 
          candidateCGN.number === pronounCGN.number) {
        
        // Check if connection already exists
        const existingConn = word.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i
        );
        
        if (!existingConn) {
          word.annotations.push({
            type: "modify",
            targetIndex: i,
            guessed: true,
            heuristic: `Relative pronoun referring to "${candidate.original}" (${pronounCGN.gender} ${pronounCGN.number})`,
          });
        }
        
        break; // Only connect to first (closest) match
      }
    }
  });
};
