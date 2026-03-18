import { Frequency } from "./types";

export const FREQUENCY_ORDER: Frequency[] = [
  "Very Frequent",
  "Frequent",
  "Common",
  "Lesser",
  "Uncommon",
  "Rare",
  "Inscription",
  "Graffiti",
  "Unknown Freq",
];

export const getFrequencyScore = (freq?: Frequency | string): number => {
  if (!freq) return 100; // Treat undefined as lowest priority
  const index = FREQUENCY_ORDER.indexOf(freq as Frequency);
  return index === -1 ? 99 : index;
};

export const getFrequencyColor = (freq?: Frequency | string): string => {
  switch (freq) {
    case "Very Frequent":
      return "bg-green-100 text-green-800 border-green-200";
    case "Frequent":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Common":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Lesser":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    case "Uncommon":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "Rare":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Inscription":
    case "Graffiti":
      return "bg-stone-100 text-stone-600 border-stone-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-100";
  }
};
