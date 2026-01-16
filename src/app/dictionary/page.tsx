"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle } from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import { LookupResult } from "@/lib/types";
import { POS_FULL_NAMES } from "@/lib/constants/tags";
import { sortMorphologies } from "@/lib/utils/morphology";

export default function DictionaryPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupWord = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: input.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LookupResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navigation currentPage="dictionary" />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Dictionary Lookup</h1>
          <p className="text-slate-600">Look up Latin words using Whitaker &apos;s Words</p>
        </div>

        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Enter Latin Word
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    lookupWord();
                  }
                }}
                placeholder="e.g., puella, amare, esse..."
                className="flex-1"
                rows={1}
              />
              <Button 
                onClick={lookupWord} 
                disabled={loading || !input.trim()}
                size="lg"
                className="px-8"
              >
                {loading ? (
                  <InfinitySpin width="20" color="#ffffff" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Look Up
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && result.results && result.results.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>
                Results {result.results.length > 1 ? `for ${result.results.length} words` : `for "${result.results[0].word}"`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.results.flatMap(r => r.entries).length === 0 ? (
                <p className="text-slate-600 italic">No results found</p>
              ) : (
                <div className="space-y-6">
                  {result.results.map((res, resIdx) => (
                    <div key={resIdx} className="space-y-4">
                      {result.results.length > 1 && (
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">
                          {res.word}
                        </h3>
                      )}
                      {res.entries.map((entry, idx) => {
                        const forms = entry.forms || [];
                        const sortedMorphologies = sortMorphologies(entry.morphologies);

                        return (
                          <div key={idx} className="border-l-4 border-l-blue-500 pl-4 bg-white rounded-r">
                            <div className="flex items-start gap-3 mb-2">
                              <Badge variant="outline" className="bg-blue-50 border-blue-300">
                                {POS_FULL_NAMES[entry.type] || entry.type}
                              </Badge>
                              {forms.length > 0 && (
                                <span className="text-sm font-semibold text-slate-700">{forms.join(", ")}</span>
                              )}
                            </div>

                            <p className="text-slate-800 mb-3">{entry.definition}</p>

                            {sortedMorphologies.length > 0 && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium mb-2">
                                  Show {sortedMorphologies.length} form{sortedMorphologies.length > 1 ? "s" : ""}
                                </summary>
                                <div className="space-y-1 ml-4 mt-2">
                                  {sortedMorphologies.map((morph, mIdx) => (
                                    <div key={mIdx} className="text-slate-600 font-mono text-xs">
                                      {morph.analysis} ({morph.stem})
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
