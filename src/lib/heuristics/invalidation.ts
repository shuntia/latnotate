/**
 * Heuristic Invalidation System
 * 
 * This module handles undoing heuristics when user actions invalidate them.
 * For example, if a word was inferred as an adjective but the user manually
 * selects it as an adverb, we need to undo any adjective-related heuristics.
 */

import { SentenceWord } from "@/lib/types/sentence";

/**
 * Types of heuristics that can be invalidated
 */
export type HeuristicType =
  | "adjective-agreement"      // Word marked as agreeing adjective
  | "adjective-connection"      // Connection between adjective and noun
  | "nominative-subject"        // Word marked as nominative subject
  | "nominative-chunk"          // Nominative words grouped together
  | "genitive-possession"       // Genitive pointing to possessed noun
  | "preposition-object"        // Word marked as prepositional object
  | "preposition-bracket"       // Preposition scope bracketing
  | "adjacent-connection"       // Adjacent word connection
  | "participle-brace"          // Participle describing noun
  | "que-et"                    // -que → et prepending
  | "apposition"                // Words in apposition
  | "sum-form";                 // Form of sum

/**
 * Metadata about a heuristic applied to a word
 */
export interface HeuristicMetadata {
  type: HeuristicType;
  appliedTo: number[];          // Word indices this heuristic affects
  dependsOn: number[];          // Word indices this heuristic depends on
  annotationIndices?: number[]; // Which annotations were created
}

/**
 * Check what changed when a word is manually modified
 */
export function detectChanges(
  oldWord: SentenceWord,
  newWord: SentenceWord
): {
  partOfSpeechChanged: boolean;
  caseChanged: boolean;
  genderChanged: boolean;
  numberChanged: boolean;
  personChanged: boolean;
} {
  const oldMorph = oldWord.selectedMorphology || "";
  const newMorph = newWord.selectedMorphology || "";
  const oldType = oldWord.selectedEntry?.type || "";
  const newType = newWord.selectedEntry?.type || "";

  return {
    partOfSpeechChanged: oldType !== newType,
    caseChanged: !hasSameCase(oldMorph, newMorph),
    genderChanged: !hasSameGender(oldMorph, newMorph),
    numberChanged: !hasSameNumber(oldMorph, newMorph),
    personChanged: !hasSamePerson(oldMorph, newMorph),
  };
}

/**
 * Determine which heuristics should be invalidated based on changes
 */
export function getInvalidatedHeuristics(
  word: SentenceWord,
  wordIndex: number,
  changes: ReturnType<typeof detectChanges>
): HeuristicType[] {
  const invalidated: HeuristicType[] = [];

  // If part of speech changed, invalidate agreement-based heuristics
  if (changes.partOfSpeechChanged) {
    // Adjective → something else: invalidate adjective heuristics
    if (word.heuristic?.includes("adjective") || word.heuristic?.includes("agreement")) {
      invalidated.push("adjective-agreement", "adjective-connection");
    }
    // Participle treated as adjective
    if (word.heuristic?.includes("participle")) {
      invalidated.push("participle-brace");
    }
    // Nominative → something else: invalidate nominative heuristics
    if (word.heuristic?.includes("nominative") || word.heuristic?.includes("subject")) {
      invalidated.push("nominative-subject", "nominative-chunk");
    }
    // Preposition → something else
    if (word.heuristic?.includes("preposition")) {
      invalidated.push("preposition-bracket", "preposition-object");
    }
    // Sum form
    if (word.heuristic?.includes("sum")) {
      invalidated.push("sum-form");
    }
  }

  // If case changed, invalidate case-dependent heuristics
  if (changes.caseChanged) {
    // Nominative-related
    if (word.selectedMorphology?.includes("Nominative")) {
      invalidated.push("nominative-subject", "nominative-chunk");
    }
    // Genitive-related
    if (word.selectedMorphology?.includes("Genitive")) {
      invalidated.push("genitive-possession");
    }
    // Accusative/Ablative with prepositions
    if (word.selectedMorphology?.includes("Accusative") || word.selectedMorphology?.includes("Ablative")) {
      invalidated.push("preposition-object", "preposition-bracket");
    }
  }

  // If gender/number changed, invalidate agreement heuristics
  if (changes.genderChanged || changes.numberChanged) {
    invalidated.push("adjective-agreement", "adjective-connection", "apposition");
  }

  // If person changed (for verbs), invalidate subject finding
  if (changes.personChanged) {
    invalidated.push("nominative-subject");
  }

  return [...new Set(invalidated)]; // Remove duplicates
}

/**
 * Undo heuristics for a specific word
 */
