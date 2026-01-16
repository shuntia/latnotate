import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, FileText } from "lucide-react";

export function Navigation({ currentPage }: { currentPage?: string }) {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors">
            <Home className="h-5 w-5" />
            <span>Latnotate</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant={currentPage === "analyzer" ? "default" : "ghost"} size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Analyzer
              </Button>
            </Link>
            <Link href="/dictionary">
              <Button variant={currentPage === "dictionary" ? "default" : "ghost"} size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Dictionary
              </Button>
            </Link>
            <Link href="/how-to-use">
              <Button variant={currentPage === "how-to-use" ? "default" : "ghost"} size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                How to Use
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
