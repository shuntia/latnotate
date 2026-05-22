"use client";

import { useState, useCallback } from "react";
import { WordEntry } from "@/lib/types";
import { Navigation } from "@/components/Navigation";

type LookupMap = Record<string, WordEntry[]>;

function stripPunctuation(word: string): string {
  return word.replace(/[^a-zA-ZāēīōūÆæœŒ]/gi, "").toLowerCase();
}

function tokenize(text: string): string[] {
  return text.split(/(\s+|[,\.;:!?\-—""''()\[\]{}])/);
}

export default function SimplePage() {
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState<string[] | null>(null);
  const [lookupMap, setLookupMap] = useState<LookupMap>({});
  const [fetching, setFetching] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [edited, setEdited] = useState(true);

  const handleLookup = useCallback(async () => {
    if (!input.trim()) return;
    const raw = tokenize(input);
    const words = Array.from(
      new Set(raw.map((t) => stripPunctuation(t)).filter((w) => w.length > 0))
    );

    setFetching(true);
    setEdited(false);
    setTokens(raw);
    setSidebarOpen(false);
    setSelectedWord(null);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      const map: LookupMap = {};
      for (const r of data.results ?? []) {
        map[r.word.toLowerCase()] = r.entries;
      }
      setLookupMap(map);
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  }, [input]);

  const handleWordClick = (token: string) => {
    const key = stripPunctuation(token);
    if (!key || !lookupMap[key]) return;
    setSelectedWord(key);
    setSidebarOpen(true);
  };

  const entries = selectedWord ? (lookupMap[selectedWord] ?? []) : [];

  return (
    <div className="fixed inset-0 z-10 bg-white flex flex-col">
      <Navigation currentPage="simple" />

      {/* Fetching notice — top right */}
      {fetching && (
        <div className="fixed top-4 right-4 z-50 bg-white text-gray-500 text-sm px-4 py-2 shadow rounded">
          Fetching data…
        </div>
      )}

      {/* Body row: content + sidebar */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable text area */}
          <div className="flex-1 overflow-y-auto px-16 py-10">
            {tokens === null || edited ? (
              <textarea
                className="w-full h-full min-h-64 resize-none outline-none border-none ring-0 focus:ring-0 text-gray-800 text-2xl leading-relaxed bg-transparent placeholder-gray-300 p-0"
                placeholder="Paste Latin text here…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setEdited(true);
                }}
              />
            ) : (
              <div className="text-gray-800 text-2xl leading-relaxed break-words whitespace-pre-wrap">
                {tokens.map((token, i) => {
                  const key = stripPunctuation(token);
                  const hasEntry = key.length > 0 && !!lookupMap[key];
                  const isSelected = key === selectedWord;
                  return (
                    <span
                      key={i}
                      onClick={hasEntry ? () => handleWordClick(token) : undefined}
                      className={
                        hasEntry
                          ? `cursor-pointer transition-colors ${isSelected ? "text-black font-medium" : "hover:text-black"}`
                          : undefined
                      }
                    >
                      {token}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex justify-end items-center px-16 py-4 gap-3">
            {!edited && tokens !== null && (
              <button
                onClick={() => { setEdited(true); setTokens(null); }}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                Edit
              </button>
            )}
            {(edited || tokens === null) && (
              <button
                onClick={handleLookup}
                disabled={fetching || !input.trim()}
                className="px-5 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Look up
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 shrink-0 border-l border-gray-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">{selectedWord}</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
              {entries.length === 0 ? (
                <p className="text-sm text-gray-400">No results.</p>
              ) : (
                entries.map((entry, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      {entry.type}
                      {entry.type === "Noun" && (entry as any).gender
                        ? ` · ${(entry as any).gender}`
                        : ""}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {entry.forms.join(", ")}
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {entry.definition}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
