"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { formatTimestamp } from "@/lib/utils";
import type { TranscriptSegment } from "@/types/database";

// YouTube IFrame API type declarations
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement | string,
        options: YTPlayerOptions
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerOptions {
  videoId: string;
  width?: number | string;
  height?: number | string;
  playerVars?: {
    autoplay?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    start?: number;
  };
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
}

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
}

interface SessionPlayerProps {
  videoId: string;
  segments: TranscriptSegment[];
  initialTime?: number;
}

export function SessionPlayer({
  videoId,
  segments,
  initialTime = 0,
}: SessionPlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeSegmentSeq, setActiveSegmentSeq] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initPlayer = useCallback(() => {
    if (!playerContainerRef.current) return;

    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        ...(initialTime > 0 ? { start: initialTime } : {}),
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
        },
      },
    });
  }, [videoId, initialTime]);

  useEffect(() => {
    // If the API is already loaded, init immediately
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Otherwise, set the callback and load the script
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      initPlayer();
    };

    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [initPlayer]);

  // Poll current time every second when player is ready
  useEffect(() => {
    if (!playerReady) return;

    const interval = setInterval(() => {
      const currentTime = playerRef.current?.getCurrentTime() ?? 0;

      // Binary search for active segment
      let lo = 0;
      let hi = segments.length - 1;
      let active: TranscriptSegment | null = null;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const seg = segments[mid];
        if (currentTime >= seg.start_seconds && currentTime < seg.end_seconds) {
          active = seg;
          break;
        } else if (currentTime < seg.start_seconds) {
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }

      if (active && active.seq !== activeSegmentSeq) {
        setActiveSegmentSeq(active.seq);

        // Auto-scroll transcript unless user is scrolling
        if (!userScrollingRef.current) {
          const el = segmentRefs.current.get(active.seq);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerReady, segments, activeSegmentSeq]);

  // Detect user scrolling in transcript
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;

    const handleScroll = () => {
      userScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false;
      }, 3000);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSegmentClick = (startSeconds: number) => {
    playerRef.current?.seekTo(startSeconds, true);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* YouTube Player */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <div
            ref={playerContainerRef}
            className="absolute inset-0 bg-black rounded-lg overflow-hidden"
          />
        </div>
        {!playerReady && (
          <p className="text-xs text-muted-foreground mt-2">
            Loading player…
          </p>
        )}
      </div>

      {/* Transcript Panel */}
      <div
        ref={transcriptRef}
        className="w-96 shrink-0 overflow-y-auto border rounded-lg bg-white"
      >
        <div className="sticky top-0 bg-secondary/80 backdrop-blur-sm px-3 py-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">
            TRANSCRIPT — {segments.length} segments
          </p>
        </div>
        {segments.map((segment) => (
          <div
            key={segment.seq}
            ref={(el) => {
              if (el) segmentRefs.current.set(segment.seq, el);
            }}
            onClick={() => handleSegmentClick(segment.start_seconds)}
            className={`flex gap-3 px-3 py-2 cursor-pointer border-b border-border/50 hover:bg-accent transition-colors ${
              activeSegmentSeq === segment.seq
                ? "bg-yellow-50 border-l-2 border-l-yellow-400"
                : ""
            }`}
          >
            <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5 font-mono">
              {formatTimestamp(segment.start_seconds)}
            </span>
            <p className="text-sm leading-relaxed">{segment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
