import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Linking verbs (sum, fio) connect subject to predicate nominative
const LINKING_VERB_FORMS = new Set([
  "sum",
  "esse",
  "fui",
  "futurus",
  "fio",
  "fieri",
  "factus",
]);

export const applyLinkingVerbHeuristic = (words: SentenceWord[]): void => {
  words.forEach((verb, verbIdx) => {
    if (!verb.selectedEntry || !verb.selectedMorphology) return;
    if (verb.selectedEntry.type !== "Verb") return;

    // Check if it's a linking verb
    const verbForms = verb.selectedEntry.forms.map((f) => f.toLowerCase());
    const isLinkingVerb = verbForms.some((form) =>
      LINKING_VERB_FORMS.has(form),
    );

    if (!isLinkingVerb) return;

    // Find nominative subject (should be before or after verb)
    let subjectIdx = -1;
    let subjectCgn = null;

    for (
      let i = Math.max(0, verbIdx - 5);
      i < Math.min(words.length, verbIdx + 5);
      i++
    ) {
      if (i === verbIdx) continue;

      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;
      if (
        candidate.selectedEntry.type !== "Noun" &&
        candidate.selectedEntry.type !== "Adjective"
      )
        continue;

      const cgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (cgn && cgn.case === "Nominative") {
        subjectIdx = i;
        subjectCgn = cgn;
        break;
      }
    }

    if (subjectIdx === -1 || !subjectCgn) return;

    // Find predicate nominative (opposite side of verb from subject)
    const searchStart = subjectIdx < verbIdx ? verbIdx + 1 : 0;
    const searchEnd =
      subjectIdx < verbIdx ? Math.min(words.length, verbIdx + 5) : verbIdx;

    for (let i = searchStart; i < searchEnd; i++) {
      if (i === verbIdx || i === subjectIdx) continue;

      const predicate = words[i];
      if (!predicate.selectedEntry || !predicate.selectedMorphology) continue;

      const predCgn = getCaseGenderNumber(predicate.selectedMorphology);
      if (!predCgn || predCgn.case !== "Nominative") continue;

      // Check gender/number agreement
      if (
        predCgn.gender === subjectCgn.gender &&
        predCgn.number === subjectCgn.number
      ) {
        // Reject if already rejected
        const heuristicId = `predicate-nom-${i}-${subjectIdx}`;
        if (predicate.rejectedHeuristics?.has(heuristicId)) continue;

        // Connect predicate to subject
        const existingConn = predicate.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === subjectIdx,
        );

        if (!existingConn) {
          predicate.annotations.push({
            type: "modify",
            targetIndex: subjectIdx,
            
            heuristic: `Predicate nominative describing "${words[subjectIdx].original}" via linking verb "${verb.original}"`,
          });
        }

        break; // Only one predicate nominative
      }
    }
  });
};
