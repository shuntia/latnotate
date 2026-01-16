import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import {
  WordEntry,
  Morphology,
  Age,
  Area,
  Geo,
  Frequency,
  Source,
  NounEntry,
  VerbEntry,
  AdjectiveEntry,
  AdverbEntry,
  ParticipleEntry,
  OtherEntry,
  TackonEntry,
  PrefixEntry,
  SuffixEntry,
} from "@/lib/types";

const execFileAsync = promisify(execFile);

// Helper function to remove accent marks from Latin text
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const AGE_MAP: Record<string, Age> = {
  X: "Any Age",
  A: "Archaic",
  B: "Early",
  C: "Classical",
  D: "Late",
  E: "Later",
  F: "Medieval",
  G: "Scholar",
  H: "Modern",
};

const AREA_MAP: Record<string, Area> = {
  X: "Any Area",
  A: "Agriculture",
  B: "Biological",
  D: "Drama/Arts",
  E: "Ecclesiastic",
  G: "Grammar",
  L: "Legal",
  P: "Poetic",
  S: "Science",
  T: "Technical",
  W: "Military",
  Y: "Mythology",
};

const GEO_MAP: Record<string, Geo> = {
  X: "Any Geo",
  A: "Africa",
  B: "Britain",
  C: "China",
  D: "Scandinavia",
  E: "Egypt",
  F: "France/Gaul",
  G: "Germany",
  H: "Greece",
  I: "Italy/Rome",
  J: "India",
  K: "Balkans",
  N: "Netherlands",
  P: "Persia",
  Q: "Near East",
  R: "Russia",
  S: "Spain/Iberia",
  U: "Eastern Europe",
};

const FREQ_MAP: Record<string, Frequency> = {
  X: "Unknown Freq",
  A: "Very Frequent",
  B: "Frequent",
  C: "Common",
  D: "Lesser",
  E: "Uncommon",
  F: "Rare",
  I: "Inscription",
  M: "Graffiti",
};

const FREQ_SCORE: Record<string, number> = {
  A: 100, // Very Frequent
  B: 90, // Frequent
  C: 80, // Common
  D: 70, // Lesser
  E: 60, // Uncommon
  F: 50, // Rare
  I: 40, // Inscription
  M: 30, // Graffiti
  X: 0, // Unknown
};

const SOURCE_MAP: Record<string, Source> = {
  X: "General",
  A: "",
  B: "Bee",
  C: "Cas",
  D: "Sex",
  E: "Ecc",
  F: "DeF",
  G: "G+L",
  H: "Collatinus",
  I: "Leverett",
  J: "Bracton",
  K: "Cal",
  L: "Lewis",
  M: "Latham",
  N: "Nel",
  O: "OLD",
  P: "Souter",
  Q: "Other",
  R: "Plater",
  S: "L+S",
  T: "Translation",
  U: "",
  V: "Saxo",
  W: "Whitaker",
  Y: "Temp",
  Z: "User",
};

const MORPH_CODE_MAP: Record<string, string> = {
  NOM: "Nominative",
  VOC: "Vocative",
  GEN: "Genitive",
  DAT: "Dative",
  ACC: "Accusative",
  ABL: "Ablative",
  LOC: "Locative",
  S: "Singular",
  P: "Plural",
  M: "Masculine",
  F: "Feminine",
  N: "Neuter",
  C: "Common",
  PRES: "Present",
  IMPF: "Imperfect",
  FUT: "Future",
  PERF: "Perfect",
  PLUP: "Pluperfect",
  FUTP: "Future Perfect",
  IND: "Indicative",
  SUB: "Subjunctive",
  IMP: "Imperative",
  INF: "Infinitive",
  PPL: "Participle",
  ACTIVE: "Active",
  PASSIVE: "Passive",
  "1": "1st",
  "2": "2nd",
  "3": "3rd",
  "4": "4th",
  "5": "5th",
  POS: "Positive",
  COMP: "Comparative",
  SUPER: "Superlative",
  ADJ: "Adjective",
  ADV: "Adverb",
  V: "Verb",
  VPAR: "Participle",
  NUM: "Numeral",
  PRON: "Pronoun",
  PREP: "Preposition",
  CONJ: "Conjunction",
  INTERJ: "Interjection",
};

