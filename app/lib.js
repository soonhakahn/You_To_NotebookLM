// YouTube URL 파싱 · 재생목록 조회 로직 (브라우저/Node 공용 ES 모듈)

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{2,64}$/;
const YT_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

// 재생목록 페이지 HTML에서 영상 ID를 순서대로 뽑는 정규식.
// 아이폰 단축어의 "텍스트 일치" 동작에도 같은 패턴을 사용한다.
export const PLAYLIST_HTML_PATTERN =
  /"videoId":"([A-Za-z0-9_-]{11})","playlistId":"[^"]+","index":\d+/g;

export function toWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function safeUrl(raw) {
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s);
  } catch {
    return null;
  }
}

// URL 하나를 { videoId, playlistId } 로 해석한다. YouTube URL이 아니면 null.
export function parseYouTubeUrl(raw) {
  const url = safeUrl(raw);
  if (!url || !YT_HOSTS.test(url.hostname)) return null;

  let videoId = null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host.endsWith('youtu.be')) {
    videoId = parts[0] ?? null;
  } else if (url.searchParams.has('v')) {
    videoId = url.searchParams.get('v');
  } else if (['shorts', 'live', 'embed', 'v'].includes(parts[0])) {
    videoId = parts[1] ?? null;
  }
  if (videoId && !VIDEO_ID.test(videoId)) videoId = null;

  let playlistId = url.searchParams.get('list');
  // RD... 는 자동 생성 믹스(Mix)라 API/페이지로 목록을 가져올 수 없다.
  if (playlistId && (!PLAYLIST_ID.test(playlistId) || playlistId.startsWith('RD'))) {
    playlistId = null;
  }

  if (!videoId && !playlistId) return null;
  return { videoId, playlistId };
}

// 여러 줄/공백으로 구분된 텍스트에서 YouTube 링크를 모두 찾아낸다.
export function parseInput(text) {
  const tokens = String(text).split(/[\s,<>"']+/).filter(Boolean);
  const playlistIds = [];
  const videoIds = [];
  for (const token of tokens) {
    const parsed = parseYouTubeUrl(token);
    if (!parsed) continue;
    if (parsed.playlistId) {
      if (!playlistIds.includes(parsed.playlistId)) playlistIds.push(parsed.playlistId);
    } else if (parsed.videoId && !videoIds.includes(parsed.videoId)) {
      videoIds.push(parsed.videoId);
    }
  }
  return { playlistIds, videoIds };
}

export function extractVideoIdsFromPlaylistHtml(html) {
  const ids = [];
  for (const m of String(html).matchAll(PLAYLIST_HTML_PATTERN)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

export function chunk(items, size) {
  const n = Math.max(1, Math.floor(size) || 1);
  const out = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

const API = 'https://www.googleapis.com/youtube/v3';

async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

// YouTube Data API v3로 재생목록의 모든 영상을 가져온다(페이지네이션 포함).
// 반환: [{ videoId, title, privacy, position }]
export async function fetchPlaylistItems(playlistId, apiKey, fetchFn = fetch) {
  const items = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,status',
      maxResults: '50',
      playlistId,
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await getJson(fetchFn, `${API}/playlistItems?${params}`);
    for (const it of data.items ?? []) {
      const videoId = it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      items.push({
        videoId,
        title: it.snippet?.title ?? '',
        privacy: it.status?.privacyStatus ?? 'unknown',
        position: it.snippet?.position ?? items.length,
      });
    }
    pageToken = data.nextPageToken ?? '';
  } while (pageToken);
  return items;
}

export async function fetchPlaylistTitle(playlistId, apiKey, fetchFn = fetch) {
  const params = new URLSearchParams({ part: 'snippet', id: playlistId, key: apiKey });
  const data = await getJson(fetchFn, `${API}/playlists?${params}`);
  return data.items?.[0]?.snippet?.title ?? '';
}

// NotebookLM은 공개 영상만 소스로 가져올 수 있으므로 비공개/삭제 영상은 제외한다.
export function isImportable(item) {
  if (item.privacy === 'private' || item.privacy === 'privacyStatusUnspecified') return false;
  if (item.title === 'Private video' || item.title === 'Deleted video') return false;
  return true;
}