export function undoHeuristicsForWord(
  words: SentenceWord[],
  wordIndex: number,
  heuristicsToUndo: HeuristicType[]
): SentenceWord[] {
  const newWords = [...words];
  const word = newWords[wordIndex];

  for (const heuristicType of heuristicsToUndo) {
    switch (heuristicType) {
      case "adjective-agreement":
      case "adjective-connection":
        // Remove adjective agreement selection
        if (word.heuristic?.includes("adjective") || word.heuristic?.includes("agreement")) {
          word.selectedEntry = undefined;
          word.selectedMorphology = undefined;
          word.heuristic = undefined;
        }
        // Remove connections to/from this word
        word.annotations = word.annotations.filter(ann => {
          if (ann.type === "modify" && ann.heuristic?.includes("adjective")) {
            return false;
          }
          return true;
        });
        // Remove connections FROM other words TO this word
        newWords.forEach((w, idx) => {
          if (idx !== wordIndex) {
            w.annotations = w.annotations.filter(ann => {
              if (ann.type === "modify" && ann.targetIndex === wordIndex && ann.heuristic?.includes("adjective")) {
                return false;
              }
              return true;
            });
          }
        });
        break;

      case "nominative-subject":
      case "nominative-chunk":
        // Remove nominative selection if it was guessed
        if (word.heuristic?.includes("nominative") || word.heuristic?.includes("subject")) {
          word.selectedEntry = undefined;
          word.selectedMorphology = undefined;
          word.heuristic = undefined;
        }
        break;

      case "genitive-possession":
        // Remove genitive possession arrows
        word.annotations = word.annotations.filter(ann => {
          if (ann.type === "possession") {
            return false;
          }
          return true;
        });
        break;

      case "preposition-object":
        // Remove preposition object selection
        if (word.heuristic?.includes("preposition") && word.heuristic?.includes("object")) {
          word.selectedEntry = undefined;
          word.selectedMorphology = undefined;
          word.heuristic = undefined;
        }
        break;

      case "preposition-bracket":
        // Remove preposition brackets that include this word
        newWords.forEach((w) => {
          w.annotations = w.annotations.filter(ann => {
            if (ann.type === "preposition-scope") {
              // Remove if wordIndex is the start, end, or anywhere in the range
              if (ann.targetIndex !== undefined && ann.endIndex !== undefined) {
                const inRange = wordIndex >= ann.targetIndex && wordIndex <= ann.endIndex;
                if (inRange || ann.targetIndex === wordIndex || ann.endIndex === wordIndex) {
                  return false;
                }
              }
            }
            return true;
          });
        });
        break;

      case "adjacent-connection":
        // Remove adjacent connection
        if (word.hasAdjacentConnection && word.adjacentGuessed) {
          word.hasAdjacentConnection = false;
          word.adjacentGuessed = false;
        }
        break;

      case "participle-brace":
        // Remove participle brace annotations
        word.annotations = word.annotations.filter(ann => {
          if (ann.heuristic?.includes("participle")) {
            return false;
          }
          return true;
        });
        break;

      case "que-et":
        // Remove "et" prefix
        if (word.hasEtPrefix && word.etGuessed) {
          word.hasEtPrefix = false;
          word.etGuessed = false;
        }
        break;

      case "apposition":
        // Remove apposition connections
        word.annotations = word.annotations.filter(ann => {
          if (ann.heuristic?.includes("apposition")) {
            return false;
          }
          return true;
        });
        break;

      case "sum-form":
        // Remove sum form selection
        if (word.heuristic?.includes("sum")) {
          word.selectedEntry = undefined;
          word.selectedMorphology = undefined;
          word.heuristic = undefined;
        }
        break;
    }
  }

  return newWords;
}

/**
 * Undo heuristics that depend on a specific word
 * This is called when a word is manually modified
 */
export function undoDependentHeuristics(
  words: SentenceWord[],
  changedWordIndex: number
): SentenceWord[] {
  const newWords = [...words];
  const changedWord = words[changedWordIndex];

  // Find all words that depend on the changed word
  if (changedWord.dependentWords) {
    for (const dependentIndex of changedWord.dependentWords) {
      const dependentWord = newWords[dependentIndex];
      
      // Remove heuristic selections and annotations
      if (dependentWord.heuristic) {
        dependentWord.selectedEntry = undefined;
        dependentWord.selectedMorphology = undefined;
        dependentWord.heuristic = undefined;
      }

      // Remove annotations that depend on the changed word
      dependentWord.annotations = dependentWord.annotations.filter(ann => {
        if (ann.targetIndex === changedWordIndex && ann.heuristic) {
          return false;
        }
        return true;
      });
    }
  }

  // Also remove annotations FROM the changed word if they were heuristic
  newWords[changedWordIndex].annotations = newWords[changedWordIndex].annotations.filter(ann => {
    return !ann.heuristic; // Keep only manual annotations
  });

  return newWords;
}

// Helper functions

function hasSameCase(morph1: string, morph2: string): boolean {
  const cases = ["Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative"];
  const case1 = cases.find(c => morph1.includes(c));
  const case2 = cases.find(c => morph2.includes(c));
  return case1 === case2;
}

function hasSameGender(morph1: string, morph2: string): boolean {
  const genders = ["Masculine", "Feminine", "Neuter"];
  const gender1 = genders.find(g => morph1.includes(g));
  const gender2 = genders.find(g => morph2.includes(g));
  return gender1 === gender2;
}

function hasSameNumber(morph1: string, morph2: string): boolean {
  return (
    (morph1.includes("Singular") && morph2.includes("Singular")) ||
    (morph1.includes("Plural") && morph2.includes("Plural"))
  );
}

function hasSamePerson(morph1: string, morph2: string): boolean {
  const persons = ["1st", "2nd", "3rd"];
  const person1 = persons.find(p => morph1.includes(p));
  const person2 = persons.find(p => morph2.includes(p));
  return person1 === person2;
}
