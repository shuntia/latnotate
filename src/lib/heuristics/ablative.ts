import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";

// Ablative of means/instrument - ablative without preposition near verb
export const applyAblativeMeansHeuristic = (words: SentenceWord[]): void => {
  // Helper to check if a word is inside an ablative preposition scope
  const isInAblativePrepPhrase = (wordIdx: number): boolean => {
    for (const w of words) {
      for (const ann of w.annotations) {
        if (ann.type === "preposition-scope") {
          if (ann.targetIndex !== undefined && ann.endIndex !== undefined) {
            if (wordIdx >= ann.targetIndex && wordIdx <= ann.endIndex) {
              // Check if the preposition is ablative
              const prepWord = w;
              if (prepWord.selectedMorphology?.includes("Ablative")) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };

  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;

    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn || cgn.case !== "Ablative") return;

    // Only nouns (instruments are typically nouns)
    if (word.selectedEntry.type !== "Noun") return;

    // If in ablative prep phrase, mark as ablative of means
    if (isInAblativePrepPhrase(idx)) {
      const heuristicId = `abl-means-prep-${idx}`;
      if (word.rejectedHeuristics?.has(heuristicId)) return;
      
      // Set heuristic description
      if (!word.heuristic) {
        word.heuristic = "Ablative of means (prepositional phrase)";
      }
      return;
    }

    // Check if there's a preposition immediately before
    if (idx > 0) {
      const prev = words[idx - 1];
      if (
        prev.selectedEntry?.type === "Other" &&
        prev.selectedMorphology?.includes("Preposition")
      ) {
        return; // Skip - this ablative is governed by preposition
      }
    }

    // Look for nearby verb (within 10 words)
    for (
      let i = Math.max(0, idx - 10);
      i < Math.min(words.length, idx + 10);
      i++
    ) {
      if (i === idx) continue;

      const verb = words[i];
      if (!verb.selectedEntry || !verb.selectedMorphology) continue;
      if (verb.selectedEntry.type !== "Verb") continue;

      // Skip infinitives
      if (verb.selectedMorphology.includes("Infinitive")) continue;

      // Reject if already rejected
      const heuristicId = `abl-means-${idx}-${i}`;
      if (word.rejectedHeuristics?.has(heuristicId)) continue;

      // Connect ablative to verb
      const existingConn = word.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === i,
      );

      if (!existingConn) {
        word.annotations.push({
          type: "modify",
          targetIndex: i,
          
          heuristic: `Ablative of means with "${verb.original}"`,
        });
      }

      break; // Connect to closest verb
    }
  });
};

// Ablative of agent - "ab/a" + ablative with passive verb
export const applyAblativeAgentHeuristic = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const prep = words[i];
    const noun = words[i + 1];

    // Check for "ab" or "a" preposition
    const prepClean = prep.clean.toLowerCase();
    if (prepClean !== "ab" && prepClean !== "a") continue;

    if (!prep.selectedEntry || !noun.selectedEntry || !noun.selectedMorphology)
      continue;

    // Check if followed by ablative
    const cgn = getCaseGenderNumber(noun.selectedMorphology);
    if (!cgn || cgn.case !== "Ablative") continue;

    // Look for passive verb nearby
    for (let j = Math.max(0, i - 10); j < Math.min(words.length, i + 15); j++) {
      const verb = words[j];

      if (!verb.selectedEntry || !verb.selectedMorphology) continue;
      if (verb.selectedEntry.type !== "Verb") continue;

      // Check if passive
      if (verb.selectedMorphology.includes("Passive")) {
        // Reject if already rejected
        const heuristicId = `abl-agent-${i + 1}-${j}`;
        if (noun.rejectedHeuristics?.has(heuristicId)) continue;

        // Connect ablative to passive verb
        const existingConn = noun.annotations.find(
          (a) => a.type === "modify" && a.targetIndex === j,
        );

        if (!existingConn) {
          noun.annotations.push({
            type: "modify",
            targetIndex: j,
            
            heuristic: `Agent of passive verb "${verb.original}" (ab + ablative)`,
          });
        }

        break;
      }
    }
  }
};

// Ablative absolute - ablative noun + ablative participle
export const applyAblativeAbsoluteHeuristic = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (!word2.selectedEntry || !word2.selectedMorphology) continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) continue;
    if (cgn1.case !== "Ablative" || cgn2.case !== "Ablative") continue;

    // One must be noun, other must be participle
    const word1IsNoun = word1.selectedEntry.type === "Noun";
    const word2IsPart = word2.selectedEntry.type === "Participle";

    if (!(word1IsNoun && word2IsPart)) continue;

    // Check gender/number agreement
    if (cgn1.gender !== cgn2.gender || cgn1.number !== cgn2.number) continue;

    // Reject if already rejected
    const heuristicId = `abl-abs-${i}-${i + 1}`;
    if (word2.rejectedHeuristics?.has(heuristicId)) continue;

    // Connect participle to noun
    const existingConn = word2.annotations.find(
      (a) => a.type === "modify" && a.targetIndex === i,
    );

    if (!existingConn) {
      word2.annotations.push({
        type: "modify",
        targetIndex: i,
        
        heuristic: `Ablative absolute: participle with "${word1.original}"`,
      });
    }
  }
};
