import { SentenceWord } from "@/lib/types/sentence";
import {
  getCaseGenderNumber,
  getVerbPersonNumber,
  isNominative,
  getGrammaticalNumber,
} from "@/lib/utils/morphology";
import {
  isConjunction,
  getSelectedPrepositionCases,
} from "@/lib/utils/word-helpers";
import { applyGenitiveHeuristic } from "./genitive";
import { applyAdjacentAgreementGuessing } from "./adjacent";
import { applyAdjectiveNounGuessing } from "./adjective";

export const applyIncrementalHeuristics = (
  words: SentenceWord[],
  changedIndex: number,
): void => {
  const changedWord = words[changedIndex];
  if (!changedWord.selectedEntry || !changedWord.selectedMorphology) return;

  // Expand range to include 5 words before and after (with bounds checking)
  const expandedStart = Math.max(0, changedIndex - 5);
  const expandedEnd = Math.min(words.length - 1, changedIndex + 5);

  // 1. If this word is a preposition, try to guess its object
  const isPrep =
    changedWord.selectedEntry.type === "Other" &&
    changedWord.selectedMorphology.includes("Preposition");

  if (isPrep) {
    const requiredCases = getSelectedPrepositionCases(changedWord);

    if (requiredCases) {
      // Look ahead for object
      for (
        let i = changedIndex + 1;
        i < Math.min(changedIndex + 4, words.length);
        i++
      ) {
        const candidate = words[i];
        if (candidate.selectedEntry) continue;

        const entries = candidate.lookupResults || [];
        for (const entry of entries) {
          const matchingMorphs = entry.morphologies.filter((m) =>
            requiredCases.some((reqCase) => m.analysis.includes(reqCase)),
          );

          if (matchingMorphs.length === 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = matchingMorphs[0].analysis;
            candidate.heuristic = `Object of "${changedWord.original}" (requires ${requiredCases.join(" or ")})`;

            // Create bracket for this prepositional phrase
            const cgn = getCaseGenderNumber(candidate.selectedMorphology);
            if (cgn) {
              let endIdx = i;
              // Find the end of the phrase
              for (let j = i + 1; j < words.length; j++) {
                const next = words[j];
                if (!next.selectedEntry || !next.selectedMorphology) break;
                const nextCgn = getCaseGenderNumber(next.selectedMorphology);
                if (!nextCgn) break;
                if (
                  nextCgn.case === cgn.case &&
                  nextCgn.number === cgn.number &&
                  (next.selectedEntry.type === "Adjective" ||
                    next.selectedEntry.type === "Participle" ||
                    next.selectedEntry.type === "Noun")
                ) {
                  endIdx = j;
                } else {
                  break;
                }
              }

              // Check for conjunction extension
              if (endIdx + 1 < words.length) {
                const nextAfterEnd = words[endIdx + 1];
                if (isConjunction(nextAfterEnd) && endIdx + 2 < words.length) {
                  const candidateAfterConj = words[endIdx + 2];
                  if (
                    candidateAfterConj.selectedEntry &&
                    candidateAfterConj.selectedMorphology
                  ) {
                    const cgnAfterConj = getCaseGenderNumber(
                      candidateAfterConj.selectedMorphology,
                    );
                    if (cgnAfterConj && cgnAfterConj.case === cgn.case) {
                      endIdx = endIdx + 2;
                      for (let k = endIdx + 1; k < words.length; k++) {
                        const followingWord = words[k];
                        if (
                          !followingWord.selectedEntry ||
                          !followingWord.selectedMorphology
                        )
                          break;
                        const followingCgn = getCaseGenderNumber(
                          followingWord.selectedMorphology,
                        );
                        if (!followingCgn) break;
                        if (
                          followingCgn.case === cgn.case &&
                          followingCgn.number === cgnAfterConj.number &&
                          (followingWord.selectedEntry.type === "Adjective" ||
                            followingWord.selectedEntry.type === "Participle" ||
                            followingWord.selectedEntry.type === "Noun")
                        ) {
                          endIdx = k;
                        } else {
                          break;
                        }
                      }
                    }
                  }
                }
              }

              const existingBracket = changedWord.annotations.find(
                (a) => a.type === "preposition-scope",
              );
              if (
                !existingBracket &&
                !changedWord.rejectedHeuristics?.has(
                  `preposition-scope-${endIdx}`,
                )
              ) {
                changedWord.annotations.push({
                  type: "preposition-scope",
                  endIndex: endIdx,
                  
                  heuristic: `Prepositional phrase: ${changedWord.original} + ${cgn.case} object`,
                });
              }
            }
            return;
          } else if (matchingMorphs.length > 1 && requiredCases.length === 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = matchingMorphs[0].analysis;
            candidate.heuristic = `Object of "${changedWord.original}" (requires ${requiredCases[0]})`;

            // Create bracket for this prepositional phrase
            const cgn = getCaseGenderNumber(candidate.selectedMorphology);
            if (cgn) {
              let endIdx = i;
              // Find the end of the phrase
              for (let j = i + 1; j < words.length; j++) {
                const next = words[j];
                if (!next.selectedEntry || !next.selectedMorphology) break;
                const nextCgn = getCaseGenderNumber(next.selectedMorphology);
                if (!nextCgn) break;
                if (
                  nextCgn.case === cgn.case &&
                  nextCgn.number === cgn.number &&
                  (next.selectedEntry.type === "Adjective" ||
                    next.selectedEntry.type === "Participle" ||
                    next.selectedEntry.type === "Noun")
                ) {
                  endIdx = j;
                } else {
                  break;
                }
              }

              // Check for conjunction extension
              if (endIdx + 1 < words.length) {
                const nextAfterEnd = words[endIdx + 1];
                if (isConjunction(nextAfterEnd) && endIdx + 2 < words.length) {
                  const candidateAfterConj = words[endIdx + 2];
                  if (
                    candidateAfterConj.selectedEntry &&
                    candidateAfterConj.selectedMorphology
                  ) {
                    const cgnAfterConj = getCaseGenderNumber(
                      candidateAfterConj.selectedMorphology,
                    );
                    if (cgnAfterConj && cgnAfterConj.case === cgn.case) {
                      endIdx = endIdx + 2;
                      for (let k = endIdx + 1; k < words.length; k++) {
                        const followingWord = words[k];
                        if (
                          !followingWord.selectedEntry ||
                          !followingWord.selectedMorphology
                        )
                          break;
                        const followingCgn = getCaseGenderNumber(
                          followingWord.selectedMorphology,
                        );
                        if (!followingCgn) break;
                        if (
                          followingCgn.case === cgn.case &&
                          followingCgn.number === cgnAfterConj.number &&
                          (followingWord.selectedEntry.type === "Adjective" ||
                            followingWord.selectedEntry.type === "Participle" ||
                            followingWord.selectedEntry.type === "Noun")
                        ) {
                          endIdx = k;
                        } else {
                          break;
                        }
                      }
                    }
                  }
                }
              }

              const existingBracket = changedWord.annotations.find(
                (a) => a.type === "preposition-scope",
              );
              if (
                !existingBracket &&
                !changedWord.rejectedHeuristics?.has(
                  `preposition-scope-${endIdx}`,
                )
              ) {
                changedWord.annotations.push({
                  type: "preposition-scope",
                  endIndex: endIdx,
                  
                  heuristic: `Prepositional phrase: ${changedWord.original} + ${cgn.case} object`,
                });
              }
            }
            return;
          }
        }
      }
    }
  }

  // 2. If this word has a case, try to guess preposition before it
  const cgn = getCaseGenderNumber(changedWord.selectedMorphology);
  if (
    cgn &&
    (cgn.case === "Accusative" || cgn.case === "Ablative") &&
    changedIndex > 0
  ) {
    const prevWord = words[changedIndex - 1];
    if (!prevWord.selectedEntry) {
      const entries = prevWord.lookupResults || [];

      for (const entry of entries) {
        if (entry.type !== "Other") continue;

        const prepMorphs = entry.morphologies.filter((m) =>
          m.analysis.includes("Preposition"),
        );

        if (prepMorphs.length === 0) continue;

        // Check if ANY of the preposition morphologies can take this case
        for (const morph of prepMorphs) {
          const accMatch = morph.analysis.match(/w\/(Accusative|ACC)/i);
          const ablMatch = morph.analysis.match(/w\/(Ablative|ABL)/i);

          const validCases: string[] = [];
          if (accMatch) validCases.push("Accusative");
          if (ablMatch) validCases.push("Ablative");

          if (validCases.includes(cgn.case)) {
            prevWord.selectedEntry = entry;
            prevWord.selectedMorphology = morph.analysis;
            prevWord.guessed = true;
            prevWord.heuristic = `Preposition before ${cgn.case} "${changedWord.original}"`;
            break;
          }
        }
      }
    }
  }

  // 3. If this word is a 3rd person verb, try to find nominative subject
  if (changedWord.selectedEntry.type === "Verb") {
    const verbInfo = getVerbPersonNumber(changedWord.selectedMorphology);
    if (verbInfo && verbInfo.person === 3) {
      // Look backwards for matching nominative
      for (let i = changedIndex - 1; i >= 0; i--) {
        const candidate = words[i];
        if (candidate.selectedEntry) continue;

        const entries = candidate.lookupResults || [];
        for (const entry of entries) {
          if (entry.type !== "Noun") continue;

          const nomMorphs = entry.morphologies.filter((m) => {
            const isNom = isNominative(m.analysis);
            const num = getGrammaticalNumber(m.analysis);
            return isNom && num === verbInfo.number;
          });

          if (nomMorphs.length === 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = nomMorphs[0].analysis;
            candidate.heuristic = `Subject of "${changedWord.original}" (${verbInfo.number === "S" ? "singular" : "plural"})`;
            return;
          } else if (nomMorphs.length > 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = nomMorphs[0].analysis;
            candidate.heuristic = `Subject of "${changedWord.original}" (${verbInfo.number === "S" ? "singular" : "plural"})`;
            return;
          }
        }
      }
    }
  }

  // 4. Check adjacent words for agreement
  const checkAdjacentAgreement = (idx1: number, idx2: number) => {
    if (idx2 < 0 || idx2 >= words.length) return;

    const word1 = words[idx1];
    const word2 = words[idx2];

    if (!word1.selectedEntry || !word1.selectedMorphology) return;
    if (!word2.selectedEntry || !word2.selectedMorphology) return;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) return;

    if (
      cgn1.case === cgn2.case &&
      cgn1.number === cgn2.number &&
      (cgn1.gender === cgn2.gender || !cgn1.gender || !cgn2.gender)
    ) {
      const existingConn = word1.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === idx2,
      );

      if (!existingConn) {
        word1.annotations.push({
          type: "modify",
          targetIndex: idx2,
          
          heuristic: `Agreement: ${cgn1.case} ${cgn1.number}${cgn1.gender ? " " + cgn1.gender : ""}`,
        });
      }
    }
  };

  // Check both neighbors
  checkAdjacentAgreement(changedIndex, changedIndex + 1);
  if (changedIndex > 0) {
    checkAdjacentAgreement(changedIndex - 1, changedIndex);
  }

  // 5. Apply relationship heuristics to expanded range (±5 words)
  const expandedSlice = words.slice(expandedStart, expandedEnd + 1);
  
  // Apply genitive heuristic
  applyGenitiveHeuristic(expandedSlice);
  
  // Apply adjacent agreement
  applyAdjacentAgreementGuessing(expandedSlice);
  
  // Apply adjective-noun guessing
  applyAdjectiveNounGuessing(expandedSlice);
  
  // Put the processed slice back into the main array
  for (let i = 0; i < expandedSlice.length; i++) {
    words[expandedStart + i] = expandedSlice[i];
  }
};

