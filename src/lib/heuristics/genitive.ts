import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";
import {
  cleanWord,
  getGuaranteedPOS,
  isGuaranteedPreposition,
  isPotentialPreposition,
  isConjunction,
} from "@/lib/utils/word-helpers";

export const applyGenitiveHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;

    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn || cgn.case !== "Genitive") return;

    // Only apply to genitive NOUNS, not adjectives
    if (word.selectedEntry.type !== "Noun") return;

    // Helper to check if word should BLOCK genitive traversal
    const shouldBlockTraversal = (w: SentenceWord): boolean => {
      const cleaned = cleanWord(w.original);

      // Block on punctuation and unknown tokens (sentence separators)
      if (
        !cleaned ||
        cleaned === "," ||
        cleaned === "." ||
        cleaned === ";" ||
        cleaned === "?" ||
        cleaned === ":"
      )
        return true;

      // Block on quotes (sentence separators)
      if (
        w.original === '"' ||
        w.original === "'" ||
        w.original === "«" ||
        w.original === "»"
      )
        return true;

      // Block on guaranteed prepositions (already selected)
      if (isGuaranteedPreposition(w)) return true;

      // Block on potential prepositions (could be a preposition)
      if (isPotentialPreposition(w)) return true;

      // Block on conjunctions
      if (isConjunction(w)) return true;

      // Block on forms of "qui" (relative pronoun)
      if (
        [
          "qui",
          "quae",
          "quod",
          "quem",
          "quam",
          "quo",
          "qua",
          "cuius",
          "cui",
          "quorum",
          "quarum",
          "quibus",
          "quos",
          "quas",
        ].includes(cleaned)
      ) {
        return true;
      }

      return false;
    };

    // Look backward for the first GUARANTEED noun (max 5 words)
    let foundTarget = false;
    for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
      const candidate = words[i];

      // Stop if we hit a blocking word (don't traverse across it)
      if (shouldBlockTraversal(candidate)) break;

      // Check if this word is a GUARANTEED noun (all entries are nouns)
      const guaranteedPOS = getGuaranteedPOS(candidate);
      if (guaranteedPOS !== "Noun") continue;

      // Check if this specific connection was previously rejected
      if (word.rejectedHeuristics?.has(`possession-${i}`)) continue;

      // This word is guaranteed to be a noun - connect to it
      const existingConn = word.annotations.find(
        (a) => a.type === "possession" && a.targetIndex === i,
      );

      if (!existingConn) {
        word.annotations.push({
          type: "possession",
          targetIndex: i,
          
          heuristic: `Genitive noun modifying guaranteed noun "${candidate.original}"`,
        });

        // Track that this genitive word depends on the target noun
        if (!candidate.dependentWords) candidate.dependentWords = new Set();
        candidate.dependentWords.add(idx);
      }
      foundTarget = true;
      return;
    }

    // If backward search failed, try forward (max 5 words)
    if (!foundTarget) {
      for (let i = idx + 1; i < Math.min(words.length, idx + 6); i++) {
        const candidate = words[i];

        // Stop if we hit a blocking word
        if (shouldBlockTraversal(candidate)) break;

        // Check if this word is a GUARANTEED noun
        const guaranteedPOS = getGuaranteedPOS(candidate);
        if (guaranteedPOS !== "Noun") continue;

        // Check if this specific connection was previously rejected
        if (word.rejectedHeuristics?.has(`possession-${i}`)) continue;

        const existingConn = word.annotations.find(
          (a) => a.type === "possession" && a.targetIndex === i,
        );

        if (!existingConn) {
          word.annotations.push({
            type: "possession",
            targetIndex: i,
            
            heuristic: `Genitive noun modifying following guaranteed noun "${candidate.original}"`,
          });

          // Track that this genitive word depends on the target noun
          if (!candidate.dependentWords) candidate.dependentWords = new Set();
          candidate.dependentWords.add(idx);
        }
        return;
      }
    }
  });
};
