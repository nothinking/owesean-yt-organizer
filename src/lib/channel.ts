/**
 * YouTube 채널 URL에서 채널 ID를 추출하거나,
 * @handle / 커스텀 URL에서 채널 ID를 resolve한다.
 */

// 채널 URL 패턴들:
// https://www.youtube.com/channel/UC... → 바로 channel ID
// https://www.youtube.com/@handle → HTML 파싱 필요
// https://www.youtube.com/c/CustomName → HTML 파싱 필요
// https://youtube.com/@handle → 위와 동일
const CHANNEL_ID_REGEX = /youtube\.com\/channel\/(UC[\w-]{22})/;
const HANDLE_REGEX = /youtube\.com\/(@[\w.-]+)/;
const CUSTOM_URL_REGEX = /youtube\.com\/c\/([\w.-]+)/;

export interface ResolvedChannel {
  channelId: string;
  title: string;
  thumbnailUrl: string;
}

/**
 * URL 문자열에서 채널 ID를 직접 추출 (channel/UC... 형태만)
 */
export function extractChannelId(url: string): string | null {
  const match = url.match(CHANNEL_ID_REGEX);
  return match ? match[1] : null;
}

/**
 * YouTube 페이지를 fetch해서 채널 ID와 메타데이터를 가져온다.
 * @handle, /c/ 형태의 URL도 지원.
 */
export async function resolveChannelFromUrl(
  url: string
): Promise<ResolvedChannel> {
  // 1. 직접 channel ID가 있는 경우
  const directId = extractChannelId(url);
  if (directId) {
    // RSS에서 채널 정보 가져오기
    const info = await fetchChannelInfoFromRss(directId);
    return info;
  }

  // 2. @handle 또는 /c/ URL인 경우 → 페이지에서 channel ID 추출
  const normalizedUrl = url.startsWith("http") ? url : `https://www.youtube.com/${url}`;

  const res = await fetch(normalizedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YTOrganizer/1.0)",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`채널 페이지를 불러올 수 없습니다 (${res.status})`);
  }

  const html = await res.text();

  // <meta> 태그나 <link> 태그에서 channel ID 추출
  const channelIdMatch =
    html.match(/channel_id=(UC[\w-]{22})/) ||
    html.match(/"channelId":"(UC[\w-]{22})"/) ||
    html.match(/\/channel\/(UC[\w-]{22})/);

  if (!channelIdMatch) {
    throw new Error("채널 ID를 찾을 수 없습니다. URL을 확인해주세요.");
  }

  const channelId = channelIdMatch[1];
  const info = await fetchChannelInfoFromRss(channelId);
  return info;
}

/**
 * RSS 피드에서 채널 기본 정보(이름) 가져오기
 */
async function fetchChannelInfoFromRss(
  channelId: string
): Promise<ResolvedChannel> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(rssUrl);

  if (!res.ok) {
    return {
      channelId,
      title: channelId,
      thumbnailUrl: "",
    };
  }

  const xml = await res.text();

  // 채널 제목 추출
  const titleMatch = xml.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : channelId;

  // 채널 썸네일은 RSS에 없으므로 기본 YouTube 아바타 URL 사용
  const thumbnailUrl = `https://www.youtube.com/channel/${channelId}`;

  return { channelId, title, thumbnailUrl: "" };
}
