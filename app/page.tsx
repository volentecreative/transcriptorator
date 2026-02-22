"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDate, formatDuration } from "@/lib/utils";
import type { Session } from "@/types/database";

export default function SessionListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [chamber, setChamber] = useState<"all" | "house" | "senate">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function fetchSessions() {
      let query = supabase
        .from("sessions")
        .select("*")
        .eq("is_published", true)
        .order("session_date", { ascending: false });

      const { data, error } = await query;

      if (error) {
        setError(error.message);
      } else {
        setSessions(data ?? []);
      }
      setLoading(false);
    }

    fetchSessions();
  }, []);

  const filtered = sessions.filter((s) => {
    if (chamber !== "all" && s.chamber !== chamber) return false;
    if (dateFrom && s.session_date < dateFrom) return false;
    if (dateTo && s.session_date > dateTo) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Legislative Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Minnesota House &amp; Senate hearings, floor sessions, and press
          conferences
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-secondary/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Chamber</label>
          <Select
            value={chamber}
            onChange={(e) =>
              setChamber(e.target.value as "all" | "house" | "senate")
            }
            className="w-32"
          >
            <option value="all">All</option>
            <option value="house">House</option>
            <option value="senate">Senate</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(chamber !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setChamber("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="text-sm text-muted-foreground py-12 text-center">
          Loading sessions…
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-12 text-center">
          Error: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground py-12 text-center">
          No sessions match the current filters.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="border rounded-lg divide-y overflow-hidden">
          {filtered.map((session) => (
            <Link
              key={session.id}
              href={`/session/${session.slug}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/50 transition-colors group"
            >
              {/* Date */}
              <span className="text-sm text-muted-foreground w-28 shrink-0">
                {formatDate(session.session_date)}
              </span>

              {/* Chamber badge */}
              <Badge
                variant={session.chamber === "house" ? "house" : "senate"}
                className="w-16 justify-center shrink-0 capitalize"
              >
                {session.chamber}
              </Badge>

              {/* Title */}
              <span className="text-sm font-medium flex-1 group-hover:text-primary transition-colors line-clamp-1">
                {session.title}
              </span>

              {/* Duration */}
              {session.duration_seconds > 0 && (
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatDuration(session.duration_seconds)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {filtered.length} of {sessions.length} sessions
        </p>
      )}
    </div>
  );
}
