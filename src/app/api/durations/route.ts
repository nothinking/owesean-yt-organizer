import { NextRequest, NextResponse } from "next/server";
import { parseIsoDuration } from "@/lib/utils";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos";

export async function GET(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json(
      { error: "ids parameter required" },
      { status: 400 }
    );
  }

  const ids = idsParam.split(",").filter(Boolean).slice(0, 50);
  const durations: Record<string, number> = {};

  const url = `${YOUTUBE_API_URL}?part=contentDetails&id=${ids.join(",")}&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    return NextResponse.json(
      { error: "YouTube API request failed" },
      { status: 502 }
    );
  }

  const data = await res.json();

  for (const item of data.items ?? []) {
    const seconds = parseIsoDuration(item.contentDetails.duration);
    if (seconds > 0) {
      durations[item.id] = seconds;
    }
  }

  return NextResponse.json({ durations });
}
