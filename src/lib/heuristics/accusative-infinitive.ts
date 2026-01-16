import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Detect accusative + infinitive constructions
// Common verbs: dico (say), puto (think), credo (believe), video (see), audio (hear), etc.
const ACI_VERBS = new Set([
  "dico",
  "dicere",
  "dixi",
  "dictum",
  "puto",
  "putare",
  "putavi",
  "putatum",
  "credo",
  "credere",
  "credidi",
  "creditum",
  "video",
  "videre",
  "vidi",
  "visum",
  "audio",
  "audire",
  "audivi",
  "auditum",
  "scio",
  "scire",
  "scivi",
  "scitum",
  "nescio",
  "nescire",
  "nescivi",
  "nescitum",
  "sentio",
  "sentire",
  "sensi",
  "sensum",
  "intellego",
  "intellegere",
  "intellexi",
  "intellectum",
  "cognosco",
  "cognoscere",
  "cognovi",
  "cognitum",
  "spero",
  "sperare",
  "speravi",
  "speratum",
  "promitto",
  "promittere",
  "promisi",
  "promissum",
  "iubeo",
  "iubere",
  "iussi",
  "iussum",
  "veto",
  "vetare",
  "vetui",
  "vetitum",
  "sino",
  "sinere",
  "sivi",
  "situm",
]);

export const applyAccusativeInfinitiveHeuristic = (
  words: SentenceWord[],
): void => {
  // Find ACI verbs
  words.forEach((verb, verbIdx) => {
    if (!verb.selectedEntry || !verb.selectedMorphology) return;
    if (verb.selectedEntry.type !== "Verb") return;

    // Check if it's an ACI verb
    const verbForms = verb.selectedEntry.forms.map((f) => f.toLowerCase());
    const isACIVerb = verbForms.some((form) => ACI_VERBS.has(form));

    if (!isACIVerb) return;

    // Look for infinitive after the verb (within 10 words)
    for (let i = verbIdx + 1; i < Math.min(words.length, verbIdx + 10); i++) {
      const candidate = words[i];

      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (candidate.selectedEntry.type !== "Verb") continue;

      // Check if it's an infinitive
      if (!candidate.selectedMorphology.includes("Infinitive")) continue;

      // Found infinitive! Now look for accusative subject between verb and infinitive
      for (let j = verbIdx + 1; j < i; j++) {
        const accSubject = words[j];

        if (!accSubject.selectedEntry || !accSubject.selectedMorphology)
          continue;

        const cgn = getCaseGenderNumber(accSubject.selectedMorphology);
        if (!cgn || cgn.case !== "Accusative") continue;

        // Only nouns or pronouns (pronouns are "Other" type)
        const isPronoun =
          accSubject.selectedEntry.type === "Other" &&
          accSubject.selectedMorphology?.includes("Pronoun");
        if (accSubject.selectedEntry.type !== "Noun" && !isPronoun) continue;

        // Reject if already rejected
        const heuristicId = `aci-subject-${j}-${i}`;
        if (accSubject.rejectedHeuristics?.has(heuristicId)) continue;

        // Connect accusative to infinitive (as its subject)
        const existingConn = accSubject.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === i,
        );

        if (!existingConn) {
          accSubject.annotations.push({
            type: "modify",
            targetIndex: i,
            
            heuristic: `Subject of infinitive "${candidate.original}" in ACI construction`,
          });
        }
      }

      // Also connect infinitive to main verb
      const heuristicId = `aci-inf-${i}-${verbIdx}`;
      if (!candidate.rejectedHeuristics?.has(heuristicId)) {
        const existingConn = candidate.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === verbIdx,
        );

        if (!existingConn) {
          candidate.annotations.push({
            type: "modify",
            targetIndex: verbIdx,
            
            heuristic: `Infinitive in ACI construction with "${verb.original}"`,
          });
        }
      }

      break; // Only process first infinitive found
    }
  });
};