const POS_TAGS = [
  "N",
  "V",
  "ADJ",
  "ADV",
  "VPAR",
  "NUM",
  "PRON",
  "PREP",
  "CONJ",
  "INTERJ",
  "TACKON",
  "PREFIX",
  "SUFFIX",
];

function expandMorphology(morphLine: string): string {
  const tokens = morphLine.split(/\s+/);
  const expanded: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (MORPH_CODE_MAP[token]) {
      if (
        (token === "1" || token === "2" || token === "3") &&
        (tokens[i + 1] === "S" || tokens[i + 1] === "P")
      ) {
        expanded.push(
          `${token}${token === "1" ? "st" : token === "2" ? "nd" : "rd"} Person`,
        );
      } else {
        expanded.push(MORPH_CODE_MAP[token]);
      }
    } else {
      expanded.push(token);
    }
  }

  return expanded.join(" ");
}

function parseWhitakersOutput(raw: string): {
  raw: string;
  entries: WordEntry[];
} {
  // 1. Split into blocks based on blank lines
  // Let's re-read raw line by line.
  const allLines = raw.split("\n");
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of allLines) {
    const t = line.trim();
    // Skip junk lines but treat empty lines as delimiters
    if (
      t.startsWith("=>") ||
      t.includes("INFLECTION_ARRAY") ||
      t.includes("Copyright (c)") ||
      t.includes("Input a word")
    ) {
      continue;
    }

    if (!t) {
      // Empty line -> ends block
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  const finalEntries: WordEntry[] = [];

  // 3. Process each block
  for (const blockLines of blocks) {
    const blockEntries = parseBlockLines(blockLines);

    // Check for modifiers in THIS block
    const modifiers = blockEntries.filter(
      (e) => e.type === "Tackon" || e.type === "Prefix" || e.type === "Suffix",
    );

    const contentWords = blockEntries.filter(
      (e) => e.type !== "Tackon" && e.type !== "Prefix" && e.type !== "Suffix",
    );

    if (modifiers.length > 0 && contentWords.length > 0) {
      // Apply modifiers to content words IN THIS BLOCK only
      const modificationData = modifiers.map((m) => ({
        type: m.type as "Tackon" | "Prefix" | "Suffix",
        form: m.forms[0] || "",
        definition: m.definition,
      }));

      contentWords.forEach((word) => {
        word.modifications = modificationData;
      });

      // Add enriched content words
      finalEntries.push(...contentWords);
    } else {
      // No modifiers or no content words (or just modifiers?), add everything
      // If just modifiers, we probably don't want to show them if they are orphans,
      // but the user might want to see them if that's the only result.
      // For now, add everything.
      finalEntries.push(...blockEntries);
    }
  }

  return {
    raw: raw,
    entries: finalEntries,
  };
}

function parseBlockLines(lines: string[]): WordEntry[] {
  const entries: WordEntry[] = [];
  let currentMorphs: Morphology[] = [];
  let currentEntry: WordEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for [CODE]
    const dictMatch = trimmed.match(/\[([A-Z]+)\]/);

    // Check for special types: TACKON, PREFIX, SUFFIX (which might lack [CODE])
    // Pattern: "form   TYPE"
    const specialMatch =
      !dictMatch && trimmed.match(/^(\S+)\s+(TACKON|PREFIX|SUFFIX)/);

    if (dictMatch || specialMatch) {
      // ... (Same parsing logic as before)
      let code = "";
      let age: Age | undefined,
        area: Area | undefined,
        geo: Geo | undefined,
        frequency: Frequency | undefined,
        source: Source | undefined;

      let preCode = trimmed;
      let dictionaryPosRaw = "";
      let forms: string[] = [];

      if (dictMatch) {
        code = dictMatch[1];
        if (code.length >= 5) {
          age = AGE_MAP[code[0]];
          area = AREA_MAP[code[1]];
          geo = GEO_MAP[code[2]];
          frequency = FREQ_MAP[code[3]];
          source = SOURCE_MAP[code[4]];
        }
        preCode = trimmed.split(/\[[A-Z]+\]/)[0];
      }

      const parts = preCode.split(/\s{2,}/).filter((p) => p.trim());
      if (parts.length >= 1) {
        forms = parts[0].split(", ").map((s) => s.trim());
        if (parts.length > 1) {
          dictionaryPosRaw = parts[1].trim();
        }
      }

      if (specialMatch) {
        dictionaryPosRaw = specialMatch[2];
        if (forms.length === 0) forms = [specialMatch[1]];
      }

      let entry: WordEntry;

      const base = {
        dictLine: trimmed,
        forms,
        morphologies: [...currentMorphs],
        definition: "",
        dictionaryCode: code,
        age: age === "Any Age" ? undefined : age,
        area: area === "Any Area" ? undefined : area,
        geo: geo === "Any Geo" ? undefined : geo,
        frequency: frequency === "Unknown Freq" ? undefined : frequency,
        source: source === "General" ? undefined : source,
      };

      if (dictionaryPosRaw.startsWith("N")) {
        const declensionMatch = dictionaryPosRaw.match(/\((\d+)[a-z]*\)/);
        const declension = declensionMatch
          ? declensionMatch[1] +
            (declensionMatch[1] === "1"
              ? "st"
              : declensionMatch[1] === "2"
                ? "nd"
                : declensionMatch[1] === "3"
                  ? "rd"
                  : "th")
          : undefined;
        const tokens = dictionaryPosRaw.split(" ");
        const gender = tokens.find(
          (t) => ["M", "F", "N", "C"].includes(t) && t !== tokens[0],
        );
        entry = { ...base, type: "Noun", declension, gender } as NounEntry;
      } else if (dictionaryPosRaw.startsWith("VPAR")) {
        entry = { ...base, type: "Participle" } as ParticipleEntry;
      } else if (dictionaryPosRaw.startsWith("V")) {
        const conjMatch = dictionaryPosRaw.match(/\((\d+)[a-z]*\)/);
        const conjugation = conjMatch
          ? conjMatch[1] +
            (conjMatch[1] === "1"
              ? "st"
              : conjMatch[1] === "2"
                ? "nd"
                : conjMatch[1] === "3"
                  ? "rd"
                  : "th")
          : undefined;
        entry = { ...base, type: "Verb", conjugation } as VerbEntry;
      } else if (dictionaryPosRaw.startsWith("ADJ")) {
        entry = { ...base, type: "Adjective" } as AdjectiveEntry;
      } else if (dictionaryPosRaw.startsWith("ADV")) {
        entry = { ...base, type: "Adverb" } as AdverbEntry;
      } else if (dictionaryPosRaw === "TACKON") {
        entry = { ...base, type: "Tackon" } as TackonEntry;
      } else if (dictionaryPosRaw === "PREFIX") {
        entry = { ...base, type: "Prefix" } as PrefixEntry;
      } else if (dictionaryPosRaw === "SUFFIX") {
        entry = { ...base, type: "Suffix" } as SuffixEntry;
      } else {
        entry = {
          ...base,
          type: "Other",
          pos: dictionaryPosRaw.split(" ")[0],
        } as OtherEntry;
      }

      entries.push(entry);
      currentEntry = entry;
      currentMorphs = [];
      continue;
    }

    const morphMatch = line.match(/^.+?\s{2,}([A-Z]+)\s+/);
    const potentialPos = morphMatch ? morphMatch[1] : "";

    if (POS_TAGS.includes(potentialPos)) {
      const parts = trimmed.split(/\s+/);
      const stem = parts[0];
      const pos = parts[1] || "";
      const analysis = expandMorphology(parts.slice(1).join(" "));

      currentMorphs.push({
        line: trimmed,
        stem,
        pos,
        analysis,
      });
    } else {
      if (currentEntry) {
        currentEntry.definition +=
          (currentEntry.definition ? "\n" : "") + trimmed;
      }
    }
  }
  return entries;
}

