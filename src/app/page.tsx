"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WordEntry, LookupResult, Morphology } from "@/lib/types";

// --- Types & Constants ---

// Helper to clean punctuation
const cleanWord = (w: string) => w.replace(/[.,;?!:()"]/g, "").toLowerCase();

type TagType =
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

const TAG_CONFIG: Record<
  TagType,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  // Cases
  NOM: {
    label: "No",
    bgClass: "bg-red-200",
    textClass: "text-red-900",
    borderClass: "border-red-300",
  },
  ACC: {
    label: "Ac",
    bgClass: "bg-blue-200",
    textClass: "text-blue-900",
    borderClass: "border-blue-300",
  },
  DAT: {
    label: "Da",
    bgClass: "bg-green-200",
    textClass: "text-green-900",
    borderClass: "border-green-300",
  },
  ABL: {
    label: "Ab",
    bgClass: "bg-orange-200",
    textClass: "text-orange-900",
    borderClass: "border-orange-300",
  },
  LOC: {
    label: "Lo",
    bgClass: "bg-violet-200",
    textClass: "text-violet-900",
    borderClass: "border-violet-300",
  },
  VOC: {
    label: "Vo",
    bgClass: "bg-red-200",
    textClass: "text-red-900",
    borderClass: "border-red-300",
  },
  GEN: {
    label: "Ge",
    bgClass: "bg-indigo-200",
    textClass: "text-indigo-900",
    borderClass: "border-indigo-300",
  },
  // Other POS / Forms
  INF: {
    label: "Inf",
    bgClass: "bg-cyan-200",
    textClass: "text-cyan-900",
    borderClass: "border-cyan-300",
  },
  ADV: {
    label: "Adv",
    bgClass: "bg-yellow-200",
    textClass: "text-yellow-900",
    borderClass: "border-yellow-300",
  },
  CONJ: {
    label: "Conj",
    bgClass: "bg-pink-200",
    textClass: "text-pink-900",
    borderClass: "border-pink-300",
  },
  PREP: {
    label: "Prep",
    bgClass: "bg-amber-200",
    textClass: "text-amber-900",
    borderClass: "border-amber-300",
  },
  INTERJ: {
    label: "Int",
    bgClass: "bg-zinc-200",
    textClass: "text-zinc-900",
    borderClass: "border-zinc-300",
  },
  PRON: {
    label: "Pron",
    bgClass: "bg-lime-200",
    textClass: "text-lime-900",
    borderClass: "border-lime-300",
  }, // Fallback if no case
  NUM: {
    label: "Num",
    bgClass: "bg-emerald-200",
    textClass: "text-emerald-900",
    borderClass: "border-emerald-300",
  },
};

// Map POS to full names for hover
const POS_FULL_NAMES: Record<string, string> = {
  N: "Noun",
  V: "Verb",
  ADJ: "Adjective",
  ADV: "Adverb",
  PREP: "Preposition",
  CONJ: "Conjunction",
  INTERJ: "Interjection",
  PRON: "Pronoun",
  NUM: "Numeral",
};

interface Annotation {
  type: "modify" | "possession" | "preposition-scope";
  targetIndex?: number; // For modify/possession
  endIndex?: number; // For preposition scope
  guessed?: boolean; // Flag for heuristically guessed annotations
  heuristic?: string; // Explanation of the guess
}

interface SentenceWord {
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
  override?: { // Manual override of word type
    type: string;
    manual: boolean;
  };
}

interface ContextMenuState {
  x: number;
  y: number;
  wordIndex: number;
}

// --- Helpers ---

const getTagFromWord = (word: SentenceWord): TagType | null => {
  if (!word.selectedEntry) return null;
  const morph = word.selectedMorphology || "";
  const pos = word.selectedEntry.type;

  // 1. Case (Highest Priority for Nouns/Adjectives/Pronouns)
  if (morph.includes("Nominative")) return "NOM";
  if (morph.includes("Accusative")) return "ACC";
  if (morph.includes("Dative")) return "DAT";
  if (morph.includes("Ablative")) return "ABL";
  if (morph.includes("Locative")) return "LOC";
  if (morph.includes("Vocative")) return "VOC";
  if (morph.includes("Genitive")) return "GEN";

  // 2. Verb Forms
  if (morph.includes("Infinitive")) return "INF";

  // 3. Part of Speech (Fallback)
  const p = pos as string;
  if (p === "Adverb") return "ADV";
  if (p === "Conjunction") return "CONJ";
  if (p === "Preposition") return "PREP";
  if (p === "Interjection") return "INTERJ";
  if (p === "Pronoun") return "PRON";
  if (p === "Numeral") return "NUM";

  return null;
};

// Morphology sorting helpers
const getCaseOrder = (analysis: string): number => {
  if (analysis.includes("Nominative")) return 0;
  if (analysis.includes("Genitive")) return 1;
  if (analysis.includes("Dative")) return 2;
  if (analysis.includes("Accusative")) return 3;
  if (analysis.includes("Ablative")) return 4;
  if (analysis.includes("Vocative")) return 5;
  if (analysis.includes("Locative")) return 6;
  return 999; // No case found
};

const getNumberOrder = (analysis: string): number => {
  if (analysis.includes("Singular")) return 0;
  if (analysis.includes("Plural")) return 1;
  return 999;
};

const getVoiceOrder = (analysis: string): number => {
  if (analysis.includes("Active")) return 0;
  if (analysis.includes("Passive")) return 1;
  return 999;
};

const getMoodOrder = (analysis: string): number => {
  if (analysis.includes("Indicative")) return 0;
  if (analysis.includes("Subjunctive")) return 1;
  if (analysis.includes("Imperative")) return 2;
  if (analysis.includes("Infinitive")) return 3;
  return 999;
};

const getPersonOrder = (analysis: string): number => {
  if (analysis.includes("1st Person")) return 0;
  if (analysis.includes("2nd Person")) return 1;
  if (analysis.includes("3rd Person")) return 2;
  return 999;
};

const sortMorphologies = (morphologies: Morphology[], guessedAnalysis?: string) => {
  return morphologies.slice().sort((a, b) => {
    // Guessed morphology always comes first
    if (guessedAnalysis) {
      if (a.analysis === guessedAnalysis) return -1;
      if (b.analysis === guessedAnalysis) return 1;
    }

    // Sort by: Case → Number → Voice → Mood → Person
    const caseCompare = getCaseOrder(a.analysis) - getCaseOrder(b.analysis);
    if (caseCompare !== 0) return caseCompare;

    const numberCompare = getNumberOrder(a.analysis) - getNumberOrder(b.analysis);
    if (numberCompare !== 0) return numberCompare;

    const voiceCompare = getVoiceOrder(a.analysis) - getVoiceOrder(b.analysis);
    if (voiceCompare !== 0) return voiceCompare;

    const moodCompare = getMoodOrder(a.analysis) - getMoodOrder(b.analysis);
    if (moodCompare !== 0) return moodCompare;

    const personCompare = getPersonOrder(a.analysis) - getPersonOrder(b.analysis);
    return personCompare;
  });
};

// Helper: Extract person and number from verb morphology
const getVerbPersonNumber = (
  morph: string,
): { person: number; number: "S" | "P" } | null => {
  if (!morph.includes("Person")) return null;

  let person = 0;
  if (morph.includes("1st Person")) person = 1;
  else if (morph.includes("2nd Person")) person = 2;
  else if (morph.includes("3rd Person")) person = 3;

  let number: "S" | "P" | null = null;
  if (morph.includes("Singular")) number = "S";
  else if (morph.includes("Plural")) number = "P";

  if (person > 0 && number) return { person, number };
  return null;
};

// Helper: Check if morphology is nominative
const isNominative = (morph: string): boolean => {
  return morph.includes("Nominative");
};

// Helper: Extract grammatical number from morphology
const getGrammaticalNumber = (morph: string): "S" | "P" | null => {
  if (morph.includes("Singular")) return "S";
  if (morph.includes("Plural")) return "P";
  return null;
};

// Helper: Get case, gender, number from morphology
const getCaseGenderNumber = (
  morph: string,
): { case: string; gender: string; number: string } | null => {
  const caseMatch =
    morph.match(/Nominative|Accusative|Genitive|Dative|Ablative|Vocative|Locative/);
  const genderMatch = morph.match(/Masculine|Feminine|Neuter|Common/);
  const numberMatch = morph.match(/Singular|Plural/);

  if (!caseMatch || !numberMatch) return null;

  return {
    case: caseMatch[0],
    gender: genderMatch ? genderMatch[0] : "",
    number: numberMatch[0],
  };
};

// Apply nominative chunk guessing - complex rules for nominative phrases
const applyNominativeChunkGuessing = (words: SentenceWord[]): void => {
  // Find first verb to limit scope
  const firstVerbIdx = words.findIndex(
    (w) => w.selectedEntry?.type === "Verb" && w.selectedMorphology,
  );
  if (firstVerbIdx === -1) return;

  const verb = words[firstVerbIdx];
  const verbInfo = getVerbPersonNumber(verb.selectedMorphology!);
  if (!verbInfo || verbInfo.person !== 3) return;

  // Find contiguous chunk of potential nominatives before verb
  const chunk: { word: SentenceWord; idx: number; entry: WordEntry; morph: string }[] = [];

  for (let i = 0; i < firstVerbIdx; i++) {
    const word = words[i];
    if (word.selectedEntry) continue;

    const entries = word.lookupResults || [];
    for (const entry of entries) {
      const nomMorphs = entry.morphologies.filter((m) => {
        const isNom = isNominative(m.analysis);
        const num = getGrammaticalNumber(m.analysis);
        return isNom && num === verbInfo.number;
      });

      if (nomMorphs.length > 0) {
        chunk.push({ word, idx: i, entry, morph: nomMorphs[0].analysis });
        break;
      }
    }
  }

  if (chunk.length === 0) return;

  // Check if chunk is contiguous (all adjacent)
  const isContiguous = chunk.every((item, idx) => {
    if (idx === 0) return true;
    return item.idx === chunk[idx - 1].idx + 1;
  });

  if (!isContiguous) {
    // Only guess the first nominative if not contiguous
    const first = chunk[0];
    if (first.entry.type === "Noun") {
      first.word.selectedEntry = first.entry;
      first.word.selectedMorphology = first.morph;
      first.word.guessed = true;
      first.word.heuristic = `Subject of "${verb.original}" (${verbInfo.number === "S" ? "singular" : "plural"})`;
    }
    return;
  }

  // Contiguous nominatives - analyze composition
  const nouns = chunk.filter((c) => c.entry.type === "Noun");
  const adjectives = chunk.filter((c) => c.entry.type === "Adjective");

  if (nouns.length === 1 && chunk.length === nouns.length + adjectives.length) {
    // One noun + all adjectives = guess whole chunk
    chunk.forEach((item) => {
      item.word.selectedEntry = item.entry;
      item.word.selectedMorphology = item.morph;
      item.word.guessed = true;
      item.word.heuristic = `Part of subject phrase with "${nouns[0].word.original}"`;
    });
  } else if (nouns.length === 2) {
    // Two nouns - guess everything before first noun as adjectives
    const firstNounIdx = chunk.findIndex((c) => c.entry.type === "Noun");
    for (let i = 0; i < firstNounIdx; i++) {
      const item = chunk[i];
      if (item.entry.type === "Adjective") {
        item.word.selectedEntry = item.entry;
        item.word.selectedMorphology = item.morph;
        item.word.guessed = true;
        item.word.heuristic = `Adjective modifying "${chunk[firstNounIdx].word.original}"`;
      }
    }
    // Also guess the first noun
    const firstNoun = chunk[firstNounIdx];
    firstNoun.word.selectedEntry = firstNoun.entry;
    firstNoun.word.selectedMorphology = firstNoun.morph;
    firstNoun.word.guessed = true;
    firstNoun.word.heuristic = `Subject of "${verb.original}"`;
  } else if (nouns.length === 1) {
    // Just guess the noun
    const noun = nouns[0];
    noun.word.selectedEntry = noun.entry;
    noun.word.selectedMorphology = noun.morph;
    noun.word.guessed = true;
    noun.word.heuristic = `Subject of "${verb.original}"`;
  }
};

// Heuristically connect adjectives to adjacent nouns
const applyAdjectiveNounGuessing = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (!word2.selectedEntry || !word2.selectedMorphology) continue;

    // Check if one is adjective and other is noun
    const word1IsAdj = word1.selectedEntry.type === "Adjective" || word1.selectedEntry.type === "Participle";
    const word2IsAdj = word2.selectedEntry.type === "Adjective" || word2.selectedEntry.type === "Participle";
    const word1IsNoun = word1.selectedEntry.type === "Noun";
    const word2IsNoun = word2.selectedEntry.type === "Noun";

    // Skip if both are adjectives or both are nouns
    if ((word1IsAdj && word2IsAdj) || (word1IsNoun && word2IsNoun)) continue;
    if (!((word1IsAdj && word2IsNoun) || (word1IsNoun && word2IsAdj))) continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) continue;

    // Check if case, gender, and number match
    if (
      cgn1.case === cgn2.case &&
      cgn1.number === cgn2.number &&
      (cgn1.gender === cgn2.gender || !cgn1.gender || !cgn2.gender)
    ) {
      // Connect adjective to noun
      const fromIdx = word1IsAdj ? i : i + 1;
      const toIdx = word1IsAdj ? i + 1 : i;
      
      const existingConn = words[fromIdx].annotations.find(
        (a) => a.type === "modify" && a.targetIndex === toIdx,
      );

      if (!existingConn) {
        words[fromIdx].annotations.push({
          type: "modify",
          targetIndex: toIdx,
          guessed: true,
          heuristic: `Adjective modifying noun: ${cgn1.case} ${cgn1.number}${cgn1.gender ? " " + cgn1.gender : ""}`,
        });
      }
    }
  }
};

