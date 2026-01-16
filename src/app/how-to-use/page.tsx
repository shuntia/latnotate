"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, BookOpen, Sparkles, Layers, MousePointer, Zap } from "lucide-react";

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Home className="h-5 w-5" />
            Latnotate
          </Link>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost">Analyzer</Button>
            </Link>
            <Link href="/dictionary">
              <Button variant="ghost">Dictionary</Button>
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-slate-800">How to Use Latnotate</h1>
        
        <div className="space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>Type a Latin sentence in the text box</li>
                <li>Click &quot;Analyze Sentence&quot;</li>
                <li>Words appear color-coded automatically</li>
                <li>Click words to manually select forms if needed</li>
                <li>Right-click to create manual connections</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5 text-green-500" />
                General Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-700">
              <div>
                <p className="font-semibold text-slate-800">Automatic Analysis</p>
                <p className="text-sm">30+ heuristics analyze structure automatically</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Manual Override</p>
                <p className="text-sm">Click words to select forms, right-click for connections</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Smart Ordering</p>
                <p className="text-sm">Heuristics run in priority order to minimize cascading errors</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Refinement</p>
                <p className="text-sm">Use &quot;Rerun All Heuristics&quot; button to update analysis</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                Color Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                  <span>Nominative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
                  <span>Genitive</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
                  <span>Dative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
                  <span>Accusative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                  <span>Ablative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-200 border border-purple-400 rounded"></div>
                  <span>Vocative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-pink-200 border border-pink-400 rounded"></div>
                  <span>Verb</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-200 border border-slate-400 rounded"></div>
                  <span>Other</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Advanced: Heuristics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-blue-600">Priority 1: Structural</p>
                <p className="text-xs">&quot;sum&quot; forms, &quot;-que&quot; → &quot;et&quot;</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">Priority 2: Prepositions</p>
                <p className="text-xs">Identification, inference, object selection, brackets</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">Priority 3: Relationships</p>
                <p className="text-xs">Genitive possession</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">Priority 4: Agreement</p>
                <p className="text-xs">Adjective-noun, adjacent agreement, participle braces</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">Priority 5: Sentence Structure</p>
                <p className="text-xs">Nominative subjects, nominative chunks, apposition</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">Priority 6: Advanced</p>
                <p className="text-xs">Relative clauses, dative objects, accusative+infinitive, temporal clauses, comparatives, ablatives, participles, linking verbs, complementary infinitives, vocatives, purpose clauses</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-500" />
                Dictionary Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-slate-700">
              <p className="text-sm">Look up individual Latin words using Whitaker&apos;s Words dictionary</p>
              <p className="text-sm">Results show all possible forms with detailed morphological information</p>
              <p className="text-sm">Navigate to the Dictionary tab to use standalone lookup</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
