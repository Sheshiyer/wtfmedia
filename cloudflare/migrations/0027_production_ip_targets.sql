-- Source workbook: 'WTF & Nikhil Kamath IPs'!H3:K4.
-- A plus suffix is a minimum target, not an exact cap.
ALTER TABLE production_ips ADD COLUMN target_count INTEGER CHECK (target_count IS NULL OR target_count >= 0);
ALTER TABLE production_ips ADD COLUMN target_plus INTEGER NOT NULL DEFAULT 0 CHECK (target_plus IN (0, 1));

UPDATE production_ips SET target_count = 12 WHERE id = 'bts';
UPDATE production_ips SET target_count = 20, target_plus = 1 WHERE id = 'stitched';
UPDATE production_ips SET target_count = 15 WHERE id = 'pov';
UPDATE production_ips SET target_count = 20 WHERE id = 'animated-ip';