// Heuristically create prepositional brackets
const applyPrepositionalBracketGuessing = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry) return;
    const isPrep = word.selectedEntry.type === "Other" && 
                   word.selectedMorphology?.includes("Preposition");
    
    if (!isPrep) return;

    const prepForm = word.clean.toLowerCase();
    const requiredCases = PREP_CASE_MAP[prepForm];
    if (!requiredCases) return;

    // Look for the object (next matching case noun/adjective)
    for (let i = idx + 1; i < Math.min(idx + 5, words.length); i++) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;

      const cgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (!cgn) continue;

      // Check if this word matches the required case
      if (requiredCases.includes(cgn.case)) {
        // Find the end of the prepositional phrase (last matching adjective/noun in sequence)
        let endIdx = i;
        for (let j = i + 1; j < words.length; j++) {
          const next = words[j];
          if (!next.selectedEntry || !next.selectedMorphology) break;
          
          const nextCgn = getCaseGenderNumber(next.selectedMorphology);
          if (!nextCgn) break;
          
          // Continue if matches case (adjectives modifying the noun)
          if (nextCgn.case === cgn.case && nextCgn.number === cgn.number &&
              (next.selectedEntry.type === "Adjective" || next.selectedEntry.type === "Participle" || next.selectedEntry.type === "Noun")) {
            endIdx = j;
          } else {
            break;
          }
        }

        // Create bracket annotation if it doesn't exist
        const existingBracket = word.annotations.find(
          (a) => a.type === "preposition-scope"
        );

        if (!existingBracket) {
          word.annotations.push({
            type: "preposition-scope",
            endIndex: endIdx,
            guessed: true,
            heuristic: `Prepositional phrase: ${word.original} + ${cgn.case} object`,
          });
        }
        return;
      }
    }
  });
};

// Heuristically create prepositional brackets by looking backward from guessed case
const applyReversePrepositionalBracketGuessing = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    // Only apply if this word was heuristically guessed (not manually selected)
    if (!word.selectedEntry || !word.selectedMorphology || !word.guessed) return;

    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn) return;

    // Only care about accusative or ablative (common prepositional cases)
    if (cgn.case !== "Accusative" && cgn.case !== "Ablative") return;

    // Look backward through adjacent adjectives/nouns to find a preposition
    let prepIdx = -1;

    // Walk backward through matching case adjectives/nouns
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) break;

      const candidateCgn = getCaseGenderNumber(candidate.selectedMorphology);
      
      // Check if it's a preposition
      const isPrep = candidate.selectedEntry.type === "Other" && 
                     candidate.selectedMorphology.includes("Preposition");
      
      if (isPrep) {
        // Found a preposition! Check if it matches the case
        const prepForm = candidate.clean.toLowerCase();
        const requiredCases = PREP_CASE_MAP[prepForm];
        
        if (requiredCases && requiredCases.includes(cgn.case)) {
          prepIdx = i;
          break;
        }
      } else if (candidateCgn && candidateCgn.case === cgn.case && candidateCgn.number === cgn.number &&
                 (candidate.selectedEntry.type === "Adjective" || 
                  candidate.selectedEntry.type === "Participle" || 
                  candidate.selectedEntry.type === "Noun")) {
        // Continue backward through matching adjectives/nouns
        continue;
      } else {
        // Different case or non-matching type, stop
        break;
      }
    }

    // If we found a preposition, create the bracket
    if (prepIdx >= 0) {
      const prep = words[prepIdx];
      
      // Find the end of the phrase (last matching word)
      let endIdx = idx;
      for (let j = idx + 1; j < words.length; j++) {
        const next = words[j];
        if (!next.selectedEntry || !next.selectedMorphology) break;
        
        const nextCgn = getCaseGenderNumber(next.selectedMorphology);
        if (!nextCgn) break;
        
        // Continue if matches case
        if (nextCgn.case === cgn.case && nextCgn.number === cgn.number &&
            (next.selectedEntry.type === "Adjective" || 
             next.selectedEntry.type === "Participle" || 
             next.selectedEntry.type === "Noun")) {
          endIdx = j;
        } else {
          break;
        }
      }

      // Create bracket if it doesn't exist
      const existingBracket = prep.annotations.find(
        (a) => a.type === "preposition-scope"
      );

      if (!existingBracket) {
        prep.annotations.push({
          type: "preposition-scope",
          endIndex: endIdx,
          guessed: true,
          heuristic: `Prepositional phrase: ${prep.original} + ${cgn.case} object (detected from object)`,
        });
      }
    }
  });
};

