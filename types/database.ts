export interface Session {
  id: string;
  slug: string;
  youtube_video_id: string;
  youtube_url: string;
  chamber: "house" | "senate";
  title: string;
  session_date: string;
  duration_seconds: number;
  is_published: boolean;
  chamber_verified: boolean;
}

export interface TranscriptSegment {
  id: number;
  session_id: string;
  seq: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface SearchResult {
  session_id: string;
  session_slug: string;
  session_title: string;
  session_date: string;
  chamber: "house" | "senate";
  segment_id: number;
  seq: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}
