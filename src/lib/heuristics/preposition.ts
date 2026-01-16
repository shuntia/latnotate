import { SentenceWord, WordEntry } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";
import { isConjunction, isDeclinable } from "@/lib/utils/word-helpers";

/**
 * SIMPLIFIED PREPOSITION HEURISTIC SYSTEM
 *
 * Philosophy:
 * 1. Identify prepositions (guaranteed or inferred)
 * 2. Select prepositional objects based on required case
 * 3. Build brackets around prepositional phrases
 *
 * This system is designed to be aggressive but accurate - when a preposition
 * is identified, we ALWAYS try to find and mark its object.
 *
 * Note: Participles are treated as adjectives throughout.
 */

/**
 * Extract the case(s) a preposition requires from its morphology
 */
function getPrepositionCases(word: SentenceWord): string[] {
  if (!word.selectedEntry || !word.selectedMorphology) return [];

  const isPrep =
    word.selectedEntry.type === "Other" &&
    (word.selectedMorphology.includes("Preposition") ||
      word.selectedMorphology.includes("PREP"));

  if (!isPrep) return [];

  const cases: string[] = [];
  const morph = word.selectedMorphology;

  // Match both expanded ("Accusative") and abbreviated ("ACC") forms
  if (morph.match(/(Accusative|ACC)/i)) cases.push("Accusative");
  if (morph.match(/(Ablative|ABL)/i)) cases.push("Ablative");
  if (morph.match(/(Genitive|GEN)/i)) cases.push("Genitive");
  if (morph.match(/(Dative|DAT)/i)) cases.push("Dative");

  return cases;
}

/**
 * Check if a word CAN be a specific case
 * Treats participles as adjectives
 */
function canBeCase(word: SentenceWord, targetCase: string): boolean {
  if (!word.lookupResults || word.lookupResults.length === 0) return false;

  return word.lookupResults.some((entry) => {
    // Check if entry is declinable (nouns, adjectives, participles, pronouns)
    if (!isDeclinable(entry)) return false;

    return entry.morphologies.some((m) => {
      const analysis = m.analysis || m.line || "";
      return analysis.includes(targetCase);
    });
  });
}

/**
 * Select the best matching morphology for a word given a required case
 * Treats participles as adjectives
 */
function selectBestMorphology(
  word: SentenceWord,
  targetCase: string,
): { entry: WordEntry; morphology: string } | null {
  if (!word.lookupResults || word.lookupResults.length === 0) return null;

  // Find all entries that can be the target case
  for (const entry of word.lookupResults) {
    // Check if entry is declinable
    if (!isDeclinable(entry)) continue;

    // Find morphologies matching the target case
    const matchingMorphs = entry.morphologies.filter((m) => {
      const analysis = m.analysis || m.line || "";
      return analysis.includes(targetCase);
    });

    if (matchingMorphs.length > 0) {
      // Pick the first matching morphology
      return {
        entry,
        morphology: matchingMorphs[0].analysis || matchingMorphs[0].line || "",
      };
    }
  }

  return null;
}

/**
 * STEP 1: Identify guaranteed prepositions
 *
 * A preposition is "guaranteed" if:
 * - It can ONLY be interpreted as a preposition (no other POS)
 * - It takes a single unambiguous case (e.g., "ab" only takes ABL)
 *
 * For multi-case prepositions (like "in"), we try to disambiguate:
 * - Check if the following word has a GUARANTEED case
 * - If so, select the matching preposition morphology
 * - Otherwise, leave it for inference
 */
