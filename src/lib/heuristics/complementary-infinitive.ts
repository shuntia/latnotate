import { SentenceWord } from "@/lib/types/sentence";

// Verbs that commonly take complementary infinitives
const COMPLEMENTARY_INFINITIVE_VERBS = new Set([
  "possum",
  "posse",
  "potui", // can, be able
  "debeo",
  "debere",
  "debui", // ought, must
  "volo",
  "velle",
  "volui", // want, wish
  "nolo",
  "nolle",
  "nolui", // not want
  "malo",
  "malle",
  "malui", // prefer
  "soleo",
  "solere",
  "solitus", // be accustomed
  "audeo",
  "audere",
  "ausus", // dare
  "conor",
  "conari",
  "conatus", // try
  "cupio",
  "cupere",
  "cupivi", // desire
  "studeo",
  "studere",
  "studui", // be eager
  "incipio",
  "incipere",
  "incepi", // begin
  "coepi",
  "coepisse",
  "coeptus", // begin (defective)
  "desino",
  "desinere",
  "desii", // cease
  "pergo",
  "pergere",
  "perrexi", // continue
]);

export const applyComplementaryInfinitiveHeuristic = (
  words: SentenceWord[],
): void => {
  words.forEach((verb, verbIdx) => {
    if (!verb.selectedEntry || !verb.selectedMorphology) return;
    if (verb.selectedEntry.type !== "Verb") return;

    // Check if it's a verb that takes complementary infinitive
    const verbForms = verb.selectedEntry.forms.map((f) => f.toLowerCase());
    const takesInfinitive = verbForms.some((form) =>
      COMPLEMENTARY_INFINITIVE_VERBS.has(form),
    );

    if (!takesInfinitive) return;

    // Search for infinitive: look BEFORE the verb (more common in Latin)
    // Latin infinitives typically precede their governing verbs
    const searchIndices: number[] = [];
    
    // Add indices before verb (from closest to farthest)
    for (let i = verbIdx - 1; i >= Math.max(0, verbIdx - 5); i--) {
      searchIndices.push(i);
    }

    // Search in priority order
    for (const i of searchIndices) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (candidate.selectedEntry.type !== "Verb") continue;

      // Check if it's an infinitive
      if (!candidate.selectedMorphology.includes("Infinitive")) continue;

      // Reject if already rejected
      const heuristicId = `comp-inf-${i}-${verbIdx}`;
      if (candidate.rejectedHeuristics?.has(heuristicId)) continue;

      // Connect infinitive to main verb
      const existingConn = candidate.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === verbIdx,
      );

      if (!existingConn) {
        candidate.annotations.push({
          type: "modify",
          targetIndex: verbIdx,
          
          heuristic: `Complementary infinitive completing "${verb.original}"`,
        });
      }

      break; // Only connect to first infinitive found
    }
  });
};
