import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HelpTab() {
  return (
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
  );
}
