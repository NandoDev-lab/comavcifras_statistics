import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const EVENT_TYPES = ["chord_view", "search", "favorite_add"] as const;
export type UsageEventType = (typeof EVENT_TYPES)[number];

type UsageEvent = {
  type: UsageEventType;
  userId: string;
  songId?: string;
  songTitle?: string;
  artist?: string;
  query?: string;
  createdAt: Timestamp;
};

type Range = "7d" | "30d" | "90d";

export type AnalyticsResponse = {
  range: Range;
  generatedAt: string;
  truncated: boolean;
  summary: {
    totalViews: number;
    searches: number;
    favorites: number;
    activeUsers: number;
  };
  daily: { date: string; views: number; searches: number; favorites: number }[];
  topSongs: { id: string; title: string; artist: string; views: number }[];
  recentEvents: {
    id: string;
    type: UsageEventType;
    songTitle: string;
    artist: string;
    createdAt: string;
  }[];
};

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
const MAX_EVENTS = 20_000;

export function isRange(value: string | null): value is Range {
  return value === "7d" || value === "30d" || value === "90d";
}

export function isDashboardAuthorized(request: Request): boolean {
  const expected = process.env.ANALYTICS_DASHBOARD_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!expected || !authorization?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expectedBuffer = Buffer.from(expected);
  return (
    provided.length === expectedBuffer.length &&
    timingSafeEqual(provided, expectedBuffer)
  );
}

export async function getAnalytics(range: Range): Promise<AnalyticsResponse> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - RANGE_DAYS[range] + 1);
  start.setHours(0, 0, 0, 0);

  const snapshot = await getAdminFirestore()
    .collection("usage_events")
    .where("createdAt", ">=", Timestamp.fromDate(start))
    .where("createdAt", "<=", Timestamp.fromDate(now))
    .orderBy("createdAt", "desc")
    .limit(MAX_EVENTS + 1)
    .get();

  const dailyMap = new Map<string, { views: number; searches: number; favorites: number }>();
  for (let offset = 0; offset < RANGE_DAYS[range]; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    dailyMap.set(day.toISOString().slice(0, 10), { views: 0, searches: 0, favorites: 0 });
  }

  const songMap = new Map<string, { id: string; title: string; artist: string; views: number }>();
  const activeUsers = new Set<string>();
  const summary = { totalViews: 0, searches: 0, favorites: 0, activeUsers: 0 };
  const events = snapshot.docs.slice(0, MAX_EVENTS).map((document) => ({
    id: document.id,
    ...document.data(),
  })) as (UsageEvent & { id: string })[];

  for (const event of events) {
    activeUsers.add(event.userId);
    const date = event.createdAt.toDate().toISOString().slice(0, 10);
    const day = dailyMap.get(date);

    if (event.type === "chord_view") {
      summary.totalViews += 1;
      if (day) day.views += 1;
      const id = event.songId ?? "unknown";
      const existing = songMap.get(id);
      if (existing) {
        existing.views += 1;
      } else {
        songMap.set(id, {
          id,
          title: event.songTitle ?? "Cifra sem título",
          artist: event.artist ?? "Artista desconhecido",
          views: 1,
        });
      }
    } else if (event.type === "search") {
      summary.searches += 1;
      if (day) day.searches += 1;
    } else if (event.type === "favorite_add") {
      summary.favorites += 1;
      if (day) day.favorites += 1;
    }
  }
  summary.activeUsers = activeUsers.size;

  return {
    range,
    generatedAt: now.toISOString(),
    truncated: snapshot.size > MAX_EVENTS,
    summary,
    daily: Array.from(dailyMap, ([date, counts]) => ({ date, ...counts })),
    topSongs: Array.from(songMap.values())
      .sort((left, right) => right.views - left.views)
      .slice(0, 5),
    recentEvents: events.slice(0, 8).map((event) => ({
      id: event.id,
      type: event.type,
      songTitle: event.songTitle ?? event.query ?? "—",
      artist: event.artist ?? "",
      createdAt: event.createdAt.toDate().toISOString(),
    })),
  };
}
