"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, ArrowRight, RefreshCw, Save, Upload, PanelRightClose, PanelRightOpen, Eye, EyeOff } from "lucide-react";
import { InfinitySpin, Triangle } from "react-loader-spinner";
import { Navigation } from "@/components/Navigation";
import { Toaster, toast } from "sonner";
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
import { WordEntry, LookupResult } from "@/lib/types";
import {
  TagType,
  Annotation,
  SentenceWord,
  ContextMenuState,
} from "@/lib/types/sentence";
import { TAG_CONFIG, POS_FULL_NAMES } from "@/lib/constants/tags";
import { getTagFromWord, sortMorphologies } from "@/lib/utils/morphology";
import { cleanWord } from "@/lib/utils/word-helpers";
import {
  applyNominativeChunkGuessing,
  applyAdjectiveNounGuessing,
  applyPrepositionalBracketGuessing,
  applyPrepositionalGuessing,
  applyPrepositionIdentification,
  applyGenitiveHeuristic,
  applyAdjacentAgreementGuessing,
  applyQueEtGuessing,
  applyIncrementalHeuristics,
  applyRelativePronounHeuristic,
  applyDativeIndirectObjectHeuristic,
  applyAppositionHeuristic,
  applyAccusativeInfinitiveHeuristic,
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
  applyInfinitiveHeuristic,
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
  const [showSidePane, setShowSidePane] = useState(true);
  const [showRelationshipLines, setShowRelationshipLines] = useState(false);

  // Selection / Interaction State
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(
    null,
  ); // For Dialog
  const [focusedEntryIndex, setFocusedEntryIndex] = useState<number>(0); // For keyboard navigation
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
  const [overrideDialogIndex, setOverrideDialogIndex] = useState<number | null>(
    null,
  );
  const [overrideType, setOverrideType] = useState<string>("");
  const [overrideMorphology, setOverrideMorphology] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false); // Non-blocking badge for incremental updates
  const [isBlockingRecalc, setIsBlockingRecalc] = useState(false); // Blocking for full recalc

  // Layout refs for SVG drawing
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<React.ReactNode[]>([]);
  const [maxLineDepth, setMaxLineDepth] = useState(0);

  // Keyboard navigation for definitions and word selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Left/Right arrow navigation for words (works even when no word selected)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (analyzerWords.length === 0) return;
        
        e.preventDefault();
        
        if (selectedWordIndex === null) {
          // No word selected, select first word
          setSelectedWordIndex(0);
          setFocusedEntryIndex(0);
        } else {
          // Move to next/previous word
          if (e.key === "ArrowRight") {
            const nextIndex = Math.min(selectedWordIndex + 1, analyzerWords.length - 1);
            setSelectedWordIndex(nextIndex);
            setFocusedEntryIndex(0);
          } else {
            const prevIndex = Math.max(selectedWordIndex - 1, 0);
            setSelectedWordIndex(prevIndex);
            setFocusedEntryIndex(0);
          }
        }
        return;
      }
      
      // Up/Down/Enter/Escape only work when a word is selected
      if (selectedWordIndex === null) return;
      
      const word = analyzerWords[selectedWordIndex];
      if (!word || !word.lookupResults || word.lookupResults.length === 0) return;
      
      const entries = word.lookupResults;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedEntryIndex(prev => Math.min(prev + 1, entries.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedEntryIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const entry = entries[focusedEntryIndex];
        if (entry) {
          if (entry.morphologies.length === 0) {
            selectDefinition(entry);
          } else if (entry.morphologies.length === 1) {
            selectDefinition(entry, entry.morphologies[0].analysis);
          }
          // If multiple morphologies, user needs to click one
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedWordIndex(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWordIndex, focusedEntryIndex, analyzerWords]);
  
  // Reset focused entry when word changes
  useEffect(() => {
    setFocusedEntryIndex(0);
  }, [selectedWordIndex]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Update Lines/Annotations
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // First pass: Collect all multiline connections with their positions
    interface MultilineConnection {
      wordIndex: number;
      annIndex: number;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      horizontalDistance: number;
      linesCrossed: number; // Number of text lines this connection spans
    }
    
    const multilineConnections: MultilineConnection[] = [];
    
    analyzerWords.forEach((word, i) => {
      word.annotations.forEach((ann, annIdx) => {
        if (ann.type !== "modify" && ann.type !== "possession") return;
        if (ann.targetIndex === undefined) return;
        
        const sourceEl = wordRefs.current[i];
        const targetEl = wordRefs.current[ann.targetIndex];
        if (!sourceEl || !targetEl) return;
        
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        
        const sx = sourceRect.left - containerRect.left + sourceRect.width / 2;
        const sy = sourceRect.bottom - containerRect.top;
        const tx = targetRect.left - containerRect.left + targetRect.width / 2;
        const ty = targetRect.bottom - containerRect.top;
        
        const lineHeight = 40;
        const yDiff = Math.abs(sy - ty);
        if (yDiff > lineHeight) {
          const linesCrossed = Math.floor(yDiff / lineHeight);
          multilineConnections.push({
            wordIndex: i,
            annIndex: annIdx,
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
            horizontalDistance: Math.abs(tx - sx),
            linesCrossed: linesCrossed,
          });
        }
      });
    });
    
    // Sort by lines crossed (most lines first), then by horizontal distance
    // Longer connections that cross more lines should be outermost
    multilineConnections.sort((a, b) => {
      if (b.linesCrossed !== a.linesCrossed) {
        return b.linesCrossed - a.linesCrossed;
      }
      return b.horizontalDistance - a.horizontalDistance;
    });
    
    // Assign depths - connections that cross more lines get deeper positions
    const depthMap = new Map<string, number>();
    const baseDepth = 12; // Reduced to conserve space
    const depthIncrement = 6; // Reduced to make lines closer
    multilineConnections.forEach((conn, idx) => {
      const key = `${conn.wordIndex}-${conn.annIndex}`;
      depthMap.set(key, baseDepth + (idx * depthIncrement));
    });

    const newLines: React.ReactNode[] = [];
    let currentMaxDepth = 0;

    analyzerWords.forEach((word, i) => {
      word.annotations.forEach((ann, annIdx) => {
        if (ann.type === "preposition-scope") return; // Handled via text brackets now
        if (ann.type === "modify" || ann.type === "possession") {
          // Skip rendering relationship lines if toggle is off
          if (!showRelationshipLines) return;
          
          if (ann.targetIndex === undefined) return;
          const targetEl = wordRefs.current[ann.targetIndex];
          if (!targetEl) return;
          
          const sourceEl = wordRefs.current[i];
          if (!sourceEl) return;
          
          const sourceRect = sourceEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          
          const sx = sourceRect.left - containerRect.left + sourceRect.width / 2;
          const sy = sourceRect.bottom - containerRect.top;
          const tx = targetRect.left - containerRect.left + targetRect.width / 2;
          const ty = targetRect.bottom - containerRect.top;
          
          const color = ann.type === "possession" ? "#4f46e5" : "#6b7280";
          const strokeWidth = ann.type === "possession" ? "3" : "2.5";
          
          // Check if adjacent (next to each other)
          const isAdjacent = Math.abs(ann.targetIndex - i) === 1;
          
          if (isAdjacent) {
            // Adjacent: straight horizontal line at middle height
            const sourceMiddleY = sourceRect.top - containerRect.top + sourceRect.height / 2;
            const targetMiddleY = targetRect.top - containerRect.top + targetRect.height / 2;
            const sourceX = i < ann.targetIndex ? sourceRect.right - containerRect.left : sourceRect.left - containerRect.left;
            const targetX = i < ann.targetIndex ? targetRect.left - containerRect.left : targetRect.right - containerRect.left;
            const pathData = `M ${sourceX} ${sourceMiddleY} L ${targetX} ${targetMiddleY}`;
            
            newLines.push(
              <path
                key={`${word.id}-${annIdx}`}
                d={pathData}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                markerEnd={ann.type === "possession" ? "url(#arrowhead)" : undefined}
              />
            );
          } else {
            // Non-adjacent: Rounded Rectangle (Orthogonal)
            const baseVerticalExtension = 20;
            const horizontalFactor = Math.abs(sx - tx) * 0.015;
            const verticalExtension = baseVerticalExtension + horizontalFactor;
            const midY = Math.max(sy, ty) + verticalExtension;

            // Track maximum depth for dynamic padding
            const lineDepth = midY - Math.max(sy, ty);
            currentMaxDepth = Math.max(currentMaxDepth, lineDepth);

            // Use quadratic curves for rounded corners
            const controlRadius = 8;

            // Build path with quadratic bezier curves at corners
            const pathData = `
              M ${sx} ${sy}
              L ${sx} ${midY - controlRadius}
              Q ${sx} ${midY}, ${sx + (sx < tx ? controlRadius : -controlRadius)} ${midY}
              L ${tx + (sx < tx ? -controlRadius : controlRadius)} ${midY}
              Q ${tx} ${midY}, ${tx} ${midY - controlRadius}
              L ${tx} ${ty}
            `.trim().replace(/\s+/g, ' ');

            newLines.push(
              <path
                key={`${word.id}-${annIdx}`}
                d={pathData}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={ann.type === "possession" ? "url(#arrowhead)" : undefined}
              />
            );
          }
        }
        
        // All other annotation types (if any) would be handled here
      });
    });
    setLines(newLines);
    setMaxLineDepth(currentMaxDepth);
  }, [analyzerWords, interactionMode, showRelationshipLines]); // Re-run when words, mode, or toggle changes

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
        let pendingUpdates = 0; // Track how many results we've received since last render
        const RENDER_BATCH_SIZE = 5; // Update UI every 5 results to reduce DOM thrashing

        // Helper to check if a word is a sentence separator
        const isSentenceSeparator = (word: SentenceWord): boolean => {
          const cleaned = cleanWord(word.original);
          if (
            !cleaned ||
            cleaned === "." ||
            cleaned === ";" ||
            cleaned === ":" ||
            cleaned === "?" ||
            cleaned === "!"
          ) {
            return true;
          }
          if (
            word.original === '"' ||
            word.original === "'" ||
            word.original === "«" ||
            word.original === "»"
          ) {
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
          const lines = buffer.split("\n");

          // Keep last incomplete line in buffer
          buffer = lines.pop() || "";

          // Process complete lines
          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const result = JSON.parse(line);
              resultMap.set(result.word, result.entries);

              // Update words with new results
              words.forEach((word) => {
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

              pendingUpdates++;

              // Only update UI every N results or when we have a complete sentence
              const sentenceEnds = findCompleteSentences();
              const hasNewSentence = sentenceEnds.some(end => end > lastCompleteSentenceEnd);
              
              if (pendingUpdates >= RENDER_BATCH_SIZE || hasNewSentence) {
                // Check for newly completed sentences
                for (const sentenceEnd of sentenceEnds) {
                  if (sentenceEnd > lastCompleteSentenceEnd) {
                    // We have a new complete sentence!
                    // Switch to heuristic mode if not already
                    if (!heuristicsStarted) {
                      heuristicsStarted = true;
                      setLoading(false);
                      setIsBlockingRecalc(true); // Use blocking for initial pass
                    }

                    // Find sentence start (after previous separator or beginning)
                    const sentenceStart = lastCompleteSentenceEnd + 1;

                    // Extract just this sentence
                    const sentenceWords = words.slice(
                      sentenceStart,
                      sentenceEnd + 1,
                    );

                    // Run heuristics on this complete sentence
                    // Priority 1: High confidence structural
                    applySumHeuristic(sentenceWords);
                    applyInfinitiveHeuristic(sentenceWords);
                    applyQueEtGuessing(sentenceWords);
                    
                    // Priority 2: Prepositions (structural)
                    applyPrepositionIdentification(sentenceWords);
                    applyPrepositionInference(sentenceWords);
                    applyPrepositionalGuessing(sentenceWords);
                    applyPrepositionalBracketGuessing(sentenceWords);
                    
                    // Priority 3: Structural relationships
                    applyGenitiveHeuristic(sentenceWords);
                    
                    // Priority 4: Agreement-based
                    applyAdjectiveAgreementInference(sentenceWords);
                    applyAdjectiveNounGuessing(sentenceWords);
                    applyAdjacentAgreementGuessing(sentenceWords);
                    applyParticipleBraceHeuristic(sentenceWords);
                    
                    // Priority 5: Sentence structure
                    applyNominativeChunkGuessing(sentenceWords);
                    applyAppositionHeuristic(sentenceWords);
                    
                    // Priority 6: Advanced patterns
                    applyParticipleModifierHeuristic(sentenceWords);
                    applyLinkingVerbHeuristic(sentenceWords);
                    applyComplementaryInfinitiveHeuristic(sentenceWords);
                    applyVocativeHeuristic(sentenceWords);
                    applyPurposeClauseHeuristic(sentenceWords);
                    applyComparativeHeuristic(sentenceWords);

                    lastCompleteSentenceEnd = sentenceEnd;
                  }
                }

                // Update UI (batched)
                setAnalyzerWords([...words]);
                pendingUpdates = 0;
              }
            } catch (e) {
              console.error("Failed to parse chunk:", line, e);
            }
          }
        }

        // Final update for any remaining results
        if (pendingUpdates > 0) {
          setAnalyzerWords([...words]);
        }

        // All words loaded - run full heuristics incrementally
        // Ensure we've switched to heuristic phase
        if (!heuristicsStarted) {
          setLoading(false);
          setIsBlockingRecalc(true); // Use blocking for initial pass
        }

        // Helper to apply heuristics and update UI
        const applyAndUpdate = async (applyFn: (words: SentenceWord[]) => void) => {
          applyFn(words);
          setAnalyzerWords([...words]);
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for visual feedback
        };

        // Apply all heuristics incrementally
        await applyAndUpdate(applySumHeuristic);
        await applyAndUpdate(applyInfinitiveHeuristic);
        await applyAndUpdate(applyQueEtGuessing);
        
        // Priority 2: Prepositions (structural)
        await applyAndUpdate(applyPrepositionIdentification);
        await applyAndUpdate(applyPrepositionInference);
        await applyAndUpdate(applyPrepositionalGuessing);
        await applyAndUpdate(applyPrepositionalBracketGuessing);
        
        // Priority 3: Structural relationships
        await applyAndUpdate(applyGenitiveHeuristic);
        
        // Priority 4: Agreement-based
        await applyAndUpdate(applyAdjectiveAgreementInference);
        await applyAndUpdate(applyAdjectiveNounGuessing);
        await applyAndUpdate(applyAdjacentAgreementGuessing);
        await applyAndUpdate(applyParticipleBraceHeuristic);
        
        // Priority 5: Sentence structure
        await applyAndUpdate(applyNominativeChunkGuessing);
        await applyAndUpdate(applyAppositionHeuristic);
        
        // Priority 6: Advanced patterns
        await applyAndUpdate(applyRelativePronounHeuristic);
        await applyAndUpdate(applyDativeIndirectObjectHeuristic);
        await applyAndUpdate(applyAccusativeInfinitiveHeuristic);
        await applyAndUpdate(applyComparativeHeuristic);
        await applyAndUpdate(applyAblativeMeansHeuristic);
        await applyAndUpdate(applyAblativeAgentHeuristic);
        await applyAndUpdate(applyAblativeAbsoluteHeuristic);
        await applyAndUpdate(applyParticipleModifierHeuristic);
        await applyAndUpdate(applyLinkingVerbHeuristic);
        await applyAndUpdate(applyComplementaryInfinitiveHeuristic);
        await applyAndUpdate(applyVocativeHeuristic);
        await applyAndUpdate(applyPurposeClauseHeuristic);

        setIsBlockingRecalc(false); // End blocking for initial pass
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
      newWords.forEach((word) => {
        word.rejectedHeuristics?.clear();
      });

      // Rerun all heuristics (they will respect existing selections)
      // Priority 1: High confidence structural
      applySumHeuristic(newWords);
      applyInfinitiveHeuristic(newWords);
      applyQueEtGuessing(newWords);
      
      // Priority 2: Prepositions (structural)
      applyPrepositionIdentification(newWords);
      applyPrepositionInference(newWords);
      applyPrepositionalGuessing(newWords);
      applyPrepositionalBracketGuessing(newWords);
      
      // Priority 3: Structural relationships
      applyGenitiveHeuristic(newWords);
      
      // Priority 4: Agreement-based
      applyAdjectiveAgreementInference(newWords);
      applyAdjectiveNounGuessing(newWords);
      applyAdjacentAgreementGuessing(newWords);
      applyParticipleBraceHeuristic(newWords);
      
      // Priority 5: Sentence structure
      applyNominativeChunkGuessing(newWords);
      applyAppositionHeuristic(newWords);
      
      // Priority 6: Advanced patterns
      applyRelativePronounHeuristic(newWords);
      applyDativeIndirectObjectHeuristic(newWords);
      applyAccusativeInfinitiveHeuristic(newWords);
      applyComparativeHeuristic(newWords);
      applyAblativeMeansHeuristic(newWords);
      applyAblativeAgentHeuristic(newWords);
      applyAblativeAbsoluteHeuristic(newWords);
      applyParticipleModifierHeuristic(newWords);
      applyLinkingVerbHeuristic(newWords);
      applyComplementaryInfinitiveHeuristic(newWords);
      applyVocativeHeuristic(newWords);
      applyPurposeClauseHeuristic(newWords);

      setAnalyzerWords(newWords);
      setIsLoading(false);
    }, 10);
  };

  const reAnalyzeAllHeuristics = async () => {
    if (analyzerWords.length === 0) return;

    setIsBlockingRecalc(true);
    
    const newWords = [...analyzerWords];

    // Clear ALL heuristic inferences (but keep manual selections)
    newWords.forEach((word) => {
      // Remove all heuristic annotations (keep manual ones without heuristic field)
      word.annotations = word.annotations.filter((ann) => !ann.heuristic);
      
      // Clear ONLY heuristic word selections (keep manual selections)
      if (word.guessed || word.heuristic) {
        word.selectedEntry = undefined;
        word.selectedMorphology = undefined;
        word.guessed = false;
        word.heuristic = undefined;
      }
      // Note: If selectedEntry exists but guessed is false, it's manual - keep it
      
      // Clear guessed et prefixes (keep manual ones)
      if (word.etGuessed) {
        word.hasEtPrefix = false;
        word.etGuessed = false;
      }
      
      // Clear guessed adjacent connections (keep manual ones)
      if (word.adjacentGuessed) {
        word.hasAdjacentConnection = false;
        word.adjacentGuessed = false;
      }
      
      // Clear rejected heuristics so they can be re-attempted
      word.rejectedHeuristics?.clear();
    });

    // Show the cleared state briefly
    setAnalyzerWords([...newWords]);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Helper to apply heuristics and update UI
    const applyAndUpdate = async (applyFn: (words: SentenceWord[]) => void) => {
      applyFn(newWords);
      setAnalyzerWords([...newWords]);
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for visual feedback
    };

    // Now rerun all heuristics incrementally with UI updates
    // Priority 1: High confidence structural
    await applyAndUpdate(applySumHeuristic);
    await applyAndUpdate(applyInfinitiveHeuristic);
    await applyAndUpdate(applyQueEtGuessing);
    
    // Priority 2: Prepositions (structural)
    await applyAndUpdate(applyPrepositionIdentification);
    await applyAndUpdate(applyPrepositionInference);
    await applyAndUpdate(applyPrepositionalGuessing);
    await applyAndUpdate(applyPrepositionalBracketGuessing);
    
    // Priority 3: Structural relationships
    await applyAndUpdate(applyGenitiveHeuristic);
    
    // Priority 4: Agreement-based
    await applyAndUpdate(applyAdjectiveAgreementInference);
    await applyAndUpdate(applyAdjectiveNounGuessing);
    await applyAndUpdate(applyAdjacentAgreementGuessing);
    await applyAndUpdate(applyParticipleBraceHeuristic);
    
    // Priority 5: Sentence structure
    await applyAndUpdate(applyNominativeChunkGuessing);
    await applyAndUpdate(applyAppositionHeuristic);
    
    // Priority 6: Advanced patterns
    await applyAndUpdate(applyRelativePronounHeuristic);
    await applyAndUpdate(applyDativeIndirectObjectHeuristic);
    await applyAndUpdate(applyAccusativeInfinitiveHeuristic);
    await applyAndUpdate(applyComparativeHeuristic);
    await applyAndUpdate(applyAblativeMeansHeuristic);
    await applyAndUpdate(applyAblativeAgentHeuristic);
    await applyAndUpdate(applyAblativeAbsoluteHeuristic);
    await applyAndUpdate(applyParticipleModifierHeuristic);
    await applyAndUpdate(applyLinkingVerbHeuristic);
    await applyAndUpdate(applyComplementaryInfinitiveHeuristic);
    await applyAndUpdate(applyVocativeHeuristic);
    await applyAndUpdate(applyPurposeClauseHeuristic);

    setIsBlockingRecalc(false);
    
    toast.success("Re-analyzed all heuristics", {
      description: "All heuristic inferences cleared and recalculated. Manual selections preserved.",
      duration: 2500,
    });
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
        word.annotations = word.annotations.filter((ann) => !ann.guessed);

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
      // Priority 1: High confidence structural
      applySumHeuristic(rangeWords);
      applyInfinitiveHeuristic(rangeWords);
      applyQueEtGuessing(rangeWords);
      
      // Priority 2: Prepositions (structural)
      applyPrepositionIdentification(rangeWords);
      applyPrepositionInference(rangeWords);
      applyPrepositionalGuessing(rangeWords);
      applyPrepositionalBracketGuessing(rangeWords);
      
      // Priority 3: Structural relationships
      applyGenitiveHeuristic(rangeWords);
      
      // Priority 4: Agreement-based
      applyAdjectiveAgreementInference(rangeWords);
      applyAdjectiveNounGuessing(rangeWords);
      applyAdjacentAgreementGuessing(rangeWords);
      applyParticipleBraceHeuristic(rangeWords);
      
      // Priority 5: Sentence structure
      applyNominativeChunkGuessing(rangeWords);
      applyAppositionHeuristic(rangeWords);
      
      // Priority 6: Advanced patterns
      applyRelativePronounHeuristic(rangeWords);
      applyDativeIndirectObjectHeuristic(rangeWords);
      applyAccusativeInfinitiveHeuristic(rangeWords);
      applyComparativeHeuristic(rangeWords);
      applyAblativeMeansHeuristic(rangeWords);
      applyAblativeAgentHeuristic(rangeWords);
      applyAblativeAbsoluteHeuristic(rangeWords);
      applyParticipleModifierHeuristic(rangeWords);
      applyLinkingVerbHeuristic(rangeWords);
      applyComplementaryInfinitiveHeuristic(rangeWords);
      applyVocativeHeuristic(rangeWords);
      applyPurposeClauseHeuristic(rangeWords);

      // Put the processed range back into the main array
      for (let i = 0; i < rangeWords.length; i++) {
        newWords[startIndex + i] = rangeWords[i];
      }

      setAnalyzerWords(newWords);
      setIsLoading(false);
    }, 10);
  };

  const saveAnalysis = () => {
    if (analyzerWords.length === 0) {
      toast.error("No analysis to save");
      return;
    }

    // Create save data
    const saveData = {
      version: 1,
      timestamp: new Date().toISOString(),
      input: input,
      words: analyzerWords.map(word => ({
        ...word,
        // Convert Sets to Arrays for JSON serialization
        rejectedHeuristics: word.rejectedHeuristics 
          ? Array.from(word.rejectedHeuristics) 
          : undefined,
        dependentWords: word.dependentWords 
          ? Array.from(word.dependentWords) 
          : undefined,
      })),
    };

    // Generate filename from first 3 Latin words
    const latinWords = analyzerWords
      .filter(w => w.original && /^[a-zA-Z]+$/.test(w.original)) // Only Latin words
      .slice(0, 3)
      .map(w => w.original.toLowerCase());
    
    const filename = latinWords.length >= 3
      ? `${latinWords[0]}-${latinWords[1]}-${latinWords[2]}.json`
      : latinWords.length > 0
        ? `${latinWords.join('-')}-${Date.now()}.json`
        : `latnotate-${Date.now()}.json`;

    // Convert to JSON
    const json = JSON.stringify(saveData, null, 2);
    
    // Create blob and download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Analysis saved", {
      description: "Downloaded as JSON file",
      duration: 2000,
    });
  };

  const loadAnalysis = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const saveData = JSON.parse(json);

        // Validate version
        if (saveData.version !== 1) {
          toast.error("Unsupported save file version");
          return;
        }

        // Restore input
        setInput(saveData.input);

        // Restore words with Sets
        const restoredWords = saveData.words.map((word: SentenceWord & { rejectedHeuristics?: string[]; dependentWords?: number[] }) => ({
          ...word,
          rejectedHeuristics: word.rejectedHeuristics 
            ? new Set(word.rejectedHeuristics) 
            : new Set(),
          dependentWords: word.dependentWords 
            ? new Set(word.dependentWords) 
            : new Set(),
        }));

        setAnalyzerWords(restoredWords);
        setActiveTab("analyzer");

        toast.success("Analysis loaded", {
          description: `From ${new Date(saveData.timestamp).toLocaleString()}`,
          duration: 3000,
        });
      } catch (error) {
        console.error("Error loading file:", error);
        toast.error("Failed to load file", {
          description: "Invalid save file format",
        });
      }
    };

    reader.readAsText(file);
    
    // Reset input so same file can be loaded again
    event.target.value = '';
  };

  const selectDefinition = (entry: WordEntry, morphology?: string) => {
    if (selectedWordIndex === null) return;
    
    const selectedWord = analyzerWords[selectedWordIndex];
    
    // Check if selection actually changed
    if (
      selectedWord.selectedEntry === entry &&
      selectedWord.selectedMorphology === morphology
    ) {
      // No change, just close the dialog
      setSelectedWordIndex(null);
      return;
    }
    
    const newWords = [...analyzerWords];

    // Find sentence boundaries for this word
    const findSentenceBounds = (wordIndex: number): [number, number] => {
      let start = 0;
      let end = newWords.length - 1;
      
      // Helper to check if word is a sentence separator
      const isSeparator = (word: SentenceWord): boolean => {
        const cleaned = word.original.trim();
        return cleaned === "." || cleaned === "!" || cleaned === "?" ||
               cleaned === ";" || cleaned === ":" ||
               word.original === '"' || word.original === "'" ||
               word.original === "«" || word.original === "»";
      };
      
      // Find start (go backward to find previous separator)
      for (let i = wordIndex - 1; i >= 0; i--) {
        if (isSeparator(newWords[i])) {
          start = i + 1;
          break;
        }
      }
      
      // Find end (go forward to find next separator)
      for (let i = wordIndex + 1; i < newWords.length; i++) {
        if (isSeparator(newWords[i])) {
          end = i - 1;
          break;
        }
      }
      
      return [start, end];
    };
    
    const [sentenceStart, sentenceEnd] = findSentenceBounds(selectedWordIndex);
    
    // Clear all heuristic annotations and selections in the sentence
    for (let i = sentenceStart; i <= sentenceEnd; i++) {
      // Remove heuristic annotations
      newWords[i].annotations = newWords[i].annotations.filter((ann) => !ann.heuristic);
      
      // Clear heuristic word selections (keep manual selections)
      if (newWords[i].guessed || newWords[i].heuristic) {
        newWords[i].selectedEntry = undefined;
        newWords[i].selectedMorphology = undefined;
        newWords[i].guessed = false;
        newWords[i].heuristic = undefined;
      }
      
      // Clear heuristic et prefixes
      if (newWords[i].etGuessed) {
        newWords[i].hasEtPrefix = false;
        newWords[i].etGuessed = false;
      }
      
      // Clear heuristic adjacent connections
      if (newWords[i].adjacentGuessed) {
        newWords[i].hasAdjacentConnection = false;
        newWords[i].adjacentGuessed = false;
      }
    }

    // Apply the new selection
    newWords[selectedWordIndex] = {
      ...newWords[selectedWordIndex],
      selectedEntry: entry,
      selectedMorphology: morphology,
      guessed: false,
      heuristic: undefined,
    };

    // Update state immediately with the selection
    setAnalyzerWords(newWords);

    // Apply incremental heuristics to the whole sentence asynchronously
    setIsLoading(true);
    setTimeout(() => {
      // Get fresh state
      setAnalyzerWords((currentWords) => {
        const freshWords = [...currentWords];
        
        // Extract sentence
        const sentenceWords = freshWords.slice(sentenceStart, sentenceEnd + 1);
        
        // Apply all heuristics to the sentence (mutates in place)
        applyIncrementalHeuristics(sentenceWords, selectedWordIndex - sentenceStart);
        
        // Merge back into a new array
        for (let i = 0; i < sentenceWords.length; i++) {
          freshWords[sentenceStart + i] = sentenceWords[i];
        }
        
        return freshWords;
      });
      
      setIsLoading(false);
    }, 10);

    // Keep the word selected so user can see their selection
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
      if (
        word &&
        ((word.lookupResults && word.lookupResults.length > 0) || word.override)
      ) {
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

    entries.forEach((entry) => {
      if (
        entry.type === "Noun" ||
        entry.type === "Adjective" ||
        entry.type === "Participle"
      ) {
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
        const isPronoun = entry.morphologies.some((m) =>
          (m.analysis || m.line || "").includes("Pronoun"),
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
    const colors = cases.map((c) => {
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
    const gradientStops = colors
      .map((color, i) => {
        const start = i * step;
        const end = (i + 1) * step;
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(", ");

    return {
      "--split-gradient": `linear-gradient(to right, ${gradientStops})`,
    } as React.CSSProperties;
  };

  // Get case from morphology analysis
  const getCaseFromMorphology = (analysis: string): TagType | null => {
    if (analysis.includes("Nominative")) return "NOM";
    if (analysis.includes("Genitive")) return "GEN";
    if (analysis.includes("Dative")) return "DAT";
    if (analysis.includes("Accusative")) return "ACC";
    if (analysis.includes("Ablative")) return "ABL";
    if (analysis.includes("Vocative")) return "VOC";
    if (analysis.includes("Locative")) return "LOC";
    return null;
  };

  const getWordPadding = () => {
    // Always use consistent padding
    return "px-1";
  };

  const hasAdjacentConnection = (
    word: SentenceWord,
    wordIndex: number,
  ): { hasConnection: boolean; direction: 'forward' | 'backward' | 'none' } => {
    // Check if this word has an adjacent connection (annotation to next/previous word)
    for (const ann of word.annotations) {
      if (ann.type === "modify" || ann.type === "possession") {
        if (ann.targetIndex !== undefined) {
          if (Math.abs(ann.targetIndex - wordIndex) === 1) {
            const direction = ann.targetIndex > wordIndex ? 'forward' : 'backward';
            return { hasConnection: true, direction };
          }
        }
      }
    }
    return { hasConnection: false, direction: 'none' };
  };

  const getWordMargin = (word: SentenceWord, wordIndex: number) => {
    const tag = getTagFromWord(word);
    const hasGuess = word.guessed;
    const adjConn = hasAdjacentConnection(word, wordIndex);

    // Add extra margin if word has adjacent connection to create space for the line
    let baseMargin = "";
    if (adjConn.hasConnection) {
      // Only add margin on the side where the arrow goes
      // Forward: arrow goes to the right, add margin on right
      // Backward: arrow goes to the left, add margin on left  
      baseMargin = adjConn.direction === 'forward' ? "mr-4" : "ml-4";
    }

    // Add right margin to accommodate badges that extend beyond the word
    // If both tag and guess: "?" is at -right-6 from word edge
    if (tag && hasGuess) {
      if (adjConn.direction === 'forward') return "mr-8"; // Extra for arrow + badge
      if (adjConn.direction === 'backward') return "ml-4 mr-7"; // Left for arrow, right for badge
      return "mr-7"; // Just badge
    }
    // If only guess (no tag): "?" at -right-2
    else if (hasGuess) {
      if (adjConn.direction === 'forward') return "mr-5"; // Arrow + badge
      if (adjConn.direction === 'backward') return "ml-4 mr-3"; // Left for arrow, right for badge
      return "mr-3"; // Just badge
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

    if (tag) {
      return (
        <span
          className={`absolute -top-3 -right-2 text-[10px] font-bold px-1 rounded bg-white border shadow-sm ${TAG_CONFIG[tag].textClass} ${TAG_CONFIG[tag].borderClass}`}
        >
          {TAG_CONFIG[tag].label}
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

  // Pre-calculate bracket positions with guess and case information
  const openBrackets = new Map<number, string>(); // index -> case ("Accusative" or "Ablative")
  const closeBrackets = new Map<
    number,
    { guessed: boolean; wordIndex: number; annotationIndex: number; case: string }
  >();
  analyzerWords.forEach((w, wordIdx) => {
    w.annotations.forEach((a, annIdx) => {
      if (a.type === "preposition-scope") {
        // Determine the case by checking the preposition word
        let prepCase = "Ablative"; // default
        if (w.selectedMorphology) {
          if (w.selectedMorphology.includes("Accusative") || w.selectedMorphology.includes("ACC")) {
            prepCase = "Accusative";
          }
        }
        // Bracket starts BEFORE the preposition (index w.index)
        openBrackets.set(w.index, prepCase);
        // Bracket ends AFTER the target (index a.endIndex)
        if (a.endIndex !== undefined) {
          closeBrackets.set(a.endIndex, {
            guessed: a.guessed || false,
            wordIndex: wordIdx,
            annotationIndex: annIdx,
            case: prepCase,
          });
        }
      }
    });
  });

  const selectedWord =
    selectedWordIndex !== null ? analyzerWords[selectedWordIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Toaster position="top-right" richColors />
      <Navigation currentPage="analyzer" />
      <div className="flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* CSS for hover-only split colors */}
      <style jsx>{`
        .hover-split-color:hover {
          background: var(--split-gradient) !important;
        }
      `}</style>

      {/* Non-blocking Loading Spinner Badge */}
      {/* Loading Spinner for incremental heuristic calculation */}
      {isLoading && (
        <div className="fixed top-20 right-4 z-50 bg-white p-3 rounded-lg shadow-lg flex items-center gap-2 border border-blue-200">
          <Triangle
            height="24"
            width="24"
            color="#3b82f6"
            ariaLabel="triangle-loading"
          />
          <span className="text-sm font-medium text-gray-700">
            Calculating heuristics...
          </span>
        </div>
      )}

      {/* Blocking overlay for full recalculation */}
      {isBlockingRecalc && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            <Triangle
              height="80"
              width="80"
              color="#3b82f6"
              ariaLabel="triangle-loading"
            />
            <p className="text-sm font-medium text-gray-700">
              Analyzing sentence...
            </p>
          </div>
        </div>
      )}

      {/* Loading Spinner for dictionary lookups */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            <InfinitySpin
              width="200"
              color="#3b82f6"
              ariaLabel="infinity-spin-loading"
            />
            <p className="text-sm font-medium text-gray-700">
              Looking up words...
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
                  }`}
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

      <div className={`w-full ${analyzerWords.length > 0 && activeTab === "analyzer" ? "max-w-[98vw] mx-auto" : "max-w-6xl"} space-y-6`}>
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Latnotate
          </h1>
          <p className="text-slate-600 text-lg">
            Whitaker&apos;s Words Online
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="analyzer" className="text-base">
              Sentence Analyzer
            </TabsTrigger>
            <TabsTrigger value="dictionary" className="text-base">
              Dictionary
            </TabsTrigger>
            <TabsTrigger value="help" className="text-base">
              How to Use
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <Card className="shadow-lg border-t-4 border-t-blue-500">
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
                    className="w-full h-12 text-lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : activeTab === "dictionary" ? (
                      "Lookup Words"
                    ) : (
                      "Analyze Sentence"
                    )}
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
              <div className="flex gap-1 min-h-[600px]">
                {/* Left side: Sentence (50% or 100% if side pane hidden) */}
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>Analysis</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRelationshipLines(!showRelationshipLines)}
                          className="h-8 w-8 p-0"
                          title={showRelationshipLines ? "Hide relationship lines" : "Show relationship lines"}
                        >
                          {showRelationshipLines ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSidePane(!showSidePane)}
                          className="h-8 w-8 p-0"
                          title={showSidePane ? "Hide definitions panel" : "Show definitions panel"}
                        >
                          {showSidePane ? (
                            <PanelRightClose className="h-4 w-4" />
                          ) : (
                            <PanelRightOpen className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent
                    className="relative flex-1 overflow-y-auto"
                    ref={containerRef}
                  >
                    {/* SVG Overlay - Conditional based on toggle */}
                    {showRelationshipLines && (
                      <svg className="absolute inset-0 w-full h-full z-0 overflow-visible">
                        {lines}
                      </svg>
                    )}

                    <div
                      className={`flex flex-wrap gap-x-3 gap-y-10 text-xl leading-loose relative z-10 p-4 pt-6`}
                    >
                    {analyzerWords.map((word, i) => {
                      const hasResults =
                        word.lookupResults && word.lookupResults.length > 0;

                      return (
                        <TooltipProvider key={word.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex items-center ${getWordMargin(word, i)}`}
                              >
                                {/* "et" box for -que words */}
                                {word.hasEtPrefix && (
                                  <span className="inline-flex items-center mr-2 select-none">
                                    <span
                                      className="text-sm px-2 py-0.5 rounded border-2 border-dashed border-gray-400 text-gray-700 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                      style={{ fontStyle: "italic" }}
                                      title={word.etGuessed ? "Heuristically added 'et' for -que - click to remove" : "Click to remove 'et'"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newWords = [...analyzerWords];
                                        newWords[i].hasEtPrefix = false;
                                        newWords[i].etGuessed = false;
                                        setAnalyzerWords(newWords);
                                      }}
                                    >
                                      et
                                    </span>
                                  </span>
                                )}

                                {openBrackets.has(i) && (() => {
                                  const prepCase = openBrackets.get(i) || "Ablative";
                                  const isAccusative = prepCase === "Accusative";
                                  const bracketColor = isAccusative ? "text-blue-600 hover:text-blue-800" : "text-amber-600 hover:text-amber-800";
                                  
                                  // Find which preposition owns this bracket
                                  let prepIndex = -1;
                                  let annIndex = -1;
                                  analyzerWords.forEach((w, wIdx) => {
                                    w.annotations.forEach((ann, aIdx) => {
                                      if (ann.type === "preposition-scope" && w.index === i) {
                                        prepIndex = wIdx;
                                        annIndex = aIdx;
                                      }
                                    });
                                  });
                                  
                                  return (
                                    <span 
                                      className={`${bracketColor} font-bold text-2xl mr-1 select-none cursor-pointer`}
                                      title={`${isAccusative ? 'Accusative' : 'Ablative'} preposition - Click to remove bracket`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (prepIndex !== -1 && annIndex !== -1) {
                                          const newWords = [...analyzerWords];
                                          newWords[prepIndex].annotations.splice(annIndex, 1);
                                          setAnalyzerWords(newWords);
                                          toast.info("Removed preposition bracket", {
                                            duration: 1500,
                                          });
                                        }
                                      }}
                                    >
                                      [
                                    </span>
                                  );
                                })()}

                                <span
                                  ref={(el) => {
                                    wordRefs.current[i] = el;
                                  }}
                                  onClick={() =>
                                    (hasResults ||
                                      word.override ||
                                      interactionMode) &&
                                    handleWordInteraction(i)
                                  }
                                  onContextMenu={(e) =>
                                    hasResults && handleRightClick(e, i)
                                  }
                                  className={`
                                                                py-0.5 rounded cursor-pointer select-none inline-block
                                                                ${getWordStyle(word)}
                                                                ${interactionMode ? "hover:ring-2 ring-indigo-500" : ""}
                                                                ${selectedWordIndex === i ? "ring-4 ring-indigo-500 ring-offset-2" : ""}
                                                                ${getWordPadding()}
                                                            `}
                                  style={
                                    !word.selectedEntry && word.lookupResults
                                      ? getSplitColorStyle(
                                          getPossibleCases(word.lookupResults),
                                        )
                                      : undefined
                                  }
                                >
                                  {renderWordText(word)}
                                  {renderBadge(word, i)}
                                </span>

                                {closeBrackets.has(i) &&
                                  (() => {
                                    const bracketInfo = closeBrackets.get(i)!;
                                    const isAccusative = bracketInfo.case === "Accusative";
                                    const bracketColor = isAccusative ? "text-blue-600 hover:text-blue-800" : "text-amber-600 hover:text-amber-800";
                                    
                                    return (
                                      <span className="inline-flex items-center ml-1 select-none">
                                        <span 
                                          className={`${bracketColor} font-bold text-2xl cursor-pointer`}
                                          title={`${isAccusative ? 'Accusative' : 'Ablative'} preposition - Click to remove bracket`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newWords = [...analyzerWords];
                                            newWords[bracketInfo.wordIndex].annotations.splice(
                                              bracketInfo.annotationIndex,
                                              1
                                            );
                                            setAnalyzerWords(newWords);
                                            toast.info("Removed preposition bracket", {
                                              duration: 1500,
                                            });
                                          }}
                                        >
                                          ]
                                        </span>
                                        {bracketInfo.guessed && (
                                          <span
                                            className="text-[10px] font-bold px-1 ml-0.5 rounded bg-yellow-100 border border-yellow-400 text-yellow-800 shadow-sm cursor-pointer hover:bg-yellow-200"
                                            title="Heuristically guessed bracket - click for details"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setGuessConfirmation({
                                                wordIndex:
                                                  bracketInfo.wordIndex,
                                                annotationIndex:
                                                  bracketInfo.annotationIndex,
                                                type: "annotation",
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
                                <p className="font-bold text-red-600">
                                  Override
                                </p>
                                <p className="text-xs opacity-80">
                                  {word.override.type}
                                </p>
                                {word.override.morphology && (
                                  <p className="text-xs opacity-70">
                                    {word.override.morphology}
                                  </p>
                                )}
                                <p className="text-[10px] opacity-60 mt-1">
                                  Click badge to remove
                                </p>
                              </TooltipContent>
                            )}
                            {word.selectedEntry &&
                              !interactionMode &&
                              !word.override && (
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
                <CardContent className="pt-0 space-y-2">
                  <Button
                    onClick={rerunAllHeuristics}
                    disabled={isLoading || isBlockingRecalc}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isLoading || isBlockingRecalc ? "Processing..." : "Rerun All Heuristics"}
                  </Button>
                  <Button
                    onClick={reAnalyzeAllHeuristics}
                    disabled={isLoading || isBlockingRecalc}
                    variant="destructive"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isLoading || isBlockingRecalc ? "Processing..." : "Re-Analyze (Clear Inferences)"}
                  </Button>
                </CardContent>
              </Card>

                {showSidePane && (
                  <>
                    {/* Visual separator */}
                    <div className="w-1 bg-gradient-to-b from-blue-200 via-indigo-300 to-blue-200 rounded-full"></div>

                    {/* Right side: Definition Panel (50%) - sticky */}
                    {selectedWordIndex !== null && selectedWord ? (
                  <Card className="flex-1 flex flex-col sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex justify-between items-center text-lg">
                        <span>
                          Select definition for &quot;{selectedWord.original}&quot;
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedWordIndex(null)}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        Use ←→ to switch words, ↑↓ to navigate definitions, Enter to select
                      </p>
                    </CardHeader>
                    <CardContent className="overflow-y-auto flex-1 space-y-3 pt-4 pb-4">
                    {selectedWord.override ? (
                      <div className="bg-red-50 p-3 rounded-md border border-red-200">
                        <span className="font-bold text-red-900">Override:</span>
                        <span className="ml-2 text-red-800">{selectedWord.override.type}</span>
                        {selectedWord.override.morphology && (
                          <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border text-red-700">
                            {selectedWord.override.morphology}
                          </span>
                        )}
                        <p className="text-sm mt-2">This word is manually overridden.</p>
                      </div>
                    ) : (
                      selectedWord?.lookupResults
                        ?.slice()
                        .sort((a, b) => {
                          // Put selected entry first
                          const aIsSelected = selectedWord.selectedEntry === a;
                          const bIsSelected = selectedWord.selectedEntry === b;
                          if (aIsSelected && !bIsSelected) return -1;
                          if (!aIsSelected && bIsSelected) return 1;
                          
                          // Then guessed entries
                          const aIsGuessed = selectedWord.selectedEntry === a && selectedWord.guessed;
                          const bIsGuessed = selectedWord.selectedEntry === b && selectedWord.guessed;
                          if (aIsGuessed && !bIsGuessed) return -1;
                          if (!aIsGuessed && bIsGuessed) return 1;
                          
                          return 0;
                        })
                        .map((entry, i) => {
                          const isFocused = i === focusedEntryIndex;
                          const isSelected = selectedWord.selectedEntry === entry;
                          
                          return (
                            <div
                              key={i}
                              className={`border rounded-lg p-3 transition-all ${
                                isSelected
                                  ? "ring-2 ring-indigo-500 bg-indigo-50"
                                  : isFocused
                                    ? "ring-2 ring-blue-300 bg-blue-50"
                                    : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-base text-gray-900">
                                    {entry.forms.join(", ")}
                                  </h3>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {entry.type}
                                    </Badge>
                                    {entry.dictionaryCode && (
                                      <span className="text-xs font-mono text-gray-400">
                                        {entry.dictionaryCode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                                {entry.definition}
                              </p>

                              {entry.modifications && entry.modifications.length > 0 && (
                                <div className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                                  {entry.modifications.map((m, idx) => (
                                    <div key={idx}>
                                      <span className="font-semibold">{m.type}:</span> {m.form} - {m.definition}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="bg-gray-100 rounded-md p-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                  Select Morphology:
                                </p>
                                <div className="space-y-1.5">
                                  {sortMorphologies(
                                    entry.morphologies,
                                    selectedWord.guessed && selectedWord.selectedEntry === entry
                                      ? selectedWord.selectedMorphology
                                      : undefined,
                                  ).map((morph, mi) => {
                                    const isMorphSelected =
                                      selectedWord.selectedMorphology === morph.analysis &&
                                      selectedWord.selectedEntry === entry;

                                    const caseTag = getCaseFromMorphology(morph.analysis);
                                    const caseColor = caseTag && TAG_CONFIG[caseTag];

                                    return (
                                      <button
                                        key={mi}
                                        onClick={() => selectDefinition(entry, morph.analysis)}
                                        className={`w-full text-left px-2 py-1.5 rounded transition-all text-xs flex justify-between items-center ${
                                          isMorphSelected
                                            ? `${caseColor?.bgClass || "bg-indigo-600"} ${caseColor?.textClass || "text-white"} font-semibold`
                                            : `bg-white hover:bg-gray-50 border ${caseColor?.borderClass || "border-gray-200"} hover:border-indigo-300 text-gray-800`
                                        }`}
                                      >
                                        <span className="font-medium">{morph.analysis}</span>
                                        <span className={`font-mono text-xs ${isMorphSelected ? caseColor?.textClass : "text-gray-400"}`}>
                                          {morph.stem}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {entry.morphologies.length === 0 && (
                                    <button
                                      className="w-full text-left px-2 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 transition-all text-xs font-medium text-gray-800"
                                      onClick={() => selectDefinition(entry)}
                                    >
                                      Generic / Immutable
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex-1 flex flex-col sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden">
                  <CardHeader>
                    <CardTitle>Definitions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center flex-1 text-center">
                    <div className="text-gray-400">
                      <p className="text-lg font-medium mb-2">Click a word to see definitions</p>
                      <p className="text-sm">Select words from the sentence to view their definitions and morphology</p>
                    </div>
                  </CardContent>
                </Card>
              )}
                  </>
                )}
            </div>
            )}
          </TabsContent>
          
          {/* Save/Load buttons - always visible at bottom */}
          {activeTab === "analyzer" && (
            <Card className="shadow-lg border-t-4 border-t-green-500 mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Save & Load</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={saveAnalysis}
                  disabled={analyzerWords.length === 0}
                  variant="outline"
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Analysis
                </Button>
                <div className="relative w-full">
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadAnalysis}
                    className="hidden"
                    id="load-analysis-input"
                  />
                  <Button
                    onClick={() => document.getElementById('load-analysis-input')?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Load Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <li>Words appear color-coded automatically</li>
                    <li>Click words to manually select forms if needed</li>
                    <li>Right-click to create manual connections</li>
                  </ol>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">General Usage</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Automatic:</strong> 30+ heuristics analyze structure automatically</p>
                    <p><strong>Manual Override:</strong> Click words to select forms, right-click for connections</p>
                    <p><strong>Smart Ordering:</strong> Heuristics run in priority order to minimize cascading errors</p>
                    <p><strong>Refinement:</strong> Use &quot;Rerun All Heuristics&quot; button to update analysis</p>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-lg mb-3">Advanced: Heuristics</h3>
                  <div className="space-y-2 text-xs">
                    <p><strong className="text-blue-600">Priority 1: Structural</strong> - &quot;sum&quot; forms, &quot;-que&quot; → &quot;et&quot;</p>
                    <p><strong className="text-blue-600">Priority 2: Prepositions</strong> - Identification, inference, object selection, brackets</p>
                    <p><strong className="text-blue-600">Priority 3: Relationships</strong> - Genitive possession</p>
                    <p><strong className="text-blue-600">Priority 4: Agreement</strong> - Adjective-noun, adjacent agreement, participle braces</p>
                    <p><strong className="text-blue-600">Priority 5: Sentence Structure</strong> - Nominative subjects, nominative chunks, apposition</p>
                    <p><strong className="text-blue-600">Priority 6: Advanced</strong> - Relative clauses, dative objects, accusative+infinitive, temporal clauses, comparatives, ablatives, participles, linking verbs, complementary infinitives, vocatives, purpose clauses</p>
                  </div>
                </section>
</CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Word Selection Dialog - shown when side pane is hidden */}
        {!showSidePane && selectedWordIndex !== null && selectedWord && (
          <Dialog
            open={true}
            onOpenChange={(open) => !open && setSelectedWordIndex(null)}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center pr-8">
                  <span>
                    Select definition for &quot;{selectedWord.original}&quot;
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Override Status */}
              {selectedWord?.override && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
                  <span className="font-bold text-red-900">Override:</span>
                  <span className="ml-2 text-red-800">
                    {selectedWord.override.type}
                  </span>
                  {selectedWord.override.morphology && (
                    <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border text-red-700">
                      {selectedWord.override.morphology}
                    </span>
                  )}
                </div>
              )}

              {/* Definitions */}
              {selectedWord?.lookupResults && (
                <div className="space-y-3">
                  {selectedWord.lookupResults
                    .slice()
                    .sort((a, b) => {
                      // Put selected entry first
                      const aIsSelected = selectedWord.selectedEntry === a;
                      const bIsSelected = selectedWord.selectedEntry === b;
                      if (aIsSelected && !bIsSelected) return -1;
                      if (!aIsSelected && bIsSelected) return 1;
                      
                      // Then guessed entries
                      const aIsGuessed = selectedWord.selectedEntry === a && selectedWord.guessed;
                      const bIsGuessed = selectedWord.selectedEntry === b && selectedWord.guessed;
                      if (aIsGuessed && !bIsGuessed) return -1;
                      if (!aIsGuessed && bIsGuessed) return 1;
                      
                      return 0;
                    })
                    .map((entry, i) => {
                      const isSelected = selectedWord.selectedEntry === entry;
                      const isFocused = i === focusedEntryIndex;

                      return (
                        <div
                          key={i}
                          className={`border rounded-lg p-3 transition-all ${
                            isSelected
                              ? "ring-2 ring-indigo-500 bg-indigo-50"
                              : isFocused
                              ? "ring-2 ring-blue-300 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-base text-gray-900">
                                {entry.forms.join(", ")}
                              </h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {entry.type}
                                </Badge>
                                {entry.dictionaryCode && (
                                  <span className="text-xs font-mono text-gray-400">
                                    {entry.dictionaryCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                            {entry.definition}
                          </p>

                          {entry.modifications && entry.modifications.length > 0 && (
                            <div className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                              {entry.modifications.map((m, idx) => (
                                <div key={idx}>
                                  <span className="font-semibold">{m.type}:</span> {m.form} - {m.definition}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="bg-gray-100 rounded-md p-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                              Select Morphology:
                            </p>
                            <div className="space-y-1.5">
                              {entry.morphologies.map((morph, mIdx) => (
                                <button
                                  key={mIdx}
                                  onClick={() => selectDefinition(entry, morph.analysis)}
                                  className={`w-full text-left px-3 py-2 rounded text-sm transition-all
                                    ${
                                      selectedWord.selectedEntry === entry &&
                                      selectedWord.selectedMorphology === morph.analysis
                                        ? "bg-indigo-500 text-white font-medium"
                                        : "bg-white hover:bg-gray-200 text-gray-700"
                                    }`}
                                >
                                  {morph.analysis}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* No results message */}
              {selectedWord &&
                (!selectedWord.lookupResults ||
                  selectedWord.lookupResults.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-lg">No definitions found</p>
                    <p className="text-sm mt-2">
                      This word might be misspelled or not in the dictionary
                    </p>
                  </div>
                )}
            </DialogContent>
          </Dialog>
        )}

        {/* Guess Confirmation Dialog (for annotations only) */}
        {guessConfirmation &&
          guessConfirmation.type === "selection" &&
          (() => {
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
              const word = newWords[wordIndex];
              
              // Build a rejection ID based on the heuristic text
              // The heuristic text describes what kind of guess it was
              let heuristicId = '';
              
              if (word.heuristic) {
                // Parse the heuristic text to determine the type
                const heuristicText = word.heuristic.toLowerCase();
                
                if (heuristicText.includes('nominative')) {
                  heuristicId = 'nominative-guess';
                } else if (heuristicText.includes('adjective') && heuristicText.includes('case')) {
                  heuristicId = 'adjective-case-guess';
                } else if (heuristicText.includes('object of')) {
                  heuristicId = `prep-object-${wordIndex}`;
                } else if (heuristicText.includes('subject of')) {
                  heuristicId = `subject-of-verb-${wordIndex}`;
                } else if (heuristicText.includes('ablative')) {
                  // More specific ablative patterns
                  if (heuristicText.includes('means')) {
                    heuristicId = `abl-means-${wordIndex}`;
                  } else if (heuristicText.includes('agent')) {
                    heuristicId = `abl-agent-${wordIndex}`;
                  } else {
                    heuristicId = `ablative-${wordIndex}`;
                  }
                } else {
                  // Generic fallback
                  heuristicId = `word-guess-${wordIndex}`;
                }
              } else {
                // No heuristic text, use generic ID
                heuristicId = `word-guess-${wordIndex}`;
              }
              
              // Add to rejected heuristics
              if (!word.rejectedHeuristics) {
                word.rejectedHeuristics = new Set();
              }
              word.rejectedHeuristics.add(heuristicId);
              
              // Clear the selection
              word.selectedEntry = undefined;
              word.selectedMorphology = undefined;
              word.guessed = false;
              word.heuristic = undefined;
              
              setAnalyzerWords(newWords);
              setGuessConfirmation(null);
            };

            const openSelection = () => {
              // Open definition selection dialog
              setSelectedWordIndex(wordIndex);
              setGuessConfirmation(null);
            };

            return (
              <Dialog
                open={true}
                onOpenChange={() => setGuessConfirmation(null)}
              >
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
                          <strong>Selected as:</strong>{" "}
                          {word.selectedEntry.type}
                          {word.selectedMorphology &&
                            ` (${word.selectedMorphology})`}
                        </p>
                      )}
                      {word.heuristic && (
                        <p className="text-sm text-orange-800 mt-2">
                          <strong>Reasoning:</strong> {word.heuristic}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      Is this interpretation correct?
                    </p>
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

        {guessConfirmation &&
          guessConfirmation.type === "annotation" &&
          (() => {
            const { wordIndex, annotationIndex } = guessConfirmation;
            const word = analyzerWords[wordIndex];

            const confirmGuess = () => {
              const newWords = [...analyzerWords];
              if (annotationIndex !== undefined) {
                newWords[wordIndex].annotations[annotationIndex].guessed =
                  false;
              }
              setAnalyzerWords(newWords);
              setGuessConfirmation(null);
            };

            const revokeGuess = () => {
              const newWords = [...analyzerWords];
              if (annotationIndex !== undefined) {
                const annotation = newWords[wordIndex].annotations[annotationIndex];
                
                // Build heuristic ID based on annotation type
                let heuristicId = '';
                if (annotation.type === 'modify' && annotation.targetIndex !== undefined) {
                  heuristicId = `modify-${annotation.targetIndex}`;
                } else if (annotation.type === 'possession' && annotation.targetIndex !== undefined) {
                  heuristicId = `possession-${annotation.targetIndex}`;
                } else if (annotation.type === 'preposition-scope' && annotation.endIndex !== undefined) {
                  heuristicId = `preposition-scope-${annotation.endIndex}`;
                }
                
                // Add to rejected heuristics if we have an ID
                if (heuristicId) {
                  if (!newWords[wordIndex].rejectedHeuristics) {
                    newWords[wordIndex].rejectedHeuristics = new Set();
                  }
                  newWords[wordIndex].rejectedHeuristics!.add(heuristicId);
                }
                
                // Remove the annotation
                newWords[wordIndex].annotations.splice(annotationIndex, 1);
              }
              setAnalyzerWords(newWords);
              setGuessConfirmation(null);
            };

            return (
              <Dialog
                open={true}
                onOpenChange={() => setGuessConfirmation(null)}
              >
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Heuristic Connection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {annotationIndex !== undefined &&
                      word.annotations[annotationIndex] && (
                        <>
                          <div className="bg-orange-50 p-3 rounded border border-orange-200">
                            <p className="text-sm text-orange-900">
                              <strong>From:</strong> {word.original}
                            </p>
                            {word.annotations[annotationIndex].heuristic && (
                              <p className="text-sm text-orange-800 mt-2">
                                <strong>Reasoning:</strong>{" "}
                                {word.annotations[annotationIndex].heuristic}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            Is this connection correct?
                          </p>
                        </>
                      )}
                    <div className="flex gap-2">
                      <Button
                        onClick={confirmGuess}
                        variant="default"
                        className="flex-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        onClick={revokeGuess}
                        variant="destructive"
                        className="flex-1"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}

        {/* Override Dialog */}
        {overrideDialogIndex !== null &&
          (() => {
            const word = analyzerWords[overrideDialogIndex];

            return (
              <Dialog
                open={true}
                onOpenChange={() => {
                  setOverrideDialogIndex(null);
                  setOverrideType("");
                  setOverrideMorphology("");
                }}
              >
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-red-600">
                      Override Word Type
                    </DialogTitle>
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
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Part of Speech *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Noun",
                          "Verb",
                          "Adjective",
                          "Adverb",
                          "Pronoun",
                          "Preposition",
                          "Conjunction",
                          "Interjection",
                        ].map((pos) => (
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Case
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "Nominative",
                                  "Genitive",
                                  "Dative",
                                  "Accusative",
                                  "Ablative",
                                  "Vocative",
                                  "Locative",
                                ].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[0] = c;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Number
                              </label>
                              <div className="flex gap-2">
                                {["Singular", "Plural"].map((n) => (
                                  <button
                                    key={n}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[1] = n;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Gender (optional)
                              </label>
                              <div className="flex gap-2">
                                {["Masculine", "Feminine", "Neuter"].map(
                                  (g) => (
                                    <button
                                      key={g}
                                      onClick={() => {
                                        const parts =
                                          overrideMorphology.split(" ");
                                        parts[2] = parts[2] === g ? "" : g;
                                        setOverrideMorphology(
                                          parts.filter((p) => p).join(" "),
                                        );
                                      }}
                                      className={`px-3 py-1 text-sm rounded border ${
                                        overrideMorphology.includes(g)
                                          ? "bg-indigo-600 text-white border-indigo-700"
                                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                      }`}
                                    >
                                      {g}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ADJECTIVE */}
                        {overrideType === "Adjective" && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Case
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "Nominative",
                                  "Genitive",
                                  "Dative",
                                  "Accusative",
                                  "Ablative",
                                  "Vocative",
                                ].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[0] = c;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Number
                              </label>
                              <div className="flex gap-2">
                                {["Singular", "Plural"].map((n) => (
                                  <button
                                    key={n}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[1] = n;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Gender
                              </label>
                              <div className="flex gap-2">
                                {["Masculine", "Feminine", "Neuter"].map(
                                  (g) => (
                                    <button
                                      key={g}
                                      onClick={() => {
                                        const parts =
                                          overrideMorphology.split(" ");
                                        parts[2] = g;
                                        setOverrideMorphology(
                                          parts.filter((p) => p).join(" "),
                                        );
                                      }}
                                      className={`px-3 py-1 text-sm rounded border ${
                                        overrideMorphology.includes(g)
                                          ? "bg-indigo-600 text-white border-indigo-700"
                                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                      }`}
                                    >
                                      {g}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* VERB */}
                        {overrideType === "Verb" && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Tense
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "Present",
                                  "Imperfect",
                                  "Future",
                                  "Perfect",
                                  "Pluperfect",
                                  "Future Perfect",
                                ].map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[0] = t;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Mood
                              </label>
                              <div className="flex gap-2">
                                {[
                                  "Indicative",
                                  "Subjunctive",
                                  "Imperative",
                                ].map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[1] = m;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Voice
                              </label>
                              <div className="flex gap-2">
                                {["Active", "Passive"].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[2] = v;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Person
                              </label>
                              <div className="flex gap-2">
                                {["1st", "2nd", "3rd"].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[3] = p;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                              <label className="block text-sm font-semibold mb-2 text-gray-700">
                                Number
                              </label>
                              <div className="flex gap-2">
                                {["Singular", "Plural"].map((n) => (
                                  <button
                                    key={n}
                                    onClick={() => {
                                      const parts =
                                        overrideMorphology.split(" ");
                                      parts[4] = n;
                                      setOverrideMorphology(
                                        parts.filter((p) => p).join(" "),
                                      );
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
                        {[
                          "Adverb",
                          "Preposition",
                          "Conjunction",
                          "Interjection",
                          "Pronoun",
                        ].includes(overrideType) && (
                          <p className="text-sm text-gray-500 italic">
                            No additional morphology needed for{" "}
                            {overrideType.toLowerCase()}s.
                          </p>
                        )}

                        {/* Current Selection Display */}
                        {overrideMorphology && (
                          <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <p className="text-xs text-blue-900">
                              <strong>Selected:</strong> {overrideType}{" "}
                              {overrideMorphology}
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
                              morphology:
                                overrideMorphology.trim() || undefined,
                              manual: true,
                            };
                            // Clear existing selections when overriding
                            newWords[overrideDialogIndex].selectedEntry =
                              undefined;
                            newWords[overrideDialogIndex].selectedMorphology =
                              undefined;
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
            const isPrep =
              tag === "PREP" || word.selectedEntry?.type === "Other";
            const isGen = tag === "GEN";
            // Check if word has -que tackon
            const hasQueTackon = word.selectedEntry?.modifications?.some(
              (m) => m.type === "Tackon" && m.form.toLowerCase() === "que",
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
                  <ArrowRight className="w-3 h-3" /> Select Range to Rerun
                  Heuristics
                </button>
                <div className="border-t my-1"></div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={() => {
                    // Clear ALL connections for this word (both incoming and outgoing)
                    const newWords = [...analyzerWords];
                    const targetIdx = contextMenu.wordIndex;
                    
                    // 1. Clear outgoing connections (annotations FROM this word)
                    const removedAnnotations = newWords[targetIdx].annotations;
                    removedAnnotations.forEach(ann => {
                      if (ann.type === "preposition-scope") {
                        toast.info("Removing preposition bracket", {
                          duration: 1500,
                        });
                      }
                    });
                    newWords[targetIdx].annotations = [];
                    
                    // 2. Clear incoming connections (annotations TO this word)
                    newWords.forEach((word, idx) => {
                      if (idx === targetIdx) return;

                      // Filter out annotations that target this word
                      word.annotations = word.annotations.filter((ann) => {
                        if (ann.type === "preposition-scope") {
                          // Remove if this word is in the bracket range
                          if (ann.targetIndex !== undefined && ann.endIndex !== undefined) {
                            const inRange = targetIdx >= ann.targetIndex && targetIdx <= ann.endIndex;
                            if (inRange) {
                              toast.info("Removing preposition bracket", {
                                duration: 1500,
                              });
                              return false;
                            }
                          }
                          // Also check if it's exactly the start or end
                          return ann.targetIndex !== targetIdx && ann.endIndex !== targetIdx;
                        }
                        if (
                          ann.type === "modify" ||
                          ann.type === "possession"
                        ) {
                          return ann.targetIndex !== targetIdx;
                        }
                        return true;
                      });
                    });

                    setAnalyzerWords(newWords);
                    setContextMenu(null);
                  }}
                >
                  <X className="w-3 h-3" /> Clear All Connections
                </button>
              </div>
            );
          })()}
      </div>
      </div>
    </div>
  );
}
