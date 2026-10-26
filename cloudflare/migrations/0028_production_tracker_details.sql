-- Structured working fields from Production Tracker [Podcast].
-- The imported source-cell archive remains unchanged.
ALTER TABLE production_items ADD COLUMN shoot_location TEXT;
ALTER TABLE production_source_checks ADD COLUMN guest_role TEXT;