function calculateScore(entry: WordEntry, inputWord: string): number {
  let score = 0;

  // 1. Exact Match (Input word matches a Stem or Form)
  const cleanInput = inputWord.toLowerCase();

  // Check forms (Dictionary headwords)
  const formMatch = entry.forms.some((f) => f.toLowerCase() === cleanInput);
  if (formMatch) score += 200;

  // Check morphologies (Inflected forms found in text)
  // stem "verit.as" -> "veritas"
  const morphMatch = entry.morphologies.some(
    (m) => m.stem.replace(/\./g, "").toLowerCase() === cleanInput,
  );
  if (morphMatch) score += 150;

  // 2. Frequency
  // Parse frequency code from [XXXAO] -> 'A'
  if (entry.dictionaryCode && entry.dictionaryCode.length >= 4) {
    const freqCode = entry.dictionaryCode[3]; // D is index 3 in [ABCDE]
    score += FREQ_SCORE[freqCode] || 0;
  }

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let wordsToLookup: string[] = [];
    const stream = body.stream === true;
    
    if (body.words && Array.isArray(body.words)) wordsToLookup = body.words;
    else if (body.word) wordsToLookup = [body.word];
    else
      return NextResponse.json(
        { error: 'Field "word" or "words" required' },
        { status: 400 },
      );

    if (wordsToLookup.length === 0) return NextResponse.json({ results: [] });

    const baseDir = path.join(process.cwd(), "data");
    const binPath = path.join(process.cwd(), "bin", "words");

    // If streaming is requested, use ReadableStream
    if (stream) {
      const encoder = new TextEncoder();
      
      const readableStream = new ReadableStream({
        async start(controller) {
          for (const word of wordsToLookup) {
            const tempFile = path.join(
              os.tmpdir(),
              `latnotate-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`,
            );
            // Remove accent marks before lookup
            const cleanedWord = removeAccents(word);
            fs.writeFileSync(tempFile, cleanedWord);

            try {
              const { stdout } = await execFileAsync(binPath, [tempFile], {
                cwd: baseDir,
                timeout: 5000,
              });

              const parsed = parseWhitakersOutput(stdout);

              // Sort entries for this word
              parsed.entries.sort((a, b) => {
                return calculateScore(b, word) - calculateScore(a, word);
              });

              // Send each result as a separate JSON chunk
              const chunk = JSON.stringify({ word, entries: parsed.entries }) + '\n';
              controller.enqueue(encoder.encode(chunk));
            } catch (error) {
              console.error(`Error looking up ${word}:`, error);
              const chunk = JSON.stringify({ word, entries: [] }) + '\n';
              controller.enqueue(encoder.encode(chunk));
            } finally {
              try {
                fs.unlinkSync(tempFile);
              } catch {
                /* ignore */
              }
            }
          }
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Non-streaming path (original behavior)
    const results: { word: string; entries: WordEntry[] }[] = [];

    // Process each word individually to allow proper sorting
    // We execute sequentially to avoid overwhelming the server
    for (const word of wordsToLookup) {
      const tempFile = path.join(
        os.tmpdir(),
        `latnotate-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`,
      );
      // Remove accent marks before lookup
      const cleanedWord = removeAccents(word);
      fs.writeFileSync(tempFile, cleanedWord);

      try {
        const { stdout } = await execFileAsync(binPath, [tempFile], {
          cwd: baseDir,
          timeout: 5000,
        });

        const parsed = parseWhitakersOutput(stdout);

        // Sort entries for this word
        parsed.entries.sort((a, b) => {
          return calculateScore(b, word) - calculateScore(a, word);
        });

        results.push({
          word,
          entries: parsed.entries,
        });
      } catch (error) {
        console.error(`Error looking up ${word}:`, error);
        results.push({ word, entries: [] });
      } finally {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          /* ignore */
        }
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
