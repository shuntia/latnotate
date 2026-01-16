import { SentenceWord } from "@/lib/types/sentence";

// Purpose conjunctions
const PURPOSE_CONJUNCTIONS = new Set([
  "ut", // in order to
  "ne", // in order not to
  "quo", // in order that (with comparative)
]);

export const applyPurposeClauseHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    
    const clean = word.clean.toLowerCase();
    if (!PURPOSE_CONJUNCTIONS.has(clean)) return;
    
    // Look for subjunctive verb after conjunction (within 8 words)
    for (let i = idx + 1; i < Math.min(words.length, idx + 8); i++) {
      const verb = words[i];
      
      if (!verb.selectedEntry || !verb.selectedMorphology) continue;
      if (verb.selectedEntry.type !== "Verb") continue;
      
      // Check if subjunctive
      if (verb.selectedMorphology.includes("Subjunctive")) {
        // Reject if already rejected
        const heuristicId = `purpose-${idx}-${i}`;
        if (word.rejectedHeuristics?.has(heuristicId)) continue;
        
        // Also find the main verb (before the conjunction)
        let mainVerbIdx = -1;
        for (let j = idx - 1; j >= Math.max(0, idx - 10); j--) {
          const mainVerb = words[j];
          if (!mainVerb.selectedEntry || !mainVerb.selectedMorphology) continue;
          if (mainVerb.selectedEntry.type !== "Verb") continue;
          if (!mainVerb.selectedMorphology.includes("Infinitive")) {
            mainVerbIdx = j;
            break;
          }
        }
        
        // Connect conjunction to subjunctive verb
        const existingConn1 = word.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i
        );
        
        if (!existingConn1) {
          word.annotations.push({
            type: "modify",
            targetIndex: i,
            guessed: true,
            heuristic: `Purpose conjunction "${word.original}" with subjunctive "${verb.original}"`,
          });
        }
        
        // Connect subjunctive to main verb if found
        if (mainVerbIdx !== -1) {
          const existingConn2 = verb.annotations.find(
            (a) => a.type === "modify" && a.targetIndex === mainVerbIdx
          );
          
          if (!existingConn2) {
            verb.annotations.push({
              type: "modify",
              targetIndex: mainVerbIdx,
              guessed: true,
              heuristic: `Purpose clause expressing goal of "${words[mainVerbIdx].original}"`,
            });
          }
        }
        
        break; // Only process first subjunctive
      }
    }
  });
};