export const applyPrepositionIdentification = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    if (word.selectedEntry) return;

    const entries = word.lookupResults || [];

    // Find preposition entries
    const prepEntries = entries.filter(
      (entry) =>
        entry.type === "Other" &&
        entry.morphologies.some((m) => {
          const analysis = m.analysis || m.line || "";
          return analysis.includes("Preposition") || analysis.includes("PREP");
        }),
    );

    if (prepEntries.length === 0) return;

    // Extract all possible cases this preposition can take
    const allPossibleCases = new Set<string>();
    for (const entry of prepEntries) {
      for (const morph of entry.morphologies) {
        const analysis = morph.analysis || morph.line || "";
        if (!analysis.includes("Preposition") && !analysis.includes("PREP"))
          continue;

        // Match both expanded ("Accusative") and abbreviated ("ACC") forms
        if (analysis.match(/(Accusative|ACC)/i))
          allPossibleCases.add("Accusative");
        if (analysis.match(/(Ablative|ABL)/i)) allPossibleCases.add("Ablative");
        if (analysis.match(/(Genitive|GEN)/i)) allPossibleCases.add("Genitive");
        if (analysis.match(/(Dative|DAT)/i)) allPossibleCases.add("Dative");
      }
    }

    if (allPossibleCases.size === 0) return;

    const requiredCases = Array.from(allPossibleCases);

    // CASE 1: Single-case preposition (guaranteed)
    if (requiredCases.length === 1) {
      const prepEntry = prepEntries[0];
      const prepMorph = prepEntry.morphologies.find(
        (m) =>
          (m.analysis || "").includes("Preposition") &&
          (m.analysis || "").includes(requiredCases[0]),
      );

      if (prepMorph) {
        word.selectedEntry = prepEntry;
        word.selectedMorphology = prepMorph.analysis || "";
        word.heuristic = `Guaranteed preposition "${word.original}" requires ${requiredCases[0]}`;
      }
      return;
    }

    // CASE 2: Multi-case preposition - try to disambiguate from context
    if (idx + 1 < words.length) {
      const nextWord = words[idx + 1];

      if (nextWord.lookupResults && nextWord.lookupResults.length > 0) {
        // A word has a guaranteed case if ALL its entries agree on that case
        const allCases = new Set<string>();
        let totalEntries = 0;

        for (const entry of nextWord.lookupResults) {
          if (
            entry.type !== "Noun" &&
            entry.type !== "Adjective" &&
            entry.type !== "Participle"
          ) {
            continue;
          }

          totalEntries++;
          for (const morph of entry.morphologies) {
            const analysis = morph.analysis || morph.line || "";
            if (analysis.includes("Accusative")) allCases.add("Accusative");
            if (analysis.includes("Ablative")) allCases.add("Ablative");
            if (analysis.includes("Nominative")) allCases.add("Nominative");
            if (analysis.includes("Genitive")) allCases.add("Genitive");
            if (analysis.includes("Dative")) allCases.add("Dative");
          }
        }

        // If next word can ONLY be one case, that's guaranteed
        if (totalEntries > 0 && allCases.size === 1) {
          const guaranteedCase = Array.from(allCases)[0];
          if (requiredCases.includes(guaranteedCase)) {
            const prepEntry = prepEntries[0];
            const matchingMorph = prepEntry.morphologies.find(
              (m) =>
                (m.analysis || "").includes("Preposition") &&
                (m.analysis || "").includes(guaranteedCase),
            );

            if (matchingMorph) {
              word.selectedEntry = prepEntry;
              word.selectedMorphology = matchingMorph.analysis || "";
              word.heuristic = `Preposition "${word.original}" disambiguated to ${guaranteedCase} by following word`;
              return;
            }
          }
        }
      }
    }

    // CASE 3: If this word can ONLY be a preposition (no other interpretations), select it
    // even if we don't know which case yet
    if (prepEntries.length === entries.length && requiredCases.length <= 2) {
      // Pick the first morphology (we'll fix it later with inference)
      const prepEntry = prepEntries[0];
      const prepMorph = prepEntry.morphologies.find((m) =>
        (m.analysis || "").includes("Preposition"),
      );

      if (prepMorph) {
        word.selectedEntry = prepEntry;
        word.selectedMorphology = prepMorph.analysis || "";
        word.heuristic = `Likely preposition "${word.original}" (only interpretation)`;
      }
    }
  });
};

/**
 * STEP 1.5: Infer prepositions from context
 *
 * If a word can be a preposition and the following word can be the required case,
 * then infer that it IS a preposition.
 *
 * This handles cases like:
 * - "in urbem" → detect "in" + ACC possible → select as accusative preposition
 * - "in urbe" → detect "in" + ABL possible → select as ablative preposition
 */
