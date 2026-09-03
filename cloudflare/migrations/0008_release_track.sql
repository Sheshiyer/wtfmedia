ALTER TABLE release_manifests
  ADD COLUMN release_track TEXT NOT NULL DEFAULT 'alpha'
  CHECK (release_track IN ('alpha', 'beta'));

CREATE INDEX release_manifests_track ON release_manifests(release_track);
