import { SentenceWord } from "@/lib/types/sentence";

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
          (a) => a.type === "modify" && a.targetIndex === i,
        );

        if (!existingConn) {
          word.annotations.push({
            type: "modify",
            targetIndex: i,
            
            heuristic: `Comparison with "${candidate.original}" (comparative)`,
          });
        }

        break;
      }
    }
  });
};