export const applyPrepositionInference = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    // Skip if already selected
    if (word.selectedEntry) return;

    const entries = word.lookupResults || [];

    // Find preposition entries
    const prepEntries = entries.filter(
      (entry) =>
        entry.type === "Other" &&
        entry.morphologies.some((m) => {
          const analysis = m.analysis || m.line || "";
          return analysis.includes("Preposition") || analysis.includes("PREP");
        }),
    );

    if (prepEntries.length === 0) return;

    // Check if there's a next word
    if (idx + 1 >= words.length) return;
    const nextWord = words[idx + 1];

    // Extract all case possibilities for each preposition morphology
    const casePossibilities = new Map<string, string[]>(); // case → [morphology strings]

    for (const entry of prepEntries) {
      for (const morph of entry.morphologies) {
        const analysis = morph.analysis || morph.line || "";
        if (!analysis.includes("Preposition") && !analysis.includes("PREP"))
          continue;

        const cases: string[] = [];
        // Match both expanded ("Accusative") and abbreviated ("ACC") forms
        if (analysis.match(/(Accusative|ACC)/i)) cases.push("Accusative");
        if (analysis.match(/(Ablative|ABL)/i)) cases.push("Ablative");
        if (analysis.match(/(Genitive|GEN)/i)) cases.push("Genitive");
        if (analysis.match(/(Dative|DAT)/i)) cases.push("Dative");

        for (const c of cases) {
          if (!casePossibilities.has(c)) {
            casePossibilities.set(c, []);
          }
          casePossibilities.get(c)!.push(analysis);
        }
      }
    }

    if (casePossibilities.size === 0) return;

    // Check which cases the next word CAN be
    const viableOptions: Array<{
      case: string;
      morphology: string;
      entry: WordEntry;
    }> = [];

    for (const [reqCase, morphologies] of casePossibilities.entries()) {
      if (canBeCase(nextWord, reqCase)) {
        // Pick the first morphology for this case
        const prepEntry = prepEntries[0];
        viableOptions.push({
          case: reqCase,
          morphology: morphologies[0],
          entry: prepEntry,
        });
      }
    }

    // If exactly one case works, select it
    if (viableOptions.length === 1) {
      const option = viableOptions[0];
      word.selectedEntry = option.entry;
      word.selectedMorphology = option.morphology;
      word.heuristic = `Inferred as ${option.case} preposition (next word can be ${option.case})`;
    }
    // If multiple cases work, prefer Accusative over Ablative (more common for motion)
    else if (viableOptions.length > 1) {
      const preferredOrder = ["Accusative", "Ablative", "Genitive", "Dative"];

      for (const prefCase of preferredOrder) {
        const match = viableOptions.find((opt) => opt.case === prefCase);
        if (match) {
          word.selectedEntry = match.entry;
          word.selectedMorphology = match.morphology;
          word.heuristic = `Inferred as ${match.case} preposition (next word can be multiple cases, ${match.case} preferred)`;
          break;
        }
      }
    }
  });
};

/**
 * STEP 2: Select prepositional objects
 *
 * For each selected preposition, find the word(s) it governs and mark them
 * with the appropriate case.
 *
 * Strategy:
 * - Look forward from the preposition
 * - Skip genitives (they modify the object, not are the object)
 * - Find first word that CAN be the required case
 * - Mark it with that case
 */
export const applyPrepositionalObjectSelection = (
  words: SentenceWord[],
): void => {
  words.forEach((word, idx) => {
    const requiredCases = getPrepositionCases(word);
    if (requiredCases.length === 0) return;

    // Look forward for the prepositional object
    for (let i = idx + 1; i < Math.min(idx + 8, words.length); i++) {
      const candidate = words[i];

      // Skip words that are already selected
      if (candidate.selectedEntry) {
        // But if it's a genitive, continue looking (genitives modify the object)
        const cgn = getCaseGenderNumber(candidate.selectedMorphology || "");
        if (cgn && cgn.case === "Genitive") continue;

        // Otherwise stop (we found something else)
        break;
      }

      // Check if this word was previously rejected as a prepositional object
      if (candidate.rejectedHeuristics?.has(`prep-object-${idx}`)) continue;

      // Check if this word CAN be any of the required cases
      let bestMatch: {
        case: string;
        entry: WordEntry;
        morphology: string;
      } | null = null;

      for (const reqCase of requiredCases) {
        if (canBeCase(candidate, reqCase)) {
          const result = selectBestMorphology(candidate, reqCase);
          if (result) {
            bestMatch = { case: reqCase, ...result };
            break;
          }
        }
      }

      if (bestMatch) {
        candidate.selectedEntry = bestMatch.entry;
        candidate.selectedMorphology = bestMatch.morphology;
        candidate.heuristic = `Object of preposition "${word.original}" (requires ${bestMatch.case})`;

        // Track dependency
        if (!word.dependentWords) word.dependentWords = new Set();
        word.dependentWords.add(i);

        return; // Found the object, done with this preposition
      }

      // If this word CANNOT be the required case, stop looking
      // (Don't jump over incompatible words)
      break;
    }
  });
};