export const rerunDependentHeuristics = (
  words: SentenceWord[],
  changedIndex: number,
): void => {
  const changedWord = words[changedIndex];

  // Get all words that depend on this word
  const dependentIndices = changedWord.dependentWords;
  if (!dependentIndices || dependentIndices.size === 0) return;

  // For each dependent word, clear its guessed annotations and rerun its heuristics
  dependentIndices.forEach((depIdx) => {
    const depWord = words[depIdx];

    // Clear guessed annotations that point to or from the changed word
    depWord.annotations = depWord.annotations.filter((ann) => {
      if (!ann.guessed) return true; // Keep non-guessed annotations

      // Remove guessed annotations pointing to changed word
      if (ann.targetIndex === changedIndex) return false;
      if (ann.endIndex === changedIndex) return false;

      return true;
    });

    // Rerun specific heuristics for this dependent word based on what it needs
    const cgn =
      depWord.selectedEntry && depWord.selectedMorphology
        ? getCaseGenderNumber(depWord.selectedMorphology)
        : null;

    // If it's a genitive noun, rerun genitive heuristic
    if (
      cgn &&
      cgn.case === "Genitive" &&
      depWord.selectedEntry?.type === "Noun"
    ) {
      applyGenitiveHeuristic(words);
    }

    // If it could have agreement with changed word, rerun adjacent agreement
    if (Math.abs(depIdx - changedIndex) === 1) {
      applyAdjacentAgreementGuessing(words);
    }

    // If it's an adjective that might modify changed word, rerun adjective guessing
    if (depWord.selectedEntry?.type === "Adjective") {
      applyAdjectiveNounGuessing(words);
    }
  });
};
