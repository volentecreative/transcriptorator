import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SessionPlayer } from "./SessionPlayer";
import { formatDate, formatDuration } from "@/lib/utils";
import type { TranscriptSegment } from "@/types/database";

// Force dynamic rendering so Next.js never serves a stale fetch-cache response
// for this route. Without this, the App Router's per-request fetch cache can
// return Supabase data from a previous render even when the CDN reports a MISS.
export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
  searchParams: { t?: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("title, session_date, chamber")
    .eq("slug", params.slug)
    .single();

  if (!session) return { title: "Session Not Found" };

  return {
    title: `${session.title} — Transcriptorator`,
  };
}

export default async function SessionPage({ params, searchParams }: PageProps) {
  const supabase = createClient();

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  // Fetch ALL transcript segments using pagination.
  //
  // PostgREST (the layer Supabase exposes) silently caps every query at 1000
  // rows by default. A plain .select() with no .limit() therefore returns at
  // most 1000 rows even when thousands of segments exist. We page through in
  // 1 000-row batches until we get a partial page, which signals the end.
  const PAGE_SIZE = 1000;
  const allSegments: TranscriptSegment[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transcript_segments")
      .select("id, session_id, seq, start_seconds, end_seconds, text")
      .eq("session_id", session.id)
      .order("seq", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      allSegments.push(...(data as TranscriptSegment[]));
    }

    // A page shorter than PAGE_SIZE means we've reached the last page.
    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  const initialTime = searchParams.t ? parseInt(searchParams.t, 10) : 0;

  return (
    <div>
      {/* Breadcrumb + session info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Sessions
            </Link>
          </div>
          <h1 className="text-xl font-semibold leading-tight">{session.title}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <Badge variant={session.chamber === "house" ? "house" : "senate"}>
              {session.chamber.charAt(0).toUpperCase() + session.chamber.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(session.session_date)}
            </span>
            {session.duration_seconds > 0 && (
              <span className="text-sm text-muted-foreground">
                {formatDuration(session.duration_seconds)}
              </span>
            )}
            {allSegments.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {allSegments.length} transcript segments
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Player + Transcript */}
      <SessionPlayer
        videoId={session.youtube_video_id}
        segments={allSegments}
        initialTime={initialTime}
      />
    </div>
  );
}
