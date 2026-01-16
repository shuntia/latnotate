import { SentenceWord } from "@/lib/types/sentence";
import { getCaseGenderNumber } from "@/lib/utils/morphology";
import { isAdjectival, isNoun } from "@/lib/utils/word-helpers";

/**
 * If two words agree in case/gender/number and one can be an adjective,
 * infer that it's probably an adjective modifying the other.
 * 
 * Note: Participles are treated as adjectives.
 */
export const applyAdjectiveAgreementInference = (words: SentenceWord[]): void => {
  words.forEach((word, wordIdx) => {
    // Skip if no lookup results
    if (!word.lookupResults || word.lookupResults.length === 0) return;
    
    // Check if this word can be an adjective (or participle)
    const canBeAdjective = word.lookupResults.some(entry => isAdjectival(entry));
    
    if (!canBeAdjective) return;
    
    // Look for adjacent words (±3 positions)
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;
      
      const otherIdx = wordIdx + offset;
      if (otherIdx < 0 || otherIdx >= words.length) continue;
      
      const other = words[otherIdx];
      if (!other.lookupResults || other.lookupResults.length === 0) continue;
      
      // Check if the other word can be a noun
      const otherCanBeNoun = other.lookupResults.some(entry => isNoun(entry));
      
      if (!otherCanBeNoun) continue;
      
      // Check if they can agree in case/gender/number
      let foundMatch = false;
      let matchingAdjEntry: any = null;
      let matchingAdjMorph: any = null;
      let matchingCase = "";
      let matchingGender = "";
      let matchingNumber = "";
      
      for (const adjEntry of word.lookupResults) {
        if (!isAdjectival(adjEntry)) continue;
        
        for (let i = 0; i < adjEntry.morphologies.length; i++) {
          const adjMorph = adjEntry.morphologies[i];
          const adjAnalysis = adjMorph.analysis || adjMorph.line || "";
          
          const adjCgn = getCaseGenderNumber(adjAnalysis);
          if (!adjCgn) continue;
          
          // Check if any noun form in the other word matches
          for (const nounEntry of other.lookupResults) {
            if (nounEntry.type !== "Noun") continue;
            
            for (const nounMorph of nounEntry.morphologies) {
              const nounAnalysis = nounMorph.analysis || nounMorph.line || "";
              const nounCgn = getCaseGenderNumber(nounAnalysis);
              if (!nounCgn) continue;
              
              if (adjCgn.case === nounCgn.case &&
                  adjCgn.gender === nounCgn.gender &&
                  adjCgn.number === nounCgn.number) {
                foundMatch = true;
                matchingAdjEntry = adjEntry;
                matchingAdjMorph = adjMorph;
                matchingCase = adjCgn.case;
                matchingGender = adjCgn.gender;
                matchingNumber = adjCgn.number;
                break;
              }
            }
            if (foundMatch) break;
          }
          if (foundMatch) break;
        }
        if (foundMatch) break;
      }
      
      if (!foundMatch) continue;
      
      // Reject if already rejected or selected
      if (word.selectedEntry) continue;
      const heuristicId = `adj-agree-${wordIdx}`;
      if (word.rejectedHeuristics?.has(heuristicId)) continue;
      
      // Apply heuristic
      word.selectedEntry = matchingAdjEntry;
      word.selectedMorphology = matchingAdjMorph.analysis || matchingAdjMorph.line;
      word.guessed = true;
      word.heuristic = `Inferred adjective agreeing with "${other.original}" (${matchingCase} ${matchingGender} ${matchingNumber})`;
      
      // Add modify annotation
      const existingMod = word.annotations.find(
        (a) => a.type === "modify" && a.targetIndex === otherIdx
      );
      
      if (!existingMod) {
        word.annotations.push({
          type: "modify",
          targetIndex: otherIdx,
          guessed: true,
          heuristic: `Adjective modifying "${other.original}"`,
        });
      }
      
      return; // Only apply once per word
    }
  });
};
