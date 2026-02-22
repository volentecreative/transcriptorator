"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatTimestamp } from "@/lib/utils";
import type { SearchResult } from "@/types/database";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_segments_fulltext", {
      query_text: q.trim(),
      match_count: 50,
      filter_chamber: null,
      filter_date_from: null,
      filter_date_to: null,
    });

    setLoading(false);
    setSearched(true);

    if (error) {
      setError(error.message);
    } else {
      setResults(data ?? []);
    }
  };

  // Run search on initial load if URL has ?q=
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);

    // Update URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });

    // Debounced search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(value);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Search Transcripts</h1>
        <p className="text-sm text-muted-foreground">
          Full-text search across all Minnesota legislative session transcripts
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search transcripts…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>

      {/* States */}
      {loading && (
        <div className="text-sm text-muted-foreground text-center py-12">
          Searching…
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive text-center py-12">
          Error: {error}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-12">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={`${result.session_id}-${result.segment_id}`}
                className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant={result.chamber === "house" ? "house" : "senate"}
                    className="text-xs"
                  >
                    {result.chamber.charAt(0).toUpperCase() +
                      result.chamber.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(result.session_date)}
                  </span>
                  <span className="text-xs font-medium flex-1 truncate">
                    {result.session_title}
                  </span>
                </div>

                <p className="text-sm leading-relaxed mb-3">{result.text}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    at {formatTimestamp(result.start_seconds)}
                  </span>
                  <Link
                    href={`/session/${result.session_slug}?t=${result.start_seconds}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Jump to →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground text-center py-12">
          Loading…
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
