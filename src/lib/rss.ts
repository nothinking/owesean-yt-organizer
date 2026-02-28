import { Video } from "@/types";

/**
 * YouTube RSS 피드에서 채널의 최신 영상 목록을 가져온다.
 * API 쿼터를 전혀 사용하지 않음.
 * 채널당 최대 15개 영상 반환 (YouTube RSS 제한).
 */
export async function fetchVideosFromRss(
  channelIds: string[]
): Promise<Video[]> {
  const allVideos: Video[] = [];

  // 병렬로 RSS 피드 가져오기 (10개씩 배치)
  const batchSize = 10;
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const promises = batch.map((channelId) =>
      fetchSingleChannelRss(channelId)
    );
    const results = await Promise.all(promises);
    allVideos.push(...results.flat());
  }

  // 최신순 정렬
  return allVideos.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

async function fetchSingleChannelRss(channelId: string): Promise<Video[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, { next: { revalidate: 600 } }); // 10분 캐시

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssXml(xml, channelId);
  } catch {
    return [];
  }
}

function parseRssXml(xml: string, channelId: string): Video[] {
  const videos: Video[] = [];

  // 채널 제목 추출
  const channelTitleMatch = xml.match(/<title>(.*?)<\/title>/);
  const channelTitle = channelTitleMatch ? channelTitleMatch[1] : "";

  // 각 <entry> 블록 파싱
  const entries = xml.split("<entry>").slice(1); // 첫 번째는 <feed> 헤더

  for (const entry of entries) {
    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
    const descMatch = entry.match(
      /<media:description>([\s\S]*?)<\/media:description>/
    );
    const thumbMatch = entry.match(/<media:thumbnail url="(.*?)"/);

    if (!videoIdMatch) continue;

    const videoId = videoIdMatch[1];

    videos.push({
      id: videoId,
      title: decodeXmlEntities(titleMatch?.[1] || ""),
      description: decodeXmlEntities(descMatch?.[1] || "").slice(0, 200),
      thumbnailUrl:
        thumbMatch?.[1] || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      channelId,
      channelTitle: decodeXmlEntities(channelTitle),
      publishedAt: publishedMatch?.[1] || "",
    });
  }

  return videos;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
