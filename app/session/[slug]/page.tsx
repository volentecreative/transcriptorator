import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SessionPlayer } from "./SessionPlayer";
import { formatDate, formatDuration } from "@/lib/utils";

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

  // Fetch transcript segments
  const { data: segments, error: segmentsError } = await supabase
    .from("transcript_segments")
    .select("id, session_id, seq, start_seconds, end_seconds, text")
    .eq("session_id", session.id)
    .order("seq", { ascending: true });

  if (segmentsError) {
    throw new Error(segmentsError.message);
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
            {segments && (
              <span className="text-sm text-muted-foreground">
                {segments.length} transcript segments
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Player + Transcript */}
      <SessionPlayer
        videoId={session.youtube_video_id}
        segments={segments ?? []}
        initialTime={initialTime}
      />
    </div>
  );
}
