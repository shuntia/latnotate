"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, ArrowRight } from "lucide-react";
import { Oval, InfinitySpin, Triangle } from "react-loader-spinner";
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
import {
  TagType,
  Annotation,
  SentenceWord,
  ContextMenuState,
  GuessConfirmation,
} from "@/lib/types/sentence";
import { TAG_CONFIG, POS_FULL_NAMES } from "@/lib/constants/tags";
import {
  getTagFromWord,
  getCaseOrder,
  getNumberOrder,
  getVoiceOrder,
  getMoodOrder,
  getPersonOrder,
  sortMorphologies,
  formatMorphologyDisplay,
  getVerbPersonNumber,
  isNominative,
  getGrammaticalNumber,
  getCaseGenderNumber,
} from "@/lib/utils/morphology";
import {
  cleanWord,
  getGuaranteedCase,
  getGuaranteedPOS,
  isGuaranteedPreposition,
  isPotentialPreposition,
  isConjunction,
  getPrepositionCases,
  getSelectedPrepositionCases,
} from "@/lib/utils/word-helpers";
import {
  applyNominativeChunkGuessing,
  applyAdjectiveNounGuessing,
  applyAdjectiveCaseGuessing,
  applyPrepositionalBracketGuessing,
  applyPrepositionalGuessing,
  applyPrepositionIdentification,
  applyGenitiveHeuristic,
  applyAdjacentAgreementGuessing,
  applyQueEtGuessing,
  applyIncrementalHeuristics,
  rerunDependentHeuristics,
  applyRelativePronounHeuristic,
  applyDativeIndirectObjectHeuristic,
  applyAppositionHeuristic,
  applyAccusativeInfinitiveHeuristic,
  applyTemporalClauseHeuristic,
  applyComparativeHeuristic,
  applyAblativeMeansHeuristic,
  applyAblativeAgentHeuristic,
  applyAblativeAbsoluteHeuristic,
  applyParticipleModifierHeuristic,
  applyLinkingVerbHeuristic,
  applyComplementaryInfinitiveHeuristic,
  applyVocativeHeuristic,
  applyPurposeClauseHeuristic,
  applySumHeuristic,
  applyPrepositionInference,
  applyAdjectiveAgreementInference,
  applyParticipleBraceHeuristic,
} from "@/lib/heuristics";

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
    type: "select-target" | "select-range" | "select-heuristic-range";
    sourceIndex: number;
    annotationType: Annotation["type"];
  } | null>(null);
  const [guessConfirmation, setGuessConfirmation] = useState<{
    wordIndex: number;
    annotationIndex?: number;
    type: "word" | "annotation" | "selection";
  } | null>(null);
  const [overrideDialogIndex, setOverrideDialogIndex] = useState<number | null>(null);
  const [overrideType, setOverrideType] = useState<string>("");
  const [overrideMorphology, setOverrideMorphology] = useState<string>("");
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
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
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
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
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
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
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
                  className={ann.guessed ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
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
      // Use streaming for analyzer mode
      if (mode === "analyzer") {
        const res = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: uniqueWords, stream: true }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to lookup words");
        }

        // Initialize words array with empty entries
        const words: SentenceWord[] = rawTokens.map((token, idx) => ({
          id: `${idx}-${Date.now()}`,
          original: token,
          clean: cleanWord(token),
          index: idx,
          lookupResults: [],
          selectedEntry: undefined,
          selectedMorphology: undefined,
          annotations: [],
        }));

        // Display words immediately (without definitions)
        setAnalyzerWords([...words]);
        // Don't set isLoading yet - we'll set it when heuristics start

        // Process stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const resultMap = new Map<string, WordEntry[]>();
        let heuristicsStarted = false; // Track when we switch to heuristic phase
        let lastCompleteSentenceEnd = -1; // Track last sentence we've processed heuristics for

        // Helper to check if a word is a sentence separator
        const isSentenceSeparator = (word: SentenceWord): boolean => {
          const cleaned = cleanWord(word.original);
          if (!cleaned || cleaned === '.' || cleaned === ';' || cleaned === ':' || cleaned === '?' || cleaned === '!') {
            return true;
          }
          if (word.original === '"' || word.original === "'" || word.original === '«' || word.original === '»') {
            return true;
          }
          return false;
        };

        // Helper to find complete sentences
        const findCompleteSentences = (): number[] => {
          const sentenceEnds: number[] = [];
          for (let i = 0; i < words.length; i++) {
            if (isSentenceSeparator(words[i]) && words[i].lookupResults) {
              sentenceEnds.push(i);
            }
          }
          return sentenceEnds;
        };

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep last incomplete line in buffer
          buffer = lines.pop() || "";

          // Process complete lines
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const result = JSON.parse(line);
              resultMap.set(result.word, result.entries);

              // Update words with new results
              words.forEach((word, idx) => {
                if (word.clean === result.word && result.entries.length > 0) {
                  word.lookupResults = result.entries;

                  // Auto-select logic
                  if (result.entries.length === 1) {
                    const entry = result.entries[0];
                    if (entry.morphologies.length === 0) {
                      word.selectedEntry = entry;
                    } else if (entry.morphologies.length === 1) {
                      word.selectedEntry = entry;
                      word.selectedMorphology = entry.morphologies[0].analysis;
                    }
                  }
                }
              });

              // Check for newly completed sentences
              const sentenceEnds = findCompleteSentences();
              
              for (const sentenceEnd of sentenceEnds) {
                if (sentenceEnd > lastCompleteSentenceEnd) {
                  // We have a new complete sentence!
                  // Switch to heuristic mode if not already
                  if (!heuristicsStarted) {
                    heuristicsStarted = true;
                    setLoading(false);
                    setIsLoading(true);
                  }

                  // Find sentence start (after previous separator or beginning)
                  let sentenceStart = lastCompleteSentenceEnd + 1;
                  
                  // Extract just this sentence
                  const sentenceWords = words.slice(sentenceStart, sentenceEnd + 1);
                  
                  // Run heuristics on this complete sentence
                  applyPrepositionIdentification(sentenceWords);
                  applyQueEtGuessing(sentenceWords);
                  applyAdjacentAgreementGuessing(sentenceWords);
                  applyAdjectiveNounGuessing(sentenceWords);
                  applyAppositionHeuristic(sentenceWords);
                  applyGenitiveHeuristic(sentenceWords);
                  applyComparativeHeuristic(sentenceWords);
                  
                  // New heuristics (second batch)
                  applyParticipleModifierHeuristic(sentenceWords);
                  applyLinkingVerbHeuristic(sentenceWords);
                  applyComplementaryInfinitiveHeuristic(sentenceWords);
                  applyVocativeHeuristic(sentenceWords);
                  applyPurposeClauseHeuristic(sentenceWords);
                  
                  // New heuristics (third batch - improvements)
                  applySumHeuristic(sentenceWords);
                  applyPrepositionInference(sentenceWords);
                  applyAdjectiveAgreementInference(sentenceWords);
                  applyParticipleBraceHeuristic(sentenceWords);
                  
                  // Bracket building (must come after selection)
                  applyPrepositionalBracketGuessing(sentenceWords);
                  
                  lastCompleteSentenceEnd = sentenceEnd;
                }
              }

              // Update UI
              setAnalyzerWords([...words]);
            } catch (e) {
              console.error("Failed to parse chunk:", line, e);
            }
          }
        }

        // All words loaded - run full heuristics
        // Ensure we've switched to heuristic phase
        if (!heuristicsStarted) {
          setLoading(false);
          setIsLoading(true);
        }
        
        setTimeout(() => {
          // First: Identify guaranteed prepositions (auto-inference)
          applyPrepositionIdentification(words);
          
          // Then: Run dependent heuristics
          applyNominativeChunkGuessing(words);
          applyPrepositionalGuessing(words);
          applyAdjectiveNounGuessing(words);
          applyPrepositionalBracketGuessing(words);
          applyQueEtGuessing(words);
          applyGenitiveHeuristic(words);
          applyAdjacentAgreementGuessing(words);
          
          // New heuristics (first batch)
          applyRelativePronounHeuristic(words);
          applyDativeIndirectObjectHeuristic(words);
          applyAppositionHeuristic(words);
          applyAccusativeInfinitiveHeuristic(words);
          applyTemporalClauseHeuristic(words);
          applyComparativeHeuristic(words);
          applyAblativeMeansHeuristic(words);
          applyAblativeAgentHeuristic(words);
          applyAblativeAbsoluteHeuristic(words);
          
          // New heuristics (second batch)
          applyParticipleModifierHeuristic(words);
          applyLinkingVerbHeuristic(words);
          applyComplementaryInfinitiveHeuristic(words);
          applyVocativeHeuristic(words);
          applyPurposeClauseHeuristic(words);
          
          // New heuristics (third batch - improvements)
          applySumHeuristic(words);
          applyPrepositionInference(words);
          applyAdjectiveAgreementInference(words);
          applyParticipleBraceHeuristic(words);
          
          setAnalyzerWords([...words]);
          setIsLoading(false);
        }, 10);
        
      } else {
        // Dictionary mode - use non-streaming
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

        setDictionaryResult(data);
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
      
      // DO NOT clear guessed selections/annotations
      // Treat them as "correct" and use them as constraints
      // Only clear rejected heuristics so they can be re-attempted
      newWords.forEach(word => {
        word.rejectedHeuristics?.clear();
      });
      
      // Rerun all heuristics (they will respect existing selections)
      // First: Identify guaranteed prepositions (auto-inference)
      applyPrepositionIdentification(newWords);
      
      // Then: Run dependent heuristics
      applyNominativeChunkGuessing(newWords);
      applyPrepositionalGuessing(newWords);
      applyAdjectiveNounGuessing(newWords);
      applyPrepositionalBracketGuessing(newWords);
      applyQueEtGuessing(newWords);
      applyGenitiveHeuristic(newWords);
      applyAdjacentAgreementGuessing(newWords);
      
      // New heuristics
      applyRelativePronounHeuristic(newWords);
      applyDativeIndirectObjectHeuristic(newWords);
      applyAppositionHeuristic(newWords);
      applyAccusativeInfinitiveHeuristic(newWords);
      applyTemporalClauseHeuristic(newWords);
      applyComparativeHeuristic(newWords);
      applyAblativeMeansHeuristic(newWords);
      applyAblativeAgentHeuristic(newWords);
      applyAblativeAbsoluteHeuristic(newWords);
      
      // New heuristics (second batch)
      applyParticipleModifierHeuristic(newWords);
      applyLinkingVerbHeuristic(newWords);
      applyComplementaryInfinitiveHeuristic(newWords);
      applyVocativeHeuristic(newWords);
      applyPurposeClauseHeuristic(newWords);
      
      // New heuristics (third batch - improvements)
      applySumHeuristic(newWords);
      applyPrepositionInference(newWords);
      applyAdjectiveAgreementInference(newWords);
      applyParticipleBraceHeuristic(newWords);
      
      setAnalyzerWords(newWords);
      setIsLoading(false);
    }, 10);
  };

  const rerunHeuristicsInRange = (startIndex: number, endIndex: number) => {
    if (analyzerWords.length === 0) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const newWords = [...analyzerWords];
      
      // Clear only guessed selections/annotations in the range
      for (let i = startIndex; i <= endIndex; i++) {
        const word = newWords[i];
        if (!word) continue;
        
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
        
        // Clear rejected heuristics in range
        word.rejectedHeuristics?.clear();
      }
      
      // Extract the range as a slice for heuristic processing
      const rangeWords = newWords.slice(startIndex, endIndex + 1);
      
      // Run heuristics on the range
      applyPrepositionIdentification(rangeWords);
      applyNominativeChunkGuessing(rangeWords);
      applyPrepositionalGuessing(rangeWords);
      applyAdjectiveNounGuessing(rangeWords);
      applyPrepositionalBracketGuessing(rangeWords);
      applyQueEtGuessing(rangeWords);
      applyGenitiveHeuristic(rangeWords);
      applyAdjacentAgreementGuessing(rangeWords);
      
      applyRelativePronounHeuristic(rangeWords);
      applyDativeIndirectObjectHeuristic(rangeWords);
      applyAppositionHeuristic(rangeWords);
      applyAccusativeInfinitiveHeuristic(rangeWords);
      applyTemporalClauseHeuristic(rangeWords);
      applyComparativeHeuristic(rangeWords);
      applyAblativeMeansHeuristic(rangeWords);
      applyAblativeAgentHeuristic(rangeWords);
      applyAblativeAbsoluteHeuristic(rangeWords);
      
      applyParticipleModifierHeuristic(rangeWords);
      applyLinkingVerbHeuristic(rangeWords);
      applyComplementaryInfinitiveHeuristic(rangeWords);
      applyVocativeHeuristic(rangeWords);
      applyPurposeClauseHeuristic(rangeWords);
      
      applySumHeuristic(rangeWords);
      applyPrepositionInference(rangeWords);
      applyAdjectiveAgreementInference(rangeWords);
      applyParticipleBraceHeuristic(rangeWords);
      
      // Put the processed range back into the main array
      for (let i = 0; i < rangeWords.length; i++) {
        newWords[startIndex + i] = rangeWords[i];
      }
      
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
        setAnalyzerWords(newWords);
        setInteractionMode(null);
      } else if (interactionMode.type === "select-range") {
        sourceWord.annotations.push({
          type: interactionMode.annotationType,
          endIndex: index,
        });
        setAnalyzerWords(newWords);
        setInteractionMode(null);
      } else if (interactionMode.type === "select-heuristic-range") {
        // Rerun heuristics from sourceIndex to index
        const startIndex = Math.min(interactionMode.sourceIndex, index);
        const endIndex = Math.max(interactionMode.sourceIndex, index);
        setInteractionMode(null);
        rerunHeuristicsInRange(startIndex, endIndex);
      }
    } else {
      // Normal Click - Open Dialog
      const word = analyzerWords[index];
      // Allow clicking on words with lookup results OR override words
      if (word && ((word.lookupResults && word.lookupResults.length > 0) || word.override)) {
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
      if (word.lookupResults && word.lookupResults.length > 0) {
        // Get possible cases for split-color display on hover
        const possibleCases = getPossibleCases(word.lookupResults);
        if (possibleCases.length > 1) {
          // Return base classes with dark text for visibility, split colors show on hover only
          return "border-b-2 border-gray-300 hover-split-color relative transition-colors text-gray-900 font-semibold";
        }
        return "border-b-2 border-gray-300 hover:bg-gray-100";
      }
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

  // Get all possible cases from lookup results
  const getPossibleCases = (entries: WordEntry[]): TagType[] => {
    const cases = new Set<TagType>();
    
    entries.forEach(entry => {
      if (entry.type === "Noun" || entry.type === "Adjective" || entry.type === "Participle") {
        entry.morphologies.forEach((morphology) => {
          if (morphology) {
            const analysis = morphology.analysis || morphology.line || "";
            if (analysis.includes("Nominative")) cases.add("NOM");
            if (analysis.includes("Accusative")) cases.add("ACC");
            if (analysis.includes("Genitive")) cases.add("GEN");
            if (analysis.includes("Dative")) cases.add("DAT");
            if (analysis.includes("Ablative")) cases.add("ABL");
            if (analysis.includes("Vocative")) cases.add("VOC");
            if (analysis.includes("Locative")) cases.add("LOC");
          }
        });
      } else if (entry.type === "Verb") {
        entry.morphologies.forEach((morphology) => {
          if (morphology) {
            const analysis = morphology.analysis || morphology.line || "";
            if (analysis.includes("Infinitive")) {
              cases.add("INF");
            }
          }
        });
      } else if (entry.type === "Adverb") {
        cases.add("ADV");
      } else if (entry.type === "Other") {
        // Check if it's a pronoun with cases
        const isPronoun = entry.morphologies.some(m => 
          (m.analysis || m.line || "").includes("Pronoun")
        );
        
        if (isPronoun) {
          entry.morphologies.forEach((morphology) => {
            if (morphology) {
              const analysis = morphology.analysis || morphology.line || "";
              if (analysis.includes("Nominative")) cases.add("NOM");
              if (analysis.includes("Accusative")) cases.add("ACC");
              if (analysis.includes("Genitive")) cases.add("GEN");
              if (analysis.includes("Dative")) cases.add("DAT");
              if (analysis.includes("Ablative")) cases.add("ABL");
              if (analysis.includes("Vocative")) cases.add("VOC");
              if (analysis.includes("Locative")) cases.add("LOC");
            }
          });
        } else {
          // Other word types
          if (entry.pos === "CONJ") cases.add("CONJ");
          if (entry.pos === "PREP") cases.add("PREP");
          if (entry.pos === "INTERJ") cases.add("INTERJ");
        }
      }
    });
    
    // Return sorted array for consistent ordering
    const caseArray = Array.from(cases);
    return caseArray.sort();
  };

  // Create gradient background for split colors (on hover only)
  const getSplitColorStyle = (cases: TagType[]): React.CSSProperties => {
    if (cases.length === 0 || cases.length === 1) return {};
    
    // Create gradient stops for multiple colors
    const colors = cases.map(c => {
      const bgClass = TAG_CONFIG[c].bgClass;
      // Extract color from Tailwind class like "bg-red-200"
      const colorMap: Record<string, string> = {
        "bg-red-200": "#fecaca",
        "bg-blue-200": "#bfdbfe",
        "bg-green-200": "#bbf7d0",
        "bg-orange-200": "#fed7aa",
        "bg-indigo-200": "#c7d2fe",
        "bg-yellow-200": "#fef08a",
        "bg-violet-200": "#ddd6fe",
        "bg-cyan-200": "#a5f3fc",
        "bg-pink-200": "#fbcfe8",
        "bg-amber-200": "#fde68a",
        "bg-lime-200": "#d9f99d",
        "bg-emerald-200": "#a7f3d0",
        "bg-zinc-200": "#e4e4e7",
      };
      return colorMap[bgClass] || "#e5e7eb";
    });
    
    // Create gradient with equal splits
    const step = 100 / cases.length;
    const gradientStops = colors.map((color, i) => {
      const start = i * step;
      const end = (i + 1) * step;
      return `${color} ${start}%, ${color} ${end}%`;
    }).join(", ");
    
    return {
      "--split-gradient": `linear-gradient(to right, ${gradientStops})`,
    } as React.CSSProperties;
  };

  const getWordPadding = () => {
    // Always use consistent padding
    return "px-1";
  };

  const hasAdjacentConnection = (word: SentenceWord, wordIndex: number): boolean => {
    // Check if this word has an adjacent connection (annotation to next/previous word)
    return word.annotations.some(ann => {
      if (ann.type === "modify" || ann.type === "possession") {
        if (ann.targetIndex !== undefined) {
          return Math.abs(ann.targetIndex - wordIndex) === 1;
        }
      }
      return false;
    });
  };

  const getWordMargin = (word: SentenceWord, wordIndex: number) => {
    const tag = getTagFromWord(word);
    const hasGuess = word.guessed;
    const hasAdjConn = hasAdjacentConnection(word, wordIndex);
    
    // Add extra margin if word has adjacent connection to create space for the line
    let baseMargin = "";
    if (hasAdjConn) {
      baseMargin = "mr-4"; // Extra space for adjacent connection line
    }
    
    // Add right margin to accommodate badges that extend beyond the word
    // If both tag and guess: "?" is at -right-6 from word edge
    if (tag && hasGuess) {
      return hasAdjConn ? "mr-8" : "mr-7";  // Extra margin for the ? badge
    }
    // If only guess (no tag): "?" at -right-2
    else if (hasGuess) {
      return hasAdjConn ? "mr-5" : "mr-3";  // Less margin needed
    }
    // Return base margin (for adjacent connection or empty)
    return baseMargin;
  };

  const renderBadge = (word: SentenceWord, wordIndex: number) => {
    // Override badge
    if (word.override) {
      const tooltipText = word.override.morphology 
        ? `Override: ${word.override.type} - ${word.override.morphology} - click to remove`
        : `Override: ${word.override.type} - click to remove`;
      
      return (
        <span
          className="absolute -top-3 -right-2 text-[10px] font-bold px-1 rounded bg-red-600 border border-red-700 text-white shadow-sm cursor-pointer hover:bg-red-700"
          title={tooltipText}
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
      // Show heuristic confirmation dialog
      setGuessConfirmation({ wordIndex, annotationIndex: undefined, type: "selection" });
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
      {/* CSS for hover-only split colors */}
      <style jsx>{`
        .hover-split-color:hover {
          background: var(--split-gradient) !important;
        }
      `}</style>
      
      {/* Loading Spinner Overlay */}
      {(loading || isLoading) && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            {loading ? (
              <InfinitySpin
                width="200"
                color="#3b82f6"
                ariaLabel="infinity-spin-loading"
              />
            ) : (
              <Triangle
                height="80"
                width="80"
                color="#3b82f6"
                ariaLabel="triangle-loading"
              />
            )}
            <p className="text-sm font-medium text-gray-700">
              {loading ? "Looking up words..." : "Calculating heuristics..."}
            </p>
          </div>
        </div>
      )}
      
      {/* Interaction Mode Overlay */}
      {interactionMode && (
        <div className="fixed inset-0 bg-black/10 cursor-crosshair z-50 flex items-start justify-center pt-10 pointer-events-none">
          <div className="bg-white p-2 rounded shadow-lg pointer-events-auto">
            <p className="text-sm font-bold">
              {interactionMode.type === "select-heuristic-range" 
                ? "Select End of Range (heuristics will rerun)"
                : `Select ${
                    interactionMode.annotationType === "possession"
                      ? "Possessor"
                      : interactionMode.annotationType === "modify"
                        ? "Noun"
                        : "End of Scope"
                  }`
              }
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
                  <svg className="absolute inset-0 w-full h-full z-0 overflow-visible">
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
                              <div className={`flex items-center ${getWordMargin(word, i)}`}>
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
                                    (hasResults || word.override || interactionMode) &&
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
                                  style={
                                    !word.selectedEntry && word.lookupResults 
                                      ? getSplitColorStyle(getPossibleCases(word.lookupResults))
                                      : undefined
                                  }
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
                                {word.override.morphology && (
                                  <p className="text-xs opacity-70">{word.override.morphology}</p>
                                )}
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

            {/* Override Status */}
            {selectedWord?.override && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4 flex justify-between items-center">
                <div>
                  <span className="font-bold text-red-900">Override:</span>
                  <span className="ml-2 text-red-800">
                    {selectedWord.override.type}
                  </span>
                  {selectedWord.override.morphology && (
                    <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border text-red-700">
                      {selectedWord.override.morphology}
                    </span>
                  )}
                  <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border text-red-500">
                    Manual
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedWordIndex !== null) {
                      const newWords = [...analyzerWords];
                      delete newWords[selectedWordIndex].override;
                      setAnalyzerWords(newWords);
                      setSelectedWordIndex(null);
                    }
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Remove Override
                </Button>
              </div>
            )}

            {/* Current Selection Status */}
            {selectedWord?.selectedEntry && !selectedWord?.override && (
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
              {selectedWord?.override ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">This word is manually overridden.</p>
                  <p className="text-xs mt-2">Remove the override above to select from dictionary entries.</p>
                </div>
              ) : (
                selectedWord?.lookupResults
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
              ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Guess Confirmation Dialog (for annotations only) */}
        {guessConfirmation && guessConfirmation.type === "selection" && (() => {
          const { wordIndex } = guessConfirmation;
          const word = analyzerWords[wordIndex];
          
          const confirmGuess = () => {
            // Keep the selection, just remove the guessed flag
            const newWords = [...analyzerWords];
            newWords[wordIndex].guessed = false;
            newWords[wordIndex].heuristic = undefined;
            setAnalyzerWords(newWords);
            setGuessConfirmation(null);
          };
          
          const revokeGuess = () => {
            // Clear the selection and mark as rejected
            const newWords = [...analyzerWords];
            const heuristicId = `${newWords[wordIndex].selectedEntry?.type}-${wordIndex}`;
            if (!newWords[wordIndex].rejectedHeuristics) {
              newWords[wordIndex].rejectedHeuristics = new Set();
            }
            newWords[wordIndex].rejectedHeuristics!.add(heuristicId);
            newWords[wordIndex].selectedEntry = undefined;
            newWords[wordIndex].selectedMorphology = undefined;
            newWords[wordIndex].guessed = false;
            newWords[wordIndex].heuristic = undefined;
            setAnalyzerWords(newWords);
            setGuessConfirmation(null);
          };
          
          const openSelection = () => {
            // Open definition selection dialog
            setSelectedWordIndex(wordIndex);
            setGuessConfirmation(null);
          };
          
          return (
            <Dialog open={true} onOpenChange={() => setGuessConfirmation(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Heuristic Word Selection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                    <p className="text-sm text-orange-900">
                      <strong>Word:</strong> {word.original}
                    </p>
                    {word.selectedEntry && (
                      <p className="text-sm text-orange-800 mt-1">
                        <strong>Selected as:</strong> {word.selectedEntry.type}
                        {word.selectedMorphology && ` (${word.selectedMorphology})`}
                      </p>
                    )}
                    {word.heuristic && (
                      <p className="text-sm text-orange-800 mt-2">
                        <strong>Reasoning:</strong> {word.heuristic}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">Is this interpretation correct?</p>
                  <div className="flex flex-col gap-2">
                    <Button onClick={confirmGuess} variant="default">
                      Confirm
                    </Button>
                    <Button onClick={openSelection} variant="outline">
                      Choose Different Meaning
                    </Button>
                    <Button onClick={revokeGuess} variant="destructive">
                      Reject & Clear
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

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
              setOverrideMorphology("");
            }}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-red-600">Override Word Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm text-red-900">
                      <strong>Word:</strong> {word.original}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Select part of speech and morphological features
                    </p>
                  </div>

                  {/* Part of Speech Selection */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Part of Speech *</label>
                    <div className="flex flex-wrap gap-2">
                      {["Noun", "Verb", "Adjective", "Adverb", "Pronoun", "Preposition", "Conjunction", "Interjection"].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => {
                            setOverrideType(pos);
                            // Clear morphology when changing POS
                            setOverrideMorphology("");
                          }}
                          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                            overrideType === pos
                              ? "bg-red-600 text-white border-red-700"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Morphology Selection (conditional on POS) */}
                  {overrideType && (
                    <div className="space-y-3 border-t pt-4">
                      {/* NOUN */}
                      {overrideType === "Noun" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Case</label>
                            <div className="flex flex-wrap gap-2">
                              {["Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative", "Locative"].map((c) => (
                                <button
                                  key={c}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[0] = c;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(c)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Number</label>
                            <div className="flex gap-2">
                              {["Singular", "Plural"].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[1] = n;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(n)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Gender (optional)</label>
                            <div className="flex gap-2">
                              {["Masculine", "Feminine", "Neuter"].map((g) => (
                                <button
                                  key={g}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[2] = parts[2] === g ? "" : g;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(g)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ADJECTIVE */}
                      {overrideType === "Adjective" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Case</label>
                            <div className="flex flex-wrap gap-2">
                              {["Nominative", "Genitive", "Dative", "Accusative", "Ablative", "Vocative"].map((c) => (
                                <button
                                  key={c}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[0] = c;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(c)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Number</label>
                            <div className="flex gap-2">
                              {["Singular", "Plural"].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[1] = n;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(n)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Gender</label>
                            <div className="flex gap-2">
                              {["Masculine", "Feminine", "Neuter"].map((g) => (
                                <button
                                  key={g}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[2] = g;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(g)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* VERB */}
                      {overrideType === "Verb" && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Tense</label>
                            <div className="flex flex-wrap gap-2">
                              {["Present", "Imperfect", "Future", "Perfect", "Pluperfect", "Future Perfect"].map((t) => (
                                <button
                                  key={t}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[0] = t;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(t)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Mood</label>
                            <div className="flex gap-2">
                              {["Indicative", "Subjunctive", "Imperative"].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[1] = m;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(m)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Voice</label>
                            <div className="flex gap-2">
                              {["Active", "Passive"].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[2] = v;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(v)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Person</label>
                            <div className="flex gap-2">
                              {["1st", "2nd", "3rd"].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[3] = p;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(p)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {p} Person
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Number</label>
                            <div className="flex gap-2">
                              {["Singular", "Plural"].map((n) => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    const parts = overrideMorphology.split(" ");
                                    parts[4] = n;
                                    setOverrideMorphology(parts.filter(p => p).join(" "));
                                  }}
                                  className={`px-3 py-1 text-sm rounded border ${
                                    overrideMorphology.includes(n)
                                      ? "bg-indigo-600 text-white border-indigo-700"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Other POS (simple, no morphology needed) */}
                      {["Adverb", "Preposition", "Conjunction", "Interjection", "Pronoun"].includes(overrideType) && (
                        <p className="text-sm text-gray-500 italic">No additional morphology needed for {overrideType.toLowerCase()}s.</p>
                      )}

                      {/* Current Selection Display */}
                      {overrideMorphology && (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs text-blue-900">
                            <strong>Selected:</strong> {overrideType} {overrideMorphology}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        if (overrideType.trim()) {
                          const newWords = [...analyzerWords];
                          // Create override entry with morphology
                          newWords[overrideDialogIndex].override = {
                            type: overrideType.trim(),
                            morphology: overrideMorphology.trim() || undefined,
                            manual: true,
                          };
                          // Clear existing selections when overriding
                          newWords[overrideDialogIndex].selectedEntry = undefined;
                          newWords[overrideDialogIndex].selectedMorphology = undefined;
                          setAnalyzerWords(newWords);
                        }
                        setOverrideDialogIndex(null);
                        setOverrideType("");
                        setOverrideMorphology("");
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
                        setOverrideMorphology("");
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
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                  onClick={() => {
                    setInteractionMode({
                      type: "select-heuristic-range",
                      sourceIndex: contextMenu.wordIndex,
                      annotationType: "modify", // dummy value, not used
                    });
                    setContextMenu(null);
                  }}
                >
                  <ArrowRight className="w-3 h-3" /> Select Range to Rerun Heuristics
                </button>
                <div className="border-t my-1"></div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    // Clear annotations for this word (outgoing)
                    const newWords = [...analyzerWords];
                    newWords[contextMenu.wordIndex].annotations = [];
                    setAnalyzerWords(newWords);
                    setContextMenu(null);
                  }}
                >
                  Clear Outgoing Connections
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    // Clear annotations pointing TO this word (incoming)
                    const newWords = [...analyzerWords];
                    const targetIdx = contextMenu.wordIndex;
                    
                    // Find all words that have annotations pointing to this word
                    newWords.forEach((word, idx) => {
                      if (idx === targetIdx) return;
                      
                      // Filter out annotations that target this word
                      word.annotations = word.annotations.filter(ann => {
                        if (ann.type === "preposition-scope") {
                          return ann.targetIndex !== targetIdx;
                        }
                        if (ann.type === "modify" || ann.type === "possession") {
                          return ann.targetIndex !== targetIdx;
                        }
                        return true;
                      });
                    });
                    
                    setAnalyzerWords(newWords);
                    setContextMenu(null);
                  }}
                >
                  Clear Incoming Connections
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
