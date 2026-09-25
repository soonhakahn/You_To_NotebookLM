import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseYouTubeUrl, parseInput, extractVideoIdsFromPlaylistHtml, chunk,
  fetchPlaylistItems, isImportable, toWatchUrl,
} from '../app/lib.js';

test('parseYouTubeUrl: 다양한 동영상 URL 형식', () => {
  const id = 'dQw4w9WgXcQ';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}&t=30s`,
    `https://youtu.be/${id}?si=abc`,
    `youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://music.youtube.com/watch?v=${id}`,
  ]) {
    assert.deepEqual(parseYouTubeUrl(url), { videoId: id, playlistId: null }, url);
  }
});

test('parseYouTubeUrl: 재생목록 URL', () => {
  assert.deepEqual(
    parseYouTubeUrl('https://www.youtube.com/playlist?list=PLabc123XYZ'),
    { videoId: null, playlistId: 'PLabc123XYZ' },
  );
  assert.deepEqual(
    parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123XYZ&index=3'),
    { videoId: 'dQw4w9WgXcQ', playlistId: 'PLabc123XYZ' },
  );
});

test('parseYouTubeUrl: 믹스(RD)·다른 사이트·잘못된 ID는 무시', () => {
  assert.deepEqual(
    parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ'),
    { videoId: 'dQw4w9WgXcQ', playlistId: null },
  );
  assert.equal(parseYouTubeUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseYouTubeUrl('https://notyoutube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseYouTubeUrl('https://www.youtube.com/watch?v=short'), null);
  assert.equal(parseYouTubeUrl('그냥 텍스트'), null);
});

test('parseInput: 공유 텍스트에서 링크 여러 개 추출·중복 제거', () => {
  const text = `이 재생목록 보세요 https://youtube.com/playlist?list=PLaaa111
    https://youtu.be/dQw4w9WgXcQ
    https://www.youtube.com/watch?v=dQw4w9WgXcQ
    https://www.youtube.com/watch?v=9bZkp7q19f0&list=PLaaa111`;
  assert.deepEqual(parseInput(text), {
    playlistIds: ['PLaaa111'],
    videoIds: ['dQw4w9WgXcQ'],
  });
});

test('extractVideoIdsFromPlaylistHtml: 순서 유지·중복 제거', () => {
  const html = [
    '"watchEndpoint":{"videoId":"AAAAAAAAAAA","playlistId":"PLx","index":0,',
    '"watchEndpoint":{"videoId":"AAAAAAAAAAA","playlistId":"PLx","params":"x"}',
    '"watchEndpoint":{"videoId":"BBBBBBBBBBB","playlistId":"PLx","index":1,',
    '"videoId":"CCCCCCCCCCC"',
  ].join('');
  assert.deepEqual(extractVideoIdsFromPlaylistHtml(html), ['AAAAAAAAAAA', 'BBBBBBBBBBB']);
});

test('chunk', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([1, 2], 0), [[1], [2]]);
  assert.deepEqual(chunk([], 10), []);
});

test('fetchPlaylistItems: 페이지네이션', async () => {
  const pages = {
    '': { items: [{ contentDetails: { videoId: 'AAAAAAAAAAA' }, snippet: { title: 'A', position: 0 }, status: { privacyStatus: 'public' } }], nextPageToken: 'p2' },
    p2: { items: [{ contentDetails: { videoId: 'BBBBBBBBBBB' }, snippet: { title: 'Private video', position: 1 }, status: { privacyStatus: 'private' } }] },
  };
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    const token = new URL(url).searchParams.get('pageToken') ?? '';
    return { ok: true, json: async () => pages[token] };
  };
  const items = await fetchPlaylistItems('PLx', 'KEY', fakeFetch);
  assert.equal(calls.length, 2);
  assert.deepEqual(items.map((i) => i.videoId), ['AAAAAAAAAAA', 'BBBBBBBBBBB']);
  assert.deepEqual(items.filter(isImportable).map((i) => i.videoId), ['AAAAAAAAAAA']);
});

test('fetchPlaylistItems: API 오류 메시지 전달', async () => {
  const fakeFetch = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'API key not valid' } }) });
  await assert.rejects(fetchPlaylistItems('PLx', 'BAD', fakeFetch), /API key not valid/);
});

test('toWatchUrl', () => {
  assert.equal(toWatchUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});
