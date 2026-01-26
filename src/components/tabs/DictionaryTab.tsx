import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WordEntry, LookupResult } from "@/lib/types";

interface DictionaryTabProps {
  dictionaryResult: LookupResult | null;
}

export function DictionaryTab({ dictionaryResult }: DictionaryTabProps) {
  if (!dictionaryResult || !dictionaryResult.results) {
    return null;
  }

  return (
    <div className="space-y-4">
      {dictionaryResult.results.flatMap((r) => r.entries).length === 0 ? (
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
  );
}
