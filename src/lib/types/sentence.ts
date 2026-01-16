import { WordEntry, Morphology } from "@/lib/types";

export type { WordEntry, Morphology };

export type TagType =
  | "NOM"
  | "ACC"
  | "DAT"
  | "ABL"
  | "LOC"
  | "VOC"
  | "GEN"
  | "INF"
  | "ADV"
  | "CONJ"
  | "PREP"
  | "INTERJ"
  | "PRON"
  | "NUM";

export interface Annotation {
  type:
    | "modify"
    | "possession"
    | "preposition-scope"
    | "conjunction-scope"
    | "et-prefix";
  targetIndex?: number; // For modify/possession
  endIndex?: number; // For preposition scope
  guessed?: boolean; // Flag for heuristically guessed annotations
  heuristic?: string; // Explanation of the guess
}

export interface SentenceWord {
  id: string; // unique ID for stability
  original: string;
  clean: string;
  index: number;
  lookupResults?: WordEntry[];
  selectedEntry?: WordEntry;
  selectedMorphology?: string;
  annotations: Annotation[];
  guessed?: boolean; // Flag for heuristically guessed selections
  heuristic?: string; // Explanation of why this was guessed
  hasEtPrefix?: boolean; // Flag for -que words with "et" prepended
  etGuessed?: boolean; // Whether the "et" was automatically added
  hasAdjacentConnection?: boolean; // Flag for words with adjacent connection after them
  adjacentGuessed?: boolean; // Whether the adjacent connection was heuristically guessed
  rejectedHeuristics?: Set<string>; // Track rejected heuristics to avoid reapplying
  dependentWords?: Set<number>; // Indices of words whose heuristics depend on this word
  override?: {
    // Manual override of word type
    type: string; // e.g., "Noun", "Verb", "Adjective"
    morphology?: string; // e.g., "Genitive Singular", "Accusative Plural"
    manual: boolean;
  };
}

export interface ContextMenuState {
  x: number;
  y: number;
  wordIndex: number;
}

export interface GuessConfirmation {
  wordIndex: number;
  annotationIndex?: number;
  type: "et" | "adjacent" | "annotation" | "word" | "selection";
}
