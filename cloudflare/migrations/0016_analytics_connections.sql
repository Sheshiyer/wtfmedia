-- Read-only Google provider connections and stored analytics reports.
-- Credentials are application-encrypted before they reach D1.

CREATE TABLE analytics_oauth_transactions (
  id TEXT PRIMARY KEY CHECK (id GLOB 'aotx_*'),
  state_sha256 TEXT NOT NULL UNIQUE CHECK (length(state_sha256) = 64),
  operator_id INTEGER NOT NULL REFERENCES operators(id),
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'ga4')),
  return_path TEXT NOT NULL DEFAULT '/beta/settings/workspace/analytics'
    CHECK (return_path = '/beta/settings/workspace/analytics'),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX analytics_oauth_transactions_expiry
  ON analytics_oauth_transactions(expires_at, consumed_at);

CREATE TABLE analytics_provider_connections (
  id TEXT PRIMARY KEY CHECK (id GLOB 'acon_*'),
  environment TEXT NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'ga4')),
  status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (status IN ('not_configured', 'connected', 'syncing', 'stale', 'expired', 'revoked', 'missing_scope', 'provider_error')),
  encrypted_credentials TEXT,
  encryption_key_version TEXT,
  granted_scopes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(granted_scopes_json)),
  token_expires_at TEXT,
  connected_by_operator_id INTEGER REFERENCES operators(id),
  selected_resource_id TEXT,
  selected_resource_name TEXT,
  reporting_timezone TEXT,
  last_validated_at TEXT,
  last_attempted_refresh_at TEXT,
  last_successful_refresh_at TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(environment, provider),
  CHECK (
    (status IN ('not_configured', 'revoked') AND encrypted_credentials IS NULL)
    OR (status NOT IN ('not_configured', 'revoked') AND encrypted_credentials IS NOT NULL)
  )
);

CREATE INDEX analytics_provider_connections_status
  ON analytics_provider_connections(environment, status);

CREATE TABLE youtube_analytics_channels (
  id TEXT PRIMARY KEY CHECK (id GLOB 'ytch_*'),
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id),
  youtube_channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  reporting_timezone TEXT NOT NULL DEFAULT 'UTC',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(connection_id, youtube_channel_id)
);

CREATE TABLE youtube_analytics_videos (
  id TEXT PRIMARY KEY CHECK (id GLOB 'ytvd_*'),
  channel_id TEXT NOT NULL REFERENCES youtube_analytics_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  thumbnail_url TEXT,
  content_type TEXT NOT NULL DEFAULT 'other'
    CHECK (content_type IN ('full_episode', 'short', 'teaser', 'clip', 'other')),
  raw_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(raw_metadata_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(channel_id, youtube_video_id)
);

CREATE TABLE youtube_channel_daily_metrics (
  channel_id TEXT NOT NULL REFERENCES youtube_analytics_channels(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  views INTEGER,
  watch_minutes REAL,
  average_view_duration_seconds REAL,
  likes INTEGER,
  comments_count INTEGER,
  shares INTEGER,
  subscribers_gained INTEGER,
  subscribers_lost INTEGER,
  raw_analytics_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(raw_analytics_json)),
  observed_at TEXT NOT NULL,
  PRIMARY KEY(channel_id, metric_date)
);

CREATE TABLE youtube_video_daily_metrics (
  video_id TEXT NOT NULL REFERENCES youtube_analytics_videos(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  views INTEGER,
  watch_minutes REAL,
  average_view_duration_seconds REAL,
  likes INTEGER,
  comments_count INTEGER,
  shares INTEGER,
  subscribers_gained INTEGER,
  subscribers_lost INTEGER,
  raw_analytics_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(raw_analytics_json)),
  observed_at TEXT NOT NULL,
  PRIMARY KEY(video_id, metric_date)
);

CREATE TABLE ga4_analytics_properties (
  id TEXT PRIMARY KEY CHECK (id GLOB 'ga4p_*'),
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id),
  ga4_property_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  reporting_timezone TEXT NOT NULL DEFAULT 'UTC',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(connection_id, ga4_property_id)
);

CREATE TABLE ga4_daily_metrics (
  property_id TEXT NOT NULL REFERENCES ga4_analytics_properties(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  traffic_source TEXT NOT NULL DEFAULT '(all)',
  users INTEGER,
  sessions INTEGER,
  engaged_sessions INTEGER,
  engagement_rate REAL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY(property_id, metric_date, traffic_source)
);

CREATE TABLE analytics_sync_runs (
  id TEXT PRIMARY KEY CHECK (id GLOB 'asyn_*'),
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id),
  resource_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'ga4')),
  requested_start_date TEXT NOT NULL,
  requested_end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'retryable', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  last_error_code TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(connection_id, resource_id, requested_start_date, requested_end_date)
);

CREATE INDEX analytics_sync_runs_status_retry
  ON analytics_sync_runs(status, next_retry_at);
