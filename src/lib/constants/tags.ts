import { TagType } from "@/lib/types/sentence";

export const TAG_CONFIG: Record<
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
  },
  NUM: {
    label: "Num",
    bgClass: "bg-emerald-200",
    textClass: "text-emerald-900",
    borderClass: "border-emerald-300",
  },
};

export const POS_FULL_NAMES: Record<string, string> = {
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
