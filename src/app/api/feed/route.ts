import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchVideosFromRss } from "@/lib/rss";

// GET: 채널 ID 목록의 RSS 피드에서 최신 영상 가져오기
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelIds = request.nextUrl.searchParams.get("channelIds");
  if (!channelIds) {
    return NextResponse.json(
      { error: "channelIds required" },
      { status: 400 }
    );
  }

  const ids = channelIds.split(",").filter(Boolean);

  try {
    const videos = await fetchVideosFromRss(ids);
    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error("Failed to fetch feed:", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}
