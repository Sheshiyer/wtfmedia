-- Production mappings for the YouTube decision workspace.
-- Provider observations remain nullable; derived values are calculated at read time.

ALTER TABLE youtube_channel_daily_metrics ADD COLUMN average_view_percentage REAL;
ALTER TABLE youtube_channel_daily_metrics ADD COLUMN thumbnail_impressions INTEGER;
ALTER TABLE youtube_channel_daily_metrics ADD COLUMN thumbnail_impressions_ctr REAL;

ALTER TABLE youtube_video_daily_metrics ADD COLUMN average_view_percentage REAL;
ALTER TABLE youtube_video_daily_metrics ADD COLUMN thumbnail_impressions INTEGER;
ALTER TABLE youtube_video_daily_metrics ADD COLUMN thumbnail_impressions_ctr REAL;

CREATE TABLE youtube_audience_daily_metrics (
  channel_id TEXT NOT NULL REFERENCES youtube_analytics_channels(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  subscribed_status TEXT NOT NULL CHECK (subscribed_status IN ('SUBSCRIBED', 'UNSUBSCRIBED')),
  views INTEGER,
  watch_minutes REAL,
  average_view_duration_seconds REAL,
  average_view_percentage REAL,
  raw_analytics_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(raw_analytics_json)),
  observed_at TEXT NOT NULL,
  PRIMARY KEY(channel_id, metric_date, subscribed_status)
);

CREATE TABLE youtube_video_retention_points (
  video_id TEXT NOT NULL REFERENCES youtube_analytics_videos(id) ON DELETE CASCADE,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  elapsed_video_time_ratio REAL NOT NULL,
  audience_watch_ratio REAL,
  relative_retention_performance REAL,
  started_watching INTEGER,
  stopped_watching INTEGER,
  total_segment_impressions INTEGER,
  observed_at TEXT NOT NULL,
  PRIMARY KEY(video_id, range_start, range_end, elapsed_video_time_ratio)
);

CREATE TABLE youtube_reporting_jobs (
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id) ON DELETE CASCADE,
  report_type_id TEXT NOT NULL,
  google_job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'failed', 'deleted')),
  last_checked_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(connection_id, report_type_id),
  UNIQUE(google_job_id)
);

CREATE TABLE youtube_reporting_imports (
  google_report_id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id) ON DELETE CASCADE,
  report_type_id TEXT NOT NULL,
  report_start_time TEXT,
  report_end_time TEXT,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL
);

CREATE INDEX youtube_retention_lookup
  ON youtube_video_retention_points(video_id, range_start, range_end, elapsed_video_time_ratio);

CREATE INDEX youtube_reporting_imports_connection
  ON youtube_reporting_imports(connection_id, report_type_id, imported_at);
