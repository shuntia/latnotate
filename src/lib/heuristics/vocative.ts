import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Connect vocative nouns to verbs (person being addressed)
export const applyVocativeHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;

    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn || cgn.case !== "Vocative") return;

    // Only nouns are vocative
    if (word.selectedEntry.type !== "Noun") return;

    // Reject if already rejected
    const heuristicId = `vocative-${idx}`;
    if (word.rejectedHeuristics?.has(heuristicId)) return;

    // Look for nearest verb (imperative preferred, then any finite verb)
    let bestVerbIdx = -1;
    let bestDistance = Infinity;
    let isImperative = false;

    for (let i = 0; i < words.length; i++) {
      if (i === idx) continue;

      const verb = words[i];
      if (!verb.selectedEntry || !verb.selectedMorphology) continue;
      if (verb.selectedEntry.type !== "Verb") continue;

      // Skip infinitives
      if (verb.selectedMorphology.includes("Infinitive")) continue;

      const distance = Math.abs(i - idx);
      const verbIsImperative = verb.selectedMorphology.includes("Imperative");

      // Prefer imperatives, then closest verb
      if (verbIsImperative && !isImperative) {
        bestVerbIdx = i;
        bestDistance = distance;
        isImperative = true;
      } else if (verbIsImperative === isImperative && distance < bestDistance) {
        bestVerbIdx = i;
        bestDistance = distance;
      }
    }

    if (bestVerbIdx === -1) return;

    // Connect vocative to verb
    const existingConn = word.annotations.find(
      (a) => a.type === "modify" && a.targetIndex === bestVerbIdx,
    );

    if (!existingConn) {
      word.annotations.push({
        type: "modify",
        targetIndex: bestVerbIdx,
        
        heuristic: `Vocative address to "${words[bestVerbIdx].original}"${isImperative ? " (imperative)" : ""}`,
      });
    }
  });
};
