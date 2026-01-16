import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Common verbs that take dative indirect objects
const DATIVE_VERBS = new Set([
  "do",
  "dare",
  "dedi",
  "datum", // give
  "dico",
  "dicere",
  "dixi",
  "dictum", // say/tell
  "mitto",
  "mittere",
  "misi",
  "missum", // send
  "ostendo",
  "ostendere",
  "ostendi",
  "ostentum", // show
  "trado",
  "tradere",
  "tradidi",
  "traditum", // hand over
  "credo",
  "credere",
  "credidi",
  "creditum", // believe/trust
  "persuadeo",
  "persuadere",
  "persuasi",
  "persuasum", // persuade
  "impero",
  "imperare",
  "imperavi",
  "imperatum", // command
  "noceo",
  "nocere",
  "nocui",
  "nocitum", // harm
  "pareo",
  "parere",
  "parui",
  "paritum", // obey
  "placeo",
  "placere",
  "placui",
  "placitum", // please
  "servio",
  "servire",
  "servivi",
  "servitum", // serve
  "studeo",
  "studere",
  "studui", // be eager
  "faveo",
  "favere",
  "favi",
  "fautum", // favor
]);

export const applyDativeIndirectObjectHeuristic = (
  words: SentenceWord[],
): void => {
  // Find verbs that take dative
  words.forEach((verb, verbIdx) => {
    if (!verb.selectedEntry || !verb.selectedMorphology) return;
    if (verb.selectedEntry.type !== "Verb") return;

    // Check if it's a dative-taking verb
    const verbForms = verb.selectedEntry.forms.map((f) => f.toLowerCase());
    const isDativeVerb = verbForms.some((form) => DATIVE_VERBS.has(form));

    if (!isDativeVerb) return;

    // Look for dative nouns nearby (within 8 words)
    for (
      let i = Math.max(0, verbIdx - 8);
      i < Math.min(words.length, verbIdx + 8);
      i++
    ) {
      if (i === verbIdx) continue;

      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;

      const cgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (!cgn || cgn.case !== "Dative") continue;

      // Only connect nouns and pronouns (pronouns are "Other" type)
      const isPronoun =
        candidate.selectedEntry.type === "Other" &&
        candidate.selectedMorphology?.includes("Pronoun");
      if (candidate.selectedEntry.type !== "Noun" && !isPronoun) continue;

      // Reject if already rejected
      const heuristicId = `dative-io-${i}-${verbIdx}`;
      if (candidate.rejectedHeuristics?.has(heuristicId)) continue;

      // Check if connection already exists
      const existingConn = candidate.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === verbIdx,
      );

      if (!existingConn) {
        candidate.annotations.push({
          type: "modify",
          targetIndex: verbIdx,
          
          heuristic: `Indirect object of "${verb.original}" (dative case)`,
        });
      }
    }
  });
};