/**
 * STEP 3: Build brackets around prepositional phrases
 *
 * Once we have a preposition and its object selected, draw brackets
 * to show the scope of the prepositional phrase.
 *
 * The phrase includes:
 * - The object itself
 * - Any adjectives/participles modifying it (same case/number)
 * - Genitives within the phrase
 * - Conjunctions + coordinated nouns
 */
export const applyPrepositionalBrackets = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    const requiredCases = getPrepositionCases(word);
    if (requiredCases.length === 0) return;

    // Find the prepositional object
    let objectIndex = -1;
    let objectCase: string | null = null;
    let objectNumber: string | null = null;

    for (let i = idx + 1; i < Math.min(idx + 8, words.length); i++) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) continue;

      const cgn = getCaseGenderNumber(candidate.selectedMorphology);
      if (!cgn) continue;

      // Check if this matches the preposition's required case
      if (requiredCases.includes(cgn.case)) {
        objectIndex = i;
        objectCase = cgn.case;
        objectNumber = cgn.number;
        break;
      }
    }

    if (objectIndex === -1) return;

    // Extend forward to include modifiers
    let endIndex = objectIndex;

    for (
      let i = objectIndex + 1;
      i < Math.min(objectIndex + 8, words.length);
      i++
    ) {
      const candidate = words[i];
      if (!candidate.selectedEntry || !candidate.selectedMorphology) break;

      const cgn = getCaseGenderNumber(candidate.selectedMorphology);

      // Include if same case and number (modifier)
      if (cgn && cgn.case === objectCase && cgn.number === objectNumber) {
        endIndex = i;
        continue;
      }

      // Include genitives (possessives within phrase)
      if (cgn && cgn.case === "Genitive") {
        endIndex = i;
        continue;
      }

      // Check for conjunctions + matching case
      if (isConjunction(candidate)) {
        // Peek ahead
        if (i + 1 < words.length) {
          const nextWord = words[i + 1];
          if (nextWord.selectedEntry && nextWord.selectedMorphology) {
            const nextCgn = getCaseGenderNumber(nextWord.selectedMorphology);
            if (nextCgn && nextCgn.case === objectCase) {
              // Include conjunction and following word
              endIndex = i + 1;
              i++; // Skip the word we just included
              continue;
            }
          }
        }
      }

      // Otherwise stop
      break;
    }

    // Create bracket if it doesn't exist
    const existingBracket = word.annotations.find(
      (a) => a.type === "preposition-scope" && a.endIndex === endIndex,
    );

    if (!existingBracket) {
      word.annotations.push({
        type: "preposition-scope",
        endIndex: endIndex,
        
        heuristic: `Prepositional phrase: ${word.original} + ${objectCase} object`,
      });
    }
  });
};

/**
 * MAIN EXPORT: Run all preposition heuristics in order
 *
 * Usage:
 *   applyPrepositionHeuristics(words);
 *
 * This replaces the old separate function calls.
 *
 * Order:
 * 1. Identify guaranteed prepositions
 * 2. Infer probable prepositions from context
 * 3. Select prepositional objects
 * 4. Build brackets around prepositional phrases
 */
export const applyPrepositionHeuristics = (words: SentenceWord[]): void => {
  applyPrepositionIdentification(words);
  applyPrepositionInference(words);
  applyPrepositionalObjectSelection(words);
  applyPrepositionalBrackets(words);
};

// Legacy exports for backward compatibility
export const applyPrepositionalGuessing = applyPrepositionalObjectSelection;
export const applyPrepositionalBracketGuessing = applyPrepositionalBrackets;
export const applyReversePrepositionalBracketGuessing = () => {}; // No longer needed
