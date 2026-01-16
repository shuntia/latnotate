// Re-export all heuristic functions
export { applyNominativeChunkGuessing } from "./nominative";
export { applyAdjectiveNounGuessing } from "./adjective";
export { applyAdjectiveCaseGuessing } from "./adjective-case";
export {
  applyPrepositionalBracketGuessing,
  applyReversePrepositionalBracketGuessing,
  applyPrepositionalGuessing,
  applyPrepositionIdentification,
  applyPrepositionInference,
} from "./preposition";
export { applyGenitiveHeuristic } from "./genitive";
export { applyAdjacentAgreementGuessing } from "./adjacent";
export { applyQueEtGuessing } from "./que";
export {
  applyIncrementalHeuristics,
  rerunDependentHeuristics,
} from "./incremental";

// New heuristics (first batch)
export { applyRelativePronounHeuristic } from "./relative-pronoun";
export { applyDativeIndirectObjectHeuristic } from "./dative";
export { applyAppositionHeuristic } from "./apposition";
export { applyAccusativeInfinitiveHeuristic } from "./accusative-infinitive";
export {
  applyTemporalClauseHeuristic,
  applyComparativeHeuristic,
} from "./clauses";
export {
  applyAblativeMeansHeuristic,
  applyAblativeAgentHeuristic,
  applyAblativeAbsoluteHeuristic,
} from "./ablative";

// New heuristics (second batch)
export { applyParticipleModifierHeuristic } from "./participle";
export { applyLinkingVerbHeuristic } from "./linking-verb";
export { applyComplementaryInfinitiveHeuristic } from "./complementary-infinitive";
export { applyVocativeHeuristic } from "./vocative";
export { applyPurposeClauseHeuristic } from "./purpose-clause";

// New heuristics (third batch - improvements)
export { applySumHeuristic } from "./sum";
export { applyAdjectiveAgreementInference } from "./adjective-agreement-inference";
export { applyParticipleBraceHeuristic } from "./participle-brace";
