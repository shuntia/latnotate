import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Temporal/circumstantial conjunctions
const TEMPORAL_CONJUNCTIONS = new Set([
  "dum", // while, until
  "cum", // when, since, although
  "quando", // when
  "ubi", // when, where
  "postquam", "posteaquam", // after
  "antequam", "priusquam", // before
  "donec", // until
  "simul", "simulac", "simulatque", // as soon as
]);

export const applyTemporalClauseHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    
    const clean = word.clean.toLowerCase();
    if (!TEMPORAL_CONJUNCTIONS.has(clean)) return;
    
    // Look for verb after the conjunction (within 8 words)
    for (let i = idx + 1; i < Math.min(words.length, idx + 8); i++) {
      const candidate = words[i];
      
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (candidate.selectedEntry.type !== "Verb") continue;
      
      // Don't connect to infinitives
      if (candidate.selectedMorphology.includes("Infinitive")) continue;
      
      // Reject if already rejected
      const heuristicId = `temporal-${idx}-${i}`;
      if (word.rejectedHeuristics?.has(heuristicId)) continue;
      
      // Connect conjunction to verb
      const existingConn = word.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === i
      );
      
      if (!existingConn) {
        word.annotations.push({
          type: "modify",
          targetIndex: i,
          guessed: true,
          heuristic: `Temporal conjunction "${word.original}" with verb "${candidate.original}"`,
        });
      }
      
      break; // Only connect to first verb
    }
  });
};

// Comparative constructions with "quam"
export const applyComparativeHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    const clean = word.clean.toLowerCase();
    if (clean !== "quam") return;
    
    // Look backwards for comparative adjective/adverb
    for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
      const candidate = words[i];
      
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      
      // Check for comparative
      if (candidate.selectedMorphology.includes("Comparative")) {
        // Reject if already rejected
        const heuristicId = `comparative-quam-${idx}-${i}`;
        if (word.rejectedHeuristics?.has(heuristicId)) continue;
        
        // Connect quam to comparative
        const existingConn = word.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i
        );
        
        if (!existingConn) {
          word.annotations.push({
            type: "modify",
            targetIndex: i,
            guessed: true,
            heuristic: `Comparison with "${candidate.original}" (comparative)`,
          });
        }
        
        break;
      }
    }
  });
};
