import { SentenceWord } from "@/lib/types/sentence";

export const applyQueEtGuessing = (words: SentenceWord[]): void => {
  words.forEach((word) => {
    // Check if this heuristic was previously rejected
    if (word.rejectedHeuristics?.has("et-prefix")) return;

    // Check if ALL entries/definitions have -que tackon
    const allHaveQue = word.lookupResults?.every((entry) =>
      entry.modifications?.some(
        (m) => m.type === "Tackon" && m.form.toLowerCase() === "que",
      ),
    );

    if (
      allHaveQue &&
      word.lookupResults &&
      word.lookupResults.length > 0 &&
      !word.hasEtPrefix
    ) {
      word.hasEtPrefix = true;
      word.etGuessed = true;
    }
  });
};