// Apply case/gender/number agreement for adjacent words
const applyAdjacentAgreementGuessing = (words: SentenceWord[]): void => {
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    if (!word1.selectedEntry || !word1.selectedMorphology) continue;
    if (!word2.selectedEntry || !word2.selectedMorphology) continue;

    const cgn1 = getCaseGenderNumber(word1.selectedMorphology);
    const cgn2 = getCaseGenderNumber(word2.selectedMorphology);

    if (!cgn1 || !cgn2) continue;

    // Check if case, gender, and number match
    if (
      cgn1.case === cgn2.case &&
      cgn1.number === cgn2.number &&
      (cgn1.gender === cgn2.gender || !cgn1.gender || !cgn2.gender)
    ) {
      // Create connection annotation
      const existingConn = word1.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === i + 1,
      );

      if (!existingConn) {
        word1.annotations.push({
          type: "modify",
          targetIndex: i + 1,
          guessed: true,
          heuristic: `Agreement: ${cgn1.case} ${cgn1.number}${cgn1.gender ? " " + cgn1.gender : ""}`,
        });
      }
    }
  }
};

// Heuristically connect genitive words to nearest previous noun
const applyGenitiveHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    
    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn || cgn.case !== "Genitive") return;
    
    // Look backward for the first word that must be a noun
    // (has at least one noun entry in its results)
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = words[i];
      
      // Check if this word has any noun entries at all
      const hasNounEntry = candidate.lookupResults?.some(
        entry => entry.type === "Noun"
      );
      
      if (!hasNounEntry) continue;
      
      // This word can be a noun - connect to it
      const existingConn = word.annotations.find(
        (a) => a.type === "possession" && a.targetIndex === i
      );
      
      if (!existingConn) {
        word.annotations.push({
          type: "possession",
          targetIndex: i,
          guessed: true,
          heuristic: `Genitive modifying nearest possible noun "${candidate.original}"`,
        });
      }
      return; // Found nearest noun, stop
    }
  });
};

// Map common prepositions to their required cases
const PREP_CASE_MAP: Record<string, string[]> = {
  // Accusative prepositions
  ad: ["Accusative"],
  ante: ["Accusative"],
  apud: ["Accusative"],
  circa: ["Accusative"],
  circum: ["Accusative"],
  contra: ["Accusative"],
  erga: ["Accusative"],
  extra: ["Accusative"],
  infra: ["Accusative"],
  inter: ["Accusative"],
  intra: ["Accusative"],
  iuxta: ["Accusative"],
  ob: ["Accusative"],
  per: ["Accusative"],
  post: ["Accusative"],
  prope: ["Accusative"],
  propter: ["Accusative"],
  secundum: ["Accusative"],
  trans: ["Accusative"],
  ultra: ["Accusative"],
  versus: ["Accusative"],
  
  // Ablative prepositions
  a: ["Ablative"],
  ab: ["Ablative"],
  abs: ["Ablative"],
  absque: ["Ablative"],
  cum: ["Ablative"],
  de: ["Ablative"],
  e: ["Ablative"],
  ex: ["Ablative"],
  prae: ["Ablative"],
  pro: ["Ablative"],
  sine: ["Ablative"],
  
  // Mixed (context-dependent)
  in: ["Accusative", "Ablative"],
  sub: ["Accusative", "Ablative"],
  super: ["Accusative", "Ablative"],
  subter: ["Accusative", "Ablative"],
};

// Apply prepositional case guessing (both directions)
const applyPrepositionalGuessing = (words: SentenceWord[]): void => {
  // Forward pass: preposition already selected, guess object
  words.forEach((word, idx) => {
    if (!word.selectedEntry) return;
    const isPrep = word.selectedEntry.type === "Other" && 
                   word.selectedMorphology?.includes("Preposition");
    
    if (!isPrep) return;

    const prepForm = word.clean.toLowerCase();
    const requiredCases = PREP_CASE_MAP[prepForm];
    if (!requiredCases) return;

    // Look at next word(s) after the preposition
    for (let i = idx + 1; i < Math.min(idx + 4, words.length); i++) {
      const candidate = words[i];
      if (candidate.selectedEntry) continue;

      const entries = candidate.lookupResults || [];
      if (entries.length === 0) continue;

      for (const entry of entries) {
        const matchingMorphs = entry.morphologies.filter((m) =>
          requiredCases.some((reqCase) => m.analysis.includes(reqCase))
        );

        if (matchingMorphs.length === 1) {
          candidate.selectedEntry = entry;
          candidate.selectedMorphology = matchingMorphs[0].analysis;
          candidate.guessed = true;
          candidate.heuristic = `Object of "${word.original}" (requires ${requiredCases.join(" or ")})`;
          return;
        } else if (matchingMorphs.length > 1 && requiredCases.length === 1) {
          candidate.selectedEntry = entry;
          candidate.selectedMorphology = matchingMorphs[0].analysis;
          candidate.guessed = true;
          candidate.heuristic = `Object of "${word.original}" (requires ${requiredCases[0]})`;
          return;
        }
      }
    }
  });

  // Reverse pass: noun already selected, guess preposition before it
  words.forEach((word, idx) => {
    if (!word.selectedEntry || !word.selectedMorphology) return;
    if (idx === 0) return;

    const cgn = getCaseGenderNumber(word.selectedMorphology);
    if (!cgn || (cgn.case !== "Accusative" && cgn.case !== "Ablative")) return;

    // Look back for potential preposition
    const prevWord = words[idx - 1];
    if (prevWord.selectedEntry) return;

    const entries = prevWord.lookupResults || [];
    for (const entry of entries) {
      if (entry.type !== "Other") continue;
      
      const prepMorphs = entry.morphologies.filter((m) =>
        m.analysis.includes("Preposition")
      );

      if (prepMorphs.length === 0) continue;

      // Check if this preposition can take the case we have
      const prepForm = prevWord.clean.toLowerCase();
      const validCases = PREP_CASE_MAP[prepForm];
      
      if (validCases && validCases.includes(cgn.case)) {
        prevWord.selectedEntry = entry;
        prevWord.selectedMorphology = prepMorphs[0].analysis;
        prevWord.guessed = true;
        prevWord.heuristic = `Preposition before ${cgn.case} "${word.original}"`;
        return;
      }
    }
  });
};

// Heuristically add "et" before -que words
const applyQueEtGuessing = (words: SentenceWord[]): void => {
  words.forEach((word) => {
    if (!word.selectedEntry) return;
    
    // Check if word has -que tackon
    const hasTackon = word.selectedEntry.modifications?.some(
      (m) => m.type === "Tackon" && m.form.toLowerCase() === "que"
    );
    
    if (hasTackon && !word.hasEtPrefix) {
      word.hasEtPrefix = true;
      word.etGuessed = true;
    }
  });
};

