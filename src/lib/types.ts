export type Age =
  | "Any Age"
  | "Archaic"
  | "Early"
  | "Classical"
  | "Late"
  | "Later"
  | "Medieval"
  | "Scholar"
  | "Modern";
export type Area =
  | "Any Area"
  | "Agriculture"
  | "Biological"
  | "Drama/Arts"
  | "Ecclesiastic"
  | "Grammar"
  | "Legal"
  | "Poetic"
  | "Science"
  | "Technical"
  | "Military"
  | "Mythology";
export type Geo =
  | "Any Geo"
  | "Africa"
  | "Britain"
  | "China"
  | "Scandinavia"
  | "Egypt"
  | "France/Gaul"
  | "Germany"
  | "Greece"
  | "Italy/Rome"
  | "India"
  | "Balkans"
  | "Netherlands"
  | "Persia"
  | "Near East"
  | "Russia"
  | "Spain/Iberia"
  | "Eastern Europe";
export type Frequency =
  | "Unknown Freq"
  | "Very Frequent"
  | "Frequent"
  | "Common"
  | "Lesser"
  | "Uncommon"
  | "Rare"
  | "Inscription"
  | "Graffiti";
export type Source =
  | "General"
  | ""
  | "Bee"
  | "Cas"
  | "Sex"
  | "Ecc"
  | "DeF"
  | "G+L"
  | "Collatinus"
  | "Leverett"
  | "Bracton"
  | "Cal"
  | "Lewis"
  | "Latham"
  | "Nel"
  | "OLD"
  | "Souter"
  | "Other"
  | "Plater"
  | "L+S"
  | "Translation"
  | "Saxo"
  | "Whitaker"
  | "Temp"
  | "User";

export type PartOfSpeech =
  | "N"
  | "V"
  | "ADJ"
  | "ADV"
  | "VPAR"
  | "NUM"
  | "PRON"
  | "PREP"
  | "CONJ"
  | "INTERJ"
  | "Unknown";

export interface Morphology {
  line: string;
  stem: string;
  pos: string;
  analysis: string;
}

export interface Modification {
  type: "Tackon" | "Prefix" | "Suffix";
  form: string;
  definition: string;
}

export interface BaseWordEntry {
  dictLine: string;
  forms: string[];
  morphologies: Morphology[];
  definition: string;
  dictionaryCode: string;
  age?: Age | string;
  area?: Area | string;
  geo?: Geo | string;
  frequency?: Frequency | string;
  source?: Source | string;
  modifications?: Modification[];
}

// Discriminated Union for Word Types
export interface NounEntry extends BaseWordEntry {
  type: "Noun";
  declension?: string; // e.g., "1st", "3rd"
  gender?: string; // e.g., "M", "F", "N"
}

export interface VerbEntry extends BaseWordEntry {
  type: "Verb";
  conjugation?: string; // e.g., "1st", "2nd"
  kind?: string; // e.g., "DEP", "TRANS"
}

export interface AdjectiveEntry extends BaseWordEntry {
  type: "Adjective";
  declension?: string;
}

export interface AdverbEntry extends BaseWordEntry {
  type: "Adverb";
}

export interface ParticipleEntry extends BaseWordEntry {
  type: "Participle";
}

export interface TackonEntry extends BaseWordEntry {
  type: "Tackon";
}

export interface PrefixEntry extends BaseWordEntry {
  type: "Prefix";
}

export interface SuffixEntry extends BaseWordEntry {
  type: "Suffix";
}

export interface OtherEntry extends BaseWordEntry {
  type: "Other";
  pos?: string;
}

export type WordEntry =
  | NounEntry
  | VerbEntry
  | AdjectiveEntry
  | AdverbEntry
  | ParticipleEntry
  | TackonEntry
  | PrefixEntry
  | SuffixEntry
  | OtherEntry;

export interface LookupResult {
  results: {
    word: string;
    entries: WordEntry[];
  }[];
}
