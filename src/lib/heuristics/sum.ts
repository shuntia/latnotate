import { SentenceWord } from "@/lib/types/sentence";

// Forms of "sum" (to be)
const SUM_FORMS = new Set([
  "sum", "es", "est", "sumus", "estis", "sunt",
  "eram", "eras", "erat", "eramus", "eratis", "erant",
  "ero", "eris", "erit", "erimus", "eritis", "erunt",
  "sim", "sis", "sit", "simus", "sitis", "sint",
  "essem", "esses", "esset", "essemus", "essetis", "essent",
  "fui", "fuisti", "fuit", "fuimus", "fuistis", "fuerunt", "fuere",
  "fueram", "fueras", "fuerat", "fueramus", "fueratis", "fuerant",
  "fuero", "fueris", "fuerit", "fuerimus", "fueritis", "fuerint",
  "fuerim", "fueris", "fuerit", "fuerimus", "fueritis", "fuerint",
  "fuissem", "fuisses", "fuisset", "fuissemus", "fuissetis", "fuissent",
  "esse", "fore", "futurus", "futura", "futurum",
]);

export const applySumHeuristic = (words: SentenceWord[]): void => {
  words.forEach((word, idx) => {
    // Skip if already selected
    if (word.selectedEntry) return;
    
    // Skip if no lookup results
    if (!word.lookupResults || word.lookupResults.length === 0) return;
    
    const cleanForm = word.clean.toLowerCase();
    
    // Check if any form matches "sum"
    const hasSumForm = word.lookupResults.some(entry => 
      entry.type === "Verb" && 
      entry.forms.some(form => SUM_FORMS.has(form.toLowerCase()))
    );
    
    if (!hasSumForm) return;
    
    // Reject if already rejected
    const heuristicId = `sum-${idx}`;
    if (word.rejectedHeuristics?.has(heuristicId)) return;
    
    // Find the "sum" entry and matching morphology
    const sumEntry = word.lookupResults.find(entry =>
      entry.type === "Verb" && 
      entry.forms.some(form => SUM_FORMS.has(form.toLowerCase()))
    );
    
    if (!sumEntry) return;
    
    // Find the matching form index
    const formIndex = sumEntry.forms.findIndex(form => 
      form.toLowerCase() === cleanForm
    );
    
    if (formIndex === -1) return;
    
    const morphology = sumEntry.morphologies[formIndex];
    if (!morphology) return;
    
    // Apply heuristic selection
    word.selectedEntry = sumEntry;
    word.selectedMorphology = morphology.analysis || morphology.line;
    word.guessed = true;
    word.heuristic = `Form of "sum" (to be) - highly probable`;
  });
};
