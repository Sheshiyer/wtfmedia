-- Preserve the original provider row as the shared YouTube container. Each
-- authorized channel owns its encrypted Google grant and synchronization state.
ALTER TABLE analytics_oauth_transactions ADD COLUMN pending_credentials TEXT;
ALTER TABLE analytics_oauth_transactions ADD COLUMN available_resources_json TEXT;

CREATE TABLE youtube_analytics_accounts (
  id TEXT PRIMARY KEY CHECK (id GLOB 'yaac_*'),
  connection_id TEXT NOT NULL REFERENCES analytics_provider_connections(id),
  youtube_channel_id TEXT NOT NULL CHECK (youtube_channel_id GLOB 'UC*'),
  title TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  granted_scopes_json TEXT NOT NULL CHECK (json_valid(granted_scopes_json)),
  token_expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','syncing','stale','expired','revoked','missing_scope','provider_error')),
  last_attempted_refresh_at TEXT,
  last_successful_refresh_at TEXT,
  last_error_code TEXT,
  connected_by_operator_id INTEGER REFERENCES operators(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(connection_id, youtube_channel_id)
);

INSERT INTO youtube_analytics_accounts (id, connection_id, youtube_channel_id, title, encrypted_credentials, granted_scopes_json, token_expires_at, status, last_attempted_refresh_at, last_successful_refresh_at, last_error_code, connected_by_operator_id, created_at, updated_at)
SELECT 'yaac_' || substr(hex(randomblob(16)), 1, 32), p.id, c.youtube_channel_id, c.title,
  p.encrypted_credentials, p.granted_scopes_json, p.token_expires_at,
  CASE WHEN p.status IN ('connected','syncing','stale','expired','missing_scope','provider_error') THEN p.status ELSE 'revoked' END,
  p.last_attempted_refresh_at, p.last_successful_refresh_at, p.last_error_code,
  p.connected_by_operator_id, p.created_at, p.updated_at
FROM analytics_provider_connections p JOIN youtube_analytics_channels c ON c.connection_id = p.id
WHERE p.provider = 'youtube' AND c.active = 1 AND p.encrypted_credentials IS NOT NULL AND p.token_expires_at IS NOT NULL AND p.selected_resource_id = c.youtube_channel_id;

UPDATE analytics_provider_connections SET status = 'revoked', encrypted_credentials = NULL, token_expires_at = NULL
WHERE provider = 'youtube' AND id IN (SELECT connection_id FROM youtube_analytics_accounts);

CREATE TRIGGER youtube_accounts_limit_insert BEFORE INSERT ON youtube_analytics_accounts
WHEN NOT EXISTS (SELECT 1 FROM youtube_analytics_accounts WHERE connection_id = NEW.connection_id AND youtube_channel_id = NEW.youtube_channel_id AND status <> 'revoked')
  AND (SELECT COUNT(*) FROM youtube_analytics_accounts WHERE connection_id = NEW.connection_id AND status <> 'revoked') >= 3
BEGIN SELECT RAISE(ABORT, 'youtube_account_limit'); END;

CREATE TRIGGER youtube_accounts_limit_reactivate BEFORE UPDATE OF status ON youtube_analytics_accounts
WHEN OLD.status = 'revoked' AND NEW.status <> 'revoked' AND
 (SELECT COUNT(*) FROM youtube_analytics_accounts WHERE connection_id = NEW.connection_id AND status <> 'revoked') >= 3
BEGIN SELECT RAISE(ABORT, 'youtube_account_limit'); END;

CREATE INDEX youtube_analytics_accounts_connection ON youtube_analytics_accounts(connection_id, status);

-- Keep existing Reporting API jobs attached to the migrated channel. New
-- channels use the same report type with a channel-specific internal key.
UPDATE youtube_reporting_jobs SET report_type_id = report_type_id || ':' ||
  (SELECT youtube_channel_id FROM youtube_analytics_accounts WHERE connection_id = youtube_reporting_jobs.connection_id AND status <> 'revoked' LIMIT 1)
WHERE report_type_id = 'channel_reach_basic_a1' AND EXISTS
  (SELECT 1 FROM youtube_analytics_accounts WHERE connection_id = youtube_reporting_jobs.connection_id AND status <> 'revoked');
UPDATE youtube_reporting_imports SET report_type_id = report_type_id || ':' ||
  (SELECT youtube_channel_id FROM youtube_analytics_accounts WHERE connection_id = youtube_reporting_imports.connection_id AND status <> 'revoked' LIMIT 1)
WHERE report_type_id = 'channel_reach_basic_a1' AND EXISTS
  (SELECT 1 FROM youtube_analytics_accounts WHERE connection_id = youtube_reporting_imports.connection_id AND status <> 'revoked');