// Incremental heuristics - apply only to specific word context
const applyIncrementalHeuristics = (words: SentenceWord[], changedIndex: number): void => {
  const changedWord = words[changedIndex];
  if (!changedWord.selectedEntry || !changedWord.selectedMorphology) return;

  // 1. If this word is a preposition, try to guess its object
  const isPrep = changedWord.selectedEntry.type === "Other" && 
                 changedWord.selectedMorphology.includes("Preposition");
  
  if (isPrep) {
    const prepForm = changedWord.clean.toLowerCase();
    const requiredCases = PREP_CASE_MAP[prepForm];
    
    if (requiredCases) {
      // Look ahead for object
      for (let i = changedIndex + 1; i < Math.min(changedIndex + 4, words.length); i++) {
        const candidate = words[i];
        if (candidate.selectedEntry) continue;

        const entries = candidate.lookupResults || [];
        for (const entry of entries) {
          const matchingMorphs = entry.morphologies.filter((m) =>
            requiredCases.some((reqCase) => m.analysis.includes(reqCase))
          );

          if (matchingMorphs.length === 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = matchingMorphs[0].analysis;
            candidate.guessed = true;
            candidate.heuristic = `Object of "${changedWord.original}" (requires ${requiredCases.join(" or ")})`;
            return;
          } else if (matchingMorphs.length > 1 && requiredCases.length === 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = matchingMorphs[0].analysis;
            candidate.guessed = true;
            candidate.heuristic = `Object of "${changedWord.original}" (requires ${requiredCases[0]})`;
            return;
          }
        }
      }
    }
  }

  // 2. If this word has a case, try to guess preposition before it
  const cgn = getCaseGenderNumber(changedWord.selectedMorphology);
  if (cgn && (cgn.case === "Accusative" || cgn.case === "Ablative") && changedIndex > 0) {
    const prevWord = words[changedIndex - 1];
    if (!prevWord.selectedEntry) {
      const entries = prevWord.lookupResults || [];
      
      for (const entry of entries) {
        if (entry.type !== "Other") continue;
        
        const prepMorphs = entry.morphologies.filter((m) =>
          m.analysis.includes("Preposition")
        );

        if (prepMorphs.length === 0) continue;

        const prepForm = prevWord.clean.toLowerCase();
        const validCases = PREP_CASE_MAP[prepForm];
        
        if (validCases && validCases.includes(cgn.case)) {
          prevWord.selectedEntry = entry;
          prevWord.selectedMorphology = prepMorphs[0].analysis;
          prevWord.guessed = true;
          prevWord.heuristic = `Preposition before ${cgn.case} "${changedWord.original}"`;
          break;
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
            candidate.guessed = true;
            candidate.heuristic = `Subject of "${changedWord.original}" (${verbInfo.number === "S" ? "singular" : "plural"})`;
            return;
          } else if (nomMorphs.length > 1) {
            candidate.selectedEntry = entry;
            candidate.selectedMorphology = nomMorphs[0].analysis;
            candidate.guessed = true;
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
        (a) => a.type === "modify" && a.targetIndex === idx2
      );

      if (!existingConn) {
        word1.annotations.push({
          type: "modify",
          targetIndex: idx2,
          guessed: true,
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
};

// --- Components ---

export default function Home() {
  const [input, setInput] = useState("");
  const [dictionaryResult, setDictionaryResult] = useState<LookupResult | null>(
    null,
  );
  const [analyzerWords, setAnalyzerWords] = useState<SentenceWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selection / Interaction State
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(
    null,
  ); // For Dialog
  const [activeTab, setActiveTab] = useState("analyzer");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [interactionMode, setInteractionMode] = useState<{
    type: "select-target" | "select-range";
    sourceIndex: number;
    annotationType: Annotation["type"];
  } | null>(null);
  const [guessConfirmation, setGuessConfirmation] = useState<{
    wordIndex: number;
    annotationIndex?: number;
    type: "word" | "annotation";
  } | null>(null);
  const [overrideDialogIndex, setOverrideDialogIndex] = useState<number | null>(null);
  const [overrideType, setOverrideType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Layout refs for SVG drawing
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<React.ReactNode[]>([]);
  const [maxLineDepth, setMaxLineDepth] = useState(0);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Update Lines/Annotations
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const newLines: React.ReactNode[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();
    let currentMaxDepth = 0;

    analyzerWords.forEach((word, i) => {
      word.annotations.forEach((ann, annIdx) => {
        if (ann.type === "preposition-scope") return; // Handled via text brackets now

        const sourceEl = wordRefs.current[i];
        if (!sourceEl) return;
        const sourceRect = sourceEl.getBoundingClientRect();

        // Coordinates relative to container
        // Start from BOTTOM center
        const sx = sourceRect.left - containerRect.left + sourceRect.width / 2;
        const sy = sourceRect.bottom - containerRect.top;

        if (ann.type === "modify" || ann.type === "possession") {
          if (ann.targetIndex === undefined) return;
          const targetEl = wordRefs.current[ann.targetIndex];
          if (!targetEl) return;
          const targetRect = targetEl.getBoundingClientRect();
          const tx =
            targetRect.left - containerRect.left + targetRect.width / 2;
          const ty = targetRect.bottom - containerRect.top;

          const color = ann.type === "possession" ? "#4f46e5" : "#6b7280"; // Indigo or Gray
          
          // Check if words are adjacent (next to each other)
          const isAdjacent = Math.abs(ann.targetIndex - i) === 1;

          // Check for multiline (Y difference > line height approx 20px)
          if (Math.abs(sy - ty) > 20) {
            // Multiline: "Cut off" style with curved corners
            // Draw small stub down/right from source
            // Draw small stub left/up from target
            const stubLength = 20;
            const stubDown = 10;
            const controlRadius = 5;
            
            const sourceStub = `
              M ${sx} ${sy}
              L ${sx} ${sy + stubDown - controlRadius}
              Q ${sx} ${sy + stubDown}, ${sx + (sx < tx ? controlRadius : -controlRadius)} ${sy + stubDown}
              L ${sx + (sx < tx ? stubLength : -stubLength)} ${sy + stubDown}
            `.trim().replace(/\s+/g, ' ');
            
            const targetStub = `
              M ${tx + (sx < tx ? -stubLength : stubLength)} ${ty + stubDown}
              L ${tx + (sx < tx ? -controlRadius : controlRadius)} ${ty + stubDown}
              Q ${tx} ${ty + stubDown}, ${tx} ${ty + stubDown - controlRadius}
              L ${tx} ${ty}
            `.trim().replace(/\s+/g, ' ');
            
            newLines.push(
              <g key={`${word.id}-${annIdx}-split`}>
                {/* Source Stub */}
                <path
                  d={sourceStub}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={ann.type === "possession" ? "url(#arrowhead)" : undefined}
                  strokeDasharray="4"
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : ""}
                  onClick={
                    ann.guessed
                      ? (e) => {
                          e.stopPropagation();
                          setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                        }
                      : undefined
                  }
                />
                {/* Target Stub */}
                <path
                  d={targetStub}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4"
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : ""}
                  onClick={
                    ann.guessed
                      ? (e) => {
                          e.stopPropagation();
                          setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                        }
                      : undefined
                  }
                />
                {/* Question mark for guessed annotations */}
                {ann.guessed && (
                  <g
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                    }}
                  >
                    <circle
                      cx={sx + (sx < tx ? stubLength : -stubLength)}
                      cy={sy + stubDown}
                      r="8"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <text
                      x={sx + (sx < tx ? stubLength : -stubLength)}
                      y={sy + stubDown}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#92400e"
                    >
                      ?
                    </text>
                  </g>
                )}
              </g>,
            );
          } else if (isAdjacent) {
            // Adjacent words: Direct horizontal inline connection
            // Use vertical middle of the word instead of bottom
            const sourceMiddleY = sourceRect.top - containerRect.top + sourceRect.height / 2;
            const targetMiddleY = targetRect.top - containerRect.top + targetRect.height / 2;
            
            // Connect from right edge of source to left edge of target (or vice versa)
            const sourceX = i < ann.targetIndex 
              ? sourceRect.right - containerRect.left 
              : sourceRect.left - containerRect.left;
            const targetX = i < ann.targetIndex
              ? targetRect.left - containerRect.left
              : targetRect.right - containerRect.left;
            
            const pathData = `M ${sourceX} ${sourceMiddleY} L ${targetX} ${targetMiddleY}`;
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceMiddleY + targetMiddleY) / 2;
            
            newLines.push(
              <g key={`${word.id}-${annIdx}`}>
                <path
                  d={pathData}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={
                    ann.type === "possession" ? "url(#arrowhead)" : undefined
                  }
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : ""}
                  onClick={
                    ann.guessed
                      ? (e) => {
                          e.stopPropagation();
                          setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                        }
                      : undefined
                  }
                />
                {ann.guessed && (
                  <g
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                    }}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r="8"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#92400e"
                    >
                      ?
                    </text>
                  </g>
                )}
              </g>,
            );
          } else {
            // Same line but not adjacent: Rounded Rectangle (Orthogonal)
            // Go down farther, across, then up
            const baseVerticalExtension = 20; // Reduced from 40 to bring closer
            const horizontalFactor = Math.abs(sx - tx) * 0.015; // Reduced factor
            const verticalExtension = baseVerticalExtension + horizontalFactor;
            const midY = Math.max(sy, ty) + verticalExtension;
            
            // Track maximum depth for dynamic padding
            const lineDepth = midY - Math.max(sy, ty);
            currentMaxDepth = Math.max(currentMaxDepth, lineDepth);

            // Use quadratic curves for rounded corners
            const controlRadius = 8;
            
            // Build path with quadratic bezier curves at corners
            // Start -> down -> curve -> horizontal -> curve -> up -> end
            const pathData = `
              M ${sx} ${sy}
              L ${sx} ${midY - controlRadius}
              Q ${sx} ${midY}, ${sx + (sx < tx ? controlRadius : -controlRadius)} ${midY}
              L ${tx + (sx < tx ? -controlRadius : controlRadius)} ${midY}
              Q ${tx} ${midY}, ${tx} ${midY - controlRadius}
              L ${tx} ${ty}
            `.trim().replace(/\s+/g, ' ');

            // Calculate midpoint for "?" marker
            const midX = (sx + tx) / 2;

            newLines.push(
              <g key={`${word.id}-${annIdx}`}>
                <path
                  d={pathData}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={
                    ann.type === "possession" ? "url(#arrowhead)" : undefined
                  }
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : ""}
                  onClick={
                    ann.guessed
                      ? (e) => {
                          e.stopPropagation();
                          setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                        }
                      : undefined
                  }
                />
                {ann.guessed && (
                  <g
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuessConfirmation({ wordIndex: i, annotationIndex: annIdx, type: "annotation" });
                    }}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r="10"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="12"
                      fontWeight="bold"
                      fill="#92400e"
                    >
                      ?
                    </text>
                  </g>
                )}
              </g>,
            );
          }
        }
      });
    });
    setLines(newLines);
    setMaxLineDepth(currentMaxDepth);
  }, [analyzerWords, interactionMode]); // Re-run when words or mode changes. Note: simplified dependencies for perf.

  const handleLookup = async (mode: "dictionary" | "analyzer") => {
    if (!input) return;

    setLoading(true);
    setError("");
    setDictionaryResult(null);
    if (mode === "analyzer") setAnalyzerWords([]);

    const rawTokens = input
      .split(/([\s.,;?!:()"]+)/)
      .filter((w) => w.trim().length > 0);
    const lookupWords = rawTokens
      .map((t) => cleanWord(t))
      .filter((w) => w.length > 0);
    const uniqueWords = Array.from(new Set(lookupWords));

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: uniqueWords }),
      });

      const data: LookupResult = await res.json();
      if (!res.ok)
        throw new Error(
          (data as { error?: string }).error || "Failed to lookup words",
        );

      if (mode === "dictionary") {
        setDictionaryResult(data);
      } else {
        const resultMap = new Map<string, WordEntry[]>();
        data.results.forEach((r) => resultMap.set(r.word, r.entries));

        const words: SentenceWord[] = rawTokens.map((token, idx) => {
          const clean = cleanWord(token);
          const entries = resultMap.get(clean) || [];

          // Auto-select logic
          let selectedEntry: WordEntry | undefined;
          let selectedMorphology: string | undefined;

          if (entries.length === 1) {
            const entry = entries[0];
            if (entry.morphologies.length === 0) {
              // Immutable / Generic
              selectedEntry = entry;
            } else if (entry.morphologies.length === 1) {
              // Single morphology
              selectedEntry = entry;
              selectedMorphology = entry.morphologies[0].analysis;
            }
          }

          return {
            id: `${idx}-${Date.now()}`,
            original: token,
            clean,
            index: idx,
            lookupResults: entries,
            selectedEntry,
            selectedMorphology,
            annotations: [],
          };
        });
        
        // Apply heuristic guessing in order of confidence
        setIsLoading(true);
        // Use setTimeout to allow UI to update with spinner
        setTimeout(() => {
          applyNominativeChunkGuessing(words);
          applyPrepositionalGuessing(words);
          applyAdjectiveNounGuessing(words);
          applyPrepositionalBracketGuessing(words);
          applyReversePrepositionalBracketGuessing(words);
          applyQueEtGuessing(words);
          applyGenitiveHeuristic(words);
          applyAdjacentAgreementGuessing(words);
          
          setAnalyzerWords(words);
          setIsLoading(false);
        }, 10);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const rerunAllHeuristics = () => {
    if (analyzerWords.length === 0) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const newWords = [...analyzerWords];
      
      // Clear all guessed annotations and selections
      newWords.forEach(word => {
        // Remove guessed annotations
        word.annotations = word.annotations.filter(ann => !ann.guessed);
        
        // Clear guessed word selections
        if (word.guessed) {
          word.selectedEntry = undefined;
          word.selectedMorphology = undefined;
          word.guessed = false;
          word.heuristic = undefined;
        }
        
        // Clear guessed et prefixes
        if (word.etGuessed) {
          word.hasEtPrefix = false;
          word.etGuessed = false;
        }
      });
      
      // Rerun all heuristics
      applyNominativeChunkGuessing(newWords);
      applyPrepositionalGuessing(newWords);
      applyAdjectiveNounGuessing(newWords);
      applyPrepositionalBracketGuessing(newWords);
      applyReversePrepositionalBracketGuessing(newWords);
      applyQueEtGuessing(newWords);
      applyGenitiveHeuristic(newWords);
      applyAdjacentAgreementGuessing(newWords);
      
      setAnalyzerWords(newWords);
      setIsLoading(false);
    }, 10);
  };

  const selectDefinition = (entry: WordEntry, morphology?: string) => {
    if (selectedWordIndex === null) return;
    const newWords = [...analyzerWords];
    newWords[selectedWordIndex] = {
      ...newWords[selectedWordIndex],
      selectedEntry: entry,
      selectedMorphology: morphology,
      guessed: false, // Clear guessed flag on manual selection
    };
    
    // Apply incremental heuristics for this word
    setIsLoading(true);
    setTimeout(() => {
      applyIncrementalHeuristics(newWords, selectedWordIndex);
      setAnalyzerWords(newWords);
      setIsLoading(false);
    }, 10);
    
    setSelectedWordIndex(null);
  };

  const handleRightClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, wordIndex: index });
  };

  const startAnnotation = (type: Annotation["type"]) => {
    if (!contextMenu) return;
    setInteractionMode({
      type: type === "preposition-scope" ? "select-range" : "select-target",
      sourceIndex: contextMenu.wordIndex,
      annotationType: type,
    });
    setContextMenu(null);
  };

  const handleWordInteraction = (index: number) => {
    if (interactionMode) {
      // Complete annotation
      const newWords = [...analyzerWords];
      const sourceWord = newWords[interactionMode.sourceIndex];

      // Remove existing annotation of same type if exists? No, support multiple.

      if (interactionMode.type === "select-target") {
        sourceWord.annotations.push({
          type: interactionMode.annotationType,
          targetIndex: index,
        });
      } else if (interactionMode.type === "select-range") {
        sourceWord.annotations.push({
          type: interactionMode.annotationType,
          endIndex: index,
        });
      }

      setAnalyzerWords(newWords);
      setInteractionMode(null);
    } else {
      // Normal Click - Open Dialog
      const word = analyzerWords[index];
      if (word && word.lookupResults && word.lookupResults.length > 0) {
        setSelectedWordIndex(index);
      }
    }
  };

  // Rendering Helper
  const getWordStyle = (word: SentenceWord) => {
    // Handle override styling
    if (word.override) {
      return "border-2 border-red-500 bg-red-50 text-red-900 font-semibold hover:bg-red-100 transition-colors relative";
    }
    
    if (!word.selectedEntry) {
      if (word.lookupResults && word.lookupResults.length > 0)
        return "border-b-2 border-gray-300 hover:bg-gray-100";
      return "border-transparent";
    }

    const classes = ["transition-colors", "relative"];
    const pos = word.selectedEntry.type;

    const tag = getTagFromWord(word);
    if (tag && TAG_CONFIG[tag]) {
      classes.push(TAG_CONFIG[tag].bgClass);
      classes.push(TAG_CONFIG[tag].textClass);
    } else {
      classes.push("bg-gray-200 text-gray-900");
    }

    // Verbs Underline
    if (pos === "Verb") {
      classes.push("underline decoration-2 underline-offset-4");
    }

    return classes.join(" ");
  };

  const getWordPadding = () => {
    // Always use consistent padding
    return "px-1";
  };

  const getWordMargin = (word: SentenceWord) => {
    const tag = getTagFromWord(word);
    const hasGuess = word.guessed;
    
    // Add right margin to accommodate badges that extend beyond the word
    // If both tag and guess: "?" is at -right-6 from word edge
    if (tag && hasGuess) {
      return "mr-7";  // Extra margin for the ? badge
    }
    // If only guess (no tag): "?" at -right-2
    else if (hasGuess) {
      return "mr-3";  // Less margin needed
    }
    // Normal - no extra margin needed, gap-x-3 handles it
    return "";
  };

  const renderBadge = (word: SentenceWord, wordIndex: number) => {
    // Override badge
    if (word.override) {
      return (
        <span
          className="absolute -top-3 -right-2 text-[10px] font-bold px-1 rounded bg-red-600 border border-red-700 text-white shadow-sm cursor-pointer hover:bg-red-700"
          title={`Override: ${word.override.type} - click to remove`}
          onClick={(e) => {
            e.stopPropagation();
            const newWords = [...analyzerWords];
            delete newWords[wordIndex].override;
            setAnalyzerWords(newWords);
          }}
        >
          {word.override.type.substring(0, 3).toUpperCase()}
        </span>
      );
    }
    
    const tag = getTagFromWord(word);
    const hasGuess = word.guessed;
    
    const handleGuessClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedWordIndex(wordIndex); // Open selection dialog instead
    };
    
    if (tag) {
      return (
        <>
          <span
            className={`absolute -top-3 -right-2 text-[10px] font-bold px-1 rounded bg-white border shadow-sm ${TAG_CONFIG[tag].textClass} ${TAG_CONFIG[tag].borderClass}`}
          >
            {TAG_CONFIG[tag].label}
          </span>
          {hasGuess && (
            <span
              className="absolute -top-3 -right-6 text-[10px] font-bold px-1 rounded bg-yellow-100 border border-yellow-400 text-yellow-800 shadow-sm cursor-pointer hover:bg-yellow-200"
              title="Heuristically guessed - click for details"
              onClick={handleGuessClick}
            >
              ?
            </span>
          )}
        </>
      );
    } else if (hasGuess) {
      return (
        <span
          className="absolute -top-3 -right-2 text-[10px] font-bold px-1 rounded bg-yellow-100 border border-yellow-400 text-yellow-800 shadow-sm cursor-pointer hover:bg-yellow-200"
          title="Heuristically guessed - click for details"
          onClick={handleGuessClick}
        >
          ?
        </span>
      );
    }
    return null;
  };

  // Highlight sub-parts (prefix/tackon)
  const renderWordText = (word: SentenceWord) => {
    if (!word.selectedEntry) return word.original;

    const mods = word.selectedEntry.modifications || [];
    const prefix = mods.find((m) => m.type === "Prefix");
    const tackon = mods.find((m) => m.type === "Tackon");

    if (!prefix && !tackon) return word.original;

    // Simple string matching strategy
    const text = word.original;
    let el: React.ReactNode = text;

    if (prefix && text.toLowerCase().startsWith(prefix.form)) {
      const len = prefix.form.length;
      el = (
        <>
          <span className="underline decoration-dotted decoration-gray-400">
            {text.slice(0, len)}
          </span>
          {text.slice(len)}
        </>
      );
    }

    // Need to handle both? complex. Just doing one for now or chaining.
    // Re-eval for Tackon
    if (tackon && text.toLowerCase().endsWith(tackon.form)) {
      // If we already split for prefix... this gets messy with JSX.
      // Simplification: Check endsWith on the original string.
      // If we have prefix split, we need to operate on the second part?
      // Let's assume non-overlapping for simplicity of this UI.
      const len = tackon.form.length;
      const start = text.length - len;
      if (!prefix) {
        el = (
          <>
            {text.slice(0, start)}
            <span className="underline decoration-dotted decoration-gray-400">
              {text.slice(start)}
            </span>
          </>
        );
      }
    }

    return el;
  };

  // Pre-calculate bracket positions with guess information
  const openBrackets = new Set<number>();
  const closeBrackets = new Map<number, { guessed: boolean; wordIndex: number; annotationIndex: number }>();
  analyzerWords.forEach((w, wordIdx) => {
    w.annotations.forEach((a, annIdx) => {
      if (a.type === "preposition-scope") {
        // Bracket starts BEFORE the preposition (index w.index)
        openBrackets.add(w.index);
        // Bracket ends AFTER the target (index a.endIndex)
        if (a.endIndex !== undefined) {
          closeBrackets.set(a.endIndex, { 
            guessed: a.guessed || false, 
            wordIndex: wordIdx,
            annotationIndex: annIdx 
          });
        }
      }
    });
  });

  const selectedWord =
    selectedWordIndex !== null ? analyzerWords[selectedWordIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Loading Spinner Overlay */}
      {(loading || isLoading) && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-700">
              {loading ? "Loading dictionary data..." : "Calculating heuristics..."}
            </p>
          </div>
        </div>
      )}
      
      {/* Interaction Mode Overlay */}
      {interactionMode && (
        <div className="fixed inset-0 bg-black/10 cursor-crosshair z-50 flex items-start justify-center pt-10 pointer-events-none">
          <div className="bg-white p-2 rounded shadow-lg pointer-events-auto">
            <p className="text-sm font-bold">
              Select{" "}
              {interactionMode.annotationType === "possession"
                ? "Possessor"
                : interactionMode.annotationType === "modify"
                  ? "Noun"
                  : "End of Scope"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setInteractionMode(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* SVG Definitions */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon points="0 0, 6 2, 0 4" fill="#4f46e5" />
          </marker>
        </defs>
      </svg>

      <div className="max-w-5xl w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-gray-900 tracking-tight">
            Latnotate
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Whitaker&apos;s Words Online
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analyzer">Sentence Analyzer</TabsTrigger>
            <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
            <TabsTrigger value="help">How to Use</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Textarea
                    placeholder={
                      activeTab === "dictionary"
                        ? "Enter words (one per line)..."
                        : "Enter a Latin sentence to analyze..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[120px] font-mono text-base"
                  />
                  <Button
                    onClick={() =>
                      handleLookup(activeTab as "dictionary" | "analyzer")
                    }
                    disabled={loading}
                    className="w-full"
                  >
                    {loading
                      ? "Processing..."
                      : activeTab === "dictionary"
                        ? "Lookup Words"
                        : "Analyze Sentence"}
                  </Button>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="analyzer">
            {analyzerWords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis</CardTitle>
                </CardHeader>
                <CardContent
                  className="relative min-h-[300px]"
                  ref={containerRef}
                >
                  {/* SVG Overlay */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    {lines}
                  </svg>

                  <div className={`flex flex-wrap gap-x-3 gap-y-10 text-xl leading-loose relative z-10 p-4 pt-6`} style={{ paddingBottom: `${Math.max(32, maxLineDepth + 20)}px` }}>
                    {analyzerWords.map((word, i) => {
                      const hasResults =
                        word.lookupResults && word.lookupResults.length > 0;

                      return (
                        <TooltipProvider key={word.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`flex items-center ${getWordMargin(word)}`}>
                                {/* "et" box for -que words */}
                                {word.hasEtPrefix && (
                                  <span className="inline-flex items-center mr-2 select-none">
                                    <span 
                                      className="text-sm px-2 py-0.5 rounded border-2 border-dashed border-gray-400 text-gray-700 bg-gray-50"
                                      style={{ fontStyle: 'italic' }}
                                    >
                                      et
                                    </span>
                                    {word.etGuessed && (
                                      <span
                                        className="text-[10px] font-bold px-1 ml-1 rounded bg-yellow-100 border border-yellow-400 text-yellow-800 shadow-sm cursor-pointer hover:bg-yellow-200"
                                        title="Heuristically added 'et' for -que - click to remove"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newWords = [...analyzerWords];
                                          newWords[i].hasEtPrefix = false;
                                          newWords[i].etGuessed = false;
                                          setAnalyzerWords(newWords);
                                        }}
                                      >
                                        ?
                                      </span>
                                    )}
                                  </span>
                                )}

                                {openBrackets.has(i) && (
                                  <span className="text-amber-600 font-bold text-2xl mr-1 select-none">
                                    [
                                  </span>
                                )}

                                <span
                                  ref={(el) => {
                                    wordRefs.current[i] = el;
                                  }}
                                  onClick={() =>
                                    (hasResults || interactionMode) &&
                                    handleWordInteraction(i)
                                  }
                                  onContextMenu={(e) =>
                                    hasResults && handleRightClick(e, i)
                                  }
                                  className={`
                                                                py-0.5 rounded cursor-pointer select-none inline-block
                                                                ${getWordStyle(word)}
                                                                ${interactionMode ? "hover:ring-2 ring-indigo-500" : ""}
                                                                ${getWordPadding()}
                                                            `}
                                >
                                  {renderWordText(word)}
                                  {renderBadge(word, i)}
                                </span>

                                {closeBrackets.has(i) && (() => {
                                  const bracketInfo = closeBrackets.get(i)!;
                                  return (
                                    <span className="inline-flex items-center ml-1 select-none">
                                      <span className="text-amber-600 font-bold text-2xl">]</span>
                                      {bracketInfo.guessed && (
                                        <span
                                          className="text-[10px] font-bold px-1 ml-0.5 rounded bg-yellow-100 border border-yellow-400 text-yellow-800 shadow-sm cursor-pointer hover:bg-yellow-200"
                                          title="Heuristically guessed bracket - click for details"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setGuessConfirmation({ 
                                              wordIndex: bracketInfo.wordIndex, 
                                              annotationIndex: bracketInfo.annotationIndex, 
                                              type: "annotation" 
                                            });
                                          }}
                                        >
                                          ?
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
                              </div>
                            </TooltipTrigger>
                            {word.override && !interactionMode && (
                              <TooltipContent>
                                <p className="font-bold text-red-600">Override</p>
                                <p className="text-xs opacity-80">{word.override.type}</p>
                                <p className="text-[10px] opacity-60 mt-1">Click badge to remove</p>
                              </TooltipContent>
                            )}
                            {word.selectedEntry && !interactionMode && !word.override && (
                              <TooltipContent>
                                <p className="font-bold">
                                  {POS_FULL_NAMES[word.selectedEntry.type] ||
                                    word.selectedEntry.type}
                                </p>
                                <p className="text-xs opacity-80">
                                  {word.selectedMorphology}
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <Button
                    onClick={rerunAllHeuristics}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : "Rerun All Heuristics"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Dictionary Tab Content */}
          <TabsContent value="dictionary">
            {dictionaryResult && dictionaryResult.results && (
              <div className="space-y-4">
                {dictionaryResult.results.flatMap((r) => r.entries).length ===
                0 ? (
                  <Alert>
                    <AlertDescription>No definitions found.</AlertDescription>
                  </Alert>
                ) : (
                  dictionaryResult.results.map((res, idx) => (
                    <div key={idx} className="space-y-4">
                      {dictionaryResult.results.length > 1 && (
                        <h3 className="font-bold text-lg border-b pb-1 mt-6">
                          {res.word}
                        </h3>
                      )}
                      {res.entries.map((entry: WordEntry, i: number) => (
                        <Card key={`${idx}-${i}`}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <CardTitle className="text-xl font-serif text-indigo-700">
                                  {entry.forms.join(", ")}
                                </CardTitle>
                                <Badge variant="outline" className="w-fit mt-1">
                                  {entry.type}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {entry.definition}
                            </p>
                            {entry.morphologies.map((m, mi) => (
                              <div
                                key={mi}
                                className="text-sm text-gray-500 mt-1 font-mono bg-gray-50 p-1 rounded"
                              >
                                {m.analysis} ({m.stem})
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>How to Use Latnotate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h3 className="font-semibold text-lg mb-3">Quick Start</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-2 text-sm">
                    <li>Type a Latin sentence in the text box</li>
                    <li>Click &quot;Analyze Sentence&quot;</li>
                    <li>Words appear color-coded with grammatical tags</li>
                    <li>Click yellow &quot;?&quot; marks to review automatic suggestions</li>
                    <li>Right-click words to create connections</li>
                  </ol>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Color Guide</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-200 border border-red-300 rounded"></span>
                      <span className="text-sm">Nominative (No)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-200 border border-blue-300 rounded"></span>
                      <span className="text-sm">Accusative (Ac)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-green-200 border border-green-300 rounded"></span>
                      <span className="text-sm">Dative (Da)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-orange-200 border border-orange-300 rounded"></span>
                      <span className="text-sm">Ablative (Ab)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 border border-indigo-300 rounded"></span>
                      <span className="text-sm">Genitive (Ge)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-yellow-200 border border-yellow-300 rounded"></span>
                      <span className="text-sm">Adverb (Adv)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-purple-200 border border-purple-300 rounded"></span>
                      <span className="text-sm">Vocative (Vo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-pink-200 border border-pink-300 rounded"></span>
                      <span className="text-sm">Locative (Lo)</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Yellow Question Marks (?)</h3>
                  <p className="mb-3 text-sm">The system makes intelligent suggestions marked with &quot;?&quot;</p>
                  <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                    <li><strong>On word badges</strong> - Word form was automatically guessed</li>
                    <li><strong>On lines</strong> - Connection was automatically suggested</li>
                    <li><strong>Click any &quot;?&quot;</strong> - See reasoning and confirm/reject</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Automatic Suggestions</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Subject-Verb:</strong> Selecting a 3rd person verb suggests matching nominative subject
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Prepositions:</strong> Selecting &quot;ad&quot; suggests accusative object; selecting &quot;cum&quot; suggests ablative
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Agreement:</strong> Adjacent words with matching case/gender/number auto-connect
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Nominative Chunks:</strong> Multiple adjacent nominatives (adjective + noun) are grouped together
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Creating Connections</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-2 text-sm">
                    <li>Right-click on a word</li>
                    <li>Choose connection type:
                      <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                        <li><strong>Connect to Word</strong> - General modification (gray line)</li>
                        <li><strong>Mark Owner</strong> - Genitive possession (indigo line with arrow)</li>
                        <li><strong>Mark Scope</strong> - Prepositional phrase (amber brackets)</li>
                      </ul>
                    </li>
                    <li>Click the target word</li>
                    <li>Adjacent words connect inline; distant words connect with curved lines</li>
                  </ol>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Tips & Tricks</h3>
                  <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                    <li>Start by selecting the main verb - this triggers subject guessing</li>
                    <li>Confirm obvious &quot;?&quot; marks to cascade more suggestions</li>
                    <li>Underlined words are verbs</li>
                    <li>Click any colored word to see all possible forms</li>
                    <li>Use Dictionary tab for simple word lookup</li>
                    <li>Right-click clears previous connections for that word</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Example Workflow</h3>
                  <div className="bg-blue-50 p-4 rounded text-sm space-y-2">
                    <p><strong>Sentence:</strong> &quot;Puella pulchram rosam amat&quot;</p>
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                      <li>Type sentence and click &quot;Analyze Sentence&quot;</li>
                      <li>Click &quot;amat&quot; → select &quot;Verb: 3rd Sg Pres Active Indicative&quot;</li>
                      <li>System suggests &quot;puella&quot; as nominative subject (yellow ?)</li>
                      <li>Click ? to confirm suggestion</li>
                      <li>Click &quot;rosam&quot; → select &quot;Noun: Acc Sg Fem&quot;</li>
                      <li>Right-click &quot;rosam&quot; → Connect to Word → click &quot;amat&quot;</li>
                      <li>Click &quot;pulchram&quot; → select &quot;Adj: Acc Sg Fem&quot;</li>
                      <li>System auto-connects &quot;pulchram&quot; to &quot;rosam&quot; (agreement)</li>
                    </ol>
                  </div>
                </section>

                <div className="pt-4 border-t text-xs text-gray-600">
                  <p><strong>Privacy:</strong> All processing happens locally in your browser. No data is stored or transmitted except to fetch word definitions from Whitaker&apos;s Words.</p>
                  <p className="mt-2"><strong>For more:</strong> See HOW_TO_USE.md in the GitHub repository for complete documentation.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Word Selection Dialog */}
        <Dialog
          open={selectedWordIndex !== null}
          onOpenChange={(open) => !open && setSelectedWordIndex(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-8">
                <span>
                  Select definition for &quot;{selectedWord?.original}&quot;
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Heuristic Reasoning Banner */}
            {selectedWord?.guessed && selectedWord?.heuristic && (
              <div className="bg-orange-50 p-3 rounded-md border border-orange-200 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold text-sm">🔍 Heuristic Guess:</span>
                  <span className="text-orange-900 text-sm flex-1">{selectedWord.heuristic}</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  Click a different morphology to change, or click the same one to confirm this guess.
                </p>
              </div>
            )}

            {/* Current Selection Status */}
            {selectedWord?.selectedEntry && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4 flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-900">Current:</span>
                  <span className="ml-2 text-blue-800">
                    {selectedWord.selectedEntry.forms[0]}
                  </span>
                  <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border text-gray-500">
                    {selectedWord.selectedMorphology || "Generic"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedWordIndex !== null) {
                      const newWords = [...analyzerWords];
                      newWords[selectedWordIndex] = {
                        ...newWords[selectedWordIndex],
                        selectedEntry: undefined,
                        selectedMorphology: undefined,
                        annotations: [],
                      };
                      setAnalyzerWords(newWords);
                      setSelectedWordIndex(null);
                    }
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>
            )}

            <div className="space-y-6 mt-2">
              {selectedWord?.lookupResults
                ?.slice() // Create a copy to avoid mutating original
                .sort((a, b) => {
                  // If this entry is the guessed one, put it first
                  const aIsGuessed = selectedWord.selectedEntry === a && selectedWord.guessed;
                  const bIsGuessed = selectedWord.selectedEntry === b && selectedWord.guessed;
                  
                  if (aIsGuessed && !bIsGuessed) return -1;
                  if (!aIsGuessed && bIsGuessed) return 1;
                  
                  // Otherwise maintain original order
                  return 0;
                })
                .map((entry, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 transition-colors ${selectedWord.selectedEntry === entry ? "ring-2 ring-indigo-500 bg-indigo-50/10" : "hover:bg-gray-50"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {entry.forms.join(", ")}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{entry.type}</Badge>
                        {selectedWord.selectedEntry === entry && selectedWord.guessed && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                            Heuristic Guess
                          </Badge>
                        )}
                        {entry.dictionaryCode && (
                          <span className="text-xs font-mono text-gray-400">
                            {entry.dictionaryCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 whitespace-pre-line">
                    {entry.definition}
                  </p>

                  {/* Modifications (Prefix/Tackon) */}
                  {entry.modifications && entry.modifications.length > 0 && (
                    <div className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">
                      {entry.modifications.map((m, idx) => (
                        <div key={idx}>
                          <span className="font-semibold">{m.type}:</span>{" "}
                          {m.form} - {m.definition}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-gray-100 rounded-md p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Select Morphology:
                    </p>
                    <div className="space-y-2">
                      {sortMorphologies(
                        entry.morphologies,
                        selectedWord.guessed && selectedWord.selectedEntry === entry 
                          ? selectedWord.selectedMorphology 
                          : undefined
                      ).map((morph, mi) => {
                        const isGuessed = selectedWord.guessed && 
                                         selectedWord.selectedMorphology === morph.analysis &&
                                         selectedWord.selectedEntry === entry;
                        const isSelected = selectedWord.selectedMorphology === morph.analysis &&
                                          selectedWord.selectedEntry === entry;
                        
                        return (
                          <button
                            key={mi}
                            className={`w-full text-left px-2 py-1 rounded border transition-all text-sm group flex justify-between items-center
                                                  ${
                                                    isSelected
                                                      ? isGuessed
                                                        ? "bg-orange-100 text-orange-900 border-orange-400 shadow-sm ring-2 ring-orange-300"
                                                        : "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                                                      : "bg-white hover:bg-gray-50 border-gray-200 hover:border-indigo-300 text-gray-800"
                                                  }
                                              `}
                            onClick={() =>
                              selectDefinition(entry, morph.analysis)
                            }
                          >
                            <span className="font-medium">{morph.analysis}</span>
                            <span
                              className={`font-mono text-xs ${
                                isSelected 
                                  ? isGuessed 
                                    ? "text-orange-700" 
                                    : "text-indigo-100" 
                                  : "text-gray-400"
                              }`}
                            >
                              {morph.stem}
                            </span>
                          </button>
                        );
                      })}
                      {entry.morphologies.length === 0 && (
                        <button
                          className="w-full text-left px-2 py-1 rounded bg-white hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 transition-all text-sm font-medium text-gray-800"
                          onClick={() => selectDefinition(entry)}
                        >
                          Generic / Immutable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Guess Confirmation Dialog (for annotations only) */}
        {guessConfirmation && guessConfirmation.type === "annotation" && (() => {
          const { wordIndex, annotationIndex } = guessConfirmation;
          const word = analyzerWords[wordIndex];
          
          const confirmGuess = () => {
            const newWords = [...analyzerWords];
            if (annotationIndex !== undefined) {
              newWords[wordIndex].annotations[annotationIndex].guessed = false;
            }
            setAnalyzerWords(newWords);
            setGuessConfirmation(null);
          };
          
          const revokeGuess = () => {
            const newWords = [...analyzerWords];
            if (annotationIndex !== undefined) {
              newWords[wordIndex].annotations.splice(annotationIndex, 1);
            }
            setAnalyzerWords(newWords);
            setGuessConfirmation(null);
          };
          
          return (
            <Dialog open={true} onOpenChange={() => setGuessConfirmation(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Heuristic Connection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {annotationIndex !== undefined && word.annotations[annotationIndex] && (
                    <>
                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <p className="text-sm text-orange-900">
                          <strong>From:</strong> {word.original}
                        </p>
                        {word.annotations[annotationIndex].heuristic && (
                          <p className="text-sm text-orange-800 mt-2">
                            <strong>Reasoning:</strong> {word.annotations[annotationIndex].heuristic}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">Is this connection correct?</p>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={confirmGuess} variant="default" className="flex-1">
                      Confirm
                    </Button>
                    <Button onClick={revokeGuess} variant="destructive" className="flex-1">
                      Remove
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Override Dialog */}
        {overrideDialogIndex !== null && (() => {
          const word = analyzerWords[overrideDialogIndex];
          
          return (
            <Dialog open={true} onOpenChange={() => {
              setOverrideDialogIndex(null);
              setOverrideType("");
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-600">Override Word Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm text-red-900">
                      <strong>Word:</strong> {word.original}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      This will override the morphological analysis
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Word Type</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="e.g., Noun, Verb, Adjective"
                      value={overrideType}
                      onChange={(e) => setOverrideType(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (overrideType.trim()) {
                          const newWords = [...analyzerWords];
                          // Create override entry
                          newWords[overrideDialogIndex].override = {
                            type: overrideType.trim(),
                            manual: true,
                          };
                          // Clear existing selections when overriding
                          newWords[overrideDialogIndex].selectedEntry = undefined;
                          newWords[overrideDialogIndex].selectedMorphology = undefined;
                          setAnalyzerWords(newWords);
                        }
                        setOverrideDialogIndex(null);
                        setOverrideType("");
                      }}
                      variant="destructive"
                      className="flex-1"
                      disabled={!overrideType.trim()}
                    >
                      Apply Override
                    </Button>
                    <Button
                      onClick={() => {
                        setOverrideDialogIndex(null);
                        setOverrideType("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Custom Context Menu */}
        {contextMenu &&
          (() => {
            const word = analyzerWords[contextMenu.wordIndex];
            const tag = getTagFromWord(word);
            // Basic checks based on TAG or fallback POS (some might not have tag if unrecognized)
            const isPrep = tag === "PREP" || word.selectedEntry?.type === "Other";
            const isGen = tag === "GEN";
            // Check if word has -que tackon
            const hasQueTackon = word.selectedEntry?.modifications?.some(
              (m) => m.type === "Tackon" && m.form.toLowerCase() === "que"
            );
            // Allow connect for most things, but typically adj/adv

            return (
              <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 min-w-[160px]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b text-xs font-semibold text-gray-500">
                  Annotate
                </div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => startAnnotation("modify")}
                >
                  <ArrowRight className="w-3 h-3" /> Connect to Word
                </button>
                {isGen && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => startAnnotation("possession")}
                  >
                    <ArrowRight className="w-3 h-3" /> Mark Owner (Genitive)
                  </button>
                )}
                {isPrep && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => startAnnotation("preposition-scope")}
                  >
                    <ArrowRight className="w-3 h-3" /> Mark Scope (Prep)
                  </button>
                )}
                {hasQueTackon && !word.hasEtPrefix && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                      const newWords = [...analyzerWords];
                      newWords[contextMenu.wordIndex].hasEtPrefix = true;
                      newWords[contextMenu.wordIndex].etGuessed = false; // Manual, not guessed
                      setAnalyzerWords(newWords);
                      setContextMenu(null);
                    }}
                  >
                    <span className="text-xs">+</span> Prepend &quot;et&quot;
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    setOverrideDialogIndex(contextMenu.wordIndex);
                    setContextMenu(null);
                  }}
                >
                  Override Word Type
                </button>
                <div className="border-t my-1"></div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    // Clear annotations for this word
                    const newWords = [...analyzerWords];
                    newWords[contextMenu.wordIndex].annotations = [];
                    setAnalyzerWords(newWords);
                    setContextMenu(null);
                  }}
                >
                  Clear Annotations
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
