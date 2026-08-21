export const publicEpisodeFixture = {
  video_id: "fixture-episode-001",
  title: "Synthetic public episode",
  url: "https://example.test/watch/fixture-episode-001",
  duration: 1200,
  view_count: 25000,
  uploader: "WTF Media",
} as const;

export const publicSourceFixture = {
  n: 1,
  video_id: publicEpisodeFixture.video_id,
  title: publicEpisodeFixture.title,
  score: 0.98,
  t: 120,
  time: "02:00",
  url: publicEpisodeFixture.url,
} as const;
