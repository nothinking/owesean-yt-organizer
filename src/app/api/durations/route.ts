import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ error: "ids parameter required" }, { status: 400 });
  }

  const ids = idsParam.split(",").filter(Boolean).slice(0, 50);
  const durations: Record<string, number> = {};

  // Process in batches of 10
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          const html = await res.text();
          const match = html.match(/"lengthSeconds":"(\d+)"/);
          if (match) {
            return { id, seconds: parseInt(match[1], 10) };
          }
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        durations[result.value.id] = result.value.seconds;
      }
    }
  }

  return NextResponse.json({ durations });
}
