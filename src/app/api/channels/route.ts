import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveChannelFromUrl } from "@/lib/channel";
import { addChannel, removeChannel, getUserChannels } from "@/lib/storage";

async function getUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email || null;
}

// GET: 유저의 채널 목록 조회
export async function GET() {
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const channels = await getUserChannels(email);
    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error("Failed to get channels:", error?.message);
    return NextResponse.json(
      { error: "Failed to get channels" },
      { status: 500 }
    );
  }
}

// POST: 채널 추가 / 삭제
export async function POST(request: NextRequest) {
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add") {
      const { url } = body;
      if (!url?.trim()) {
        return NextResponse.json(
          { error: "URL is required" },
          { status: 400 }
        );
      }

      // URL에서 채널 정보 resolve
      const resolved = await resolveChannelFromUrl(url.trim());
      const channel = await addChannel(email, resolved);
      return NextResponse.json({ channel });
    }

    if (action === "remove") {
      const { channelId } = body;
      if (!channelId) {
        return NextResponse.json(
          { error: "channelId is required" },
          { status: 400 }
        );
      }
      await removeChannel(email, channelId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Channel operation failed:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Operation failed" },
      { status: 500 }
    );
  }
}
