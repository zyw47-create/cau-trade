USE campus_trade;

ALTER TABLE errand_events
  ADD COLUMN event_type VARCHAR(40) NOT NULL DEFAULT 'status_change' AFTER errand_id,
  ADD COLUMN remark VARCHAR(255) NULL AFTER to_status;

UPDATE errand_events
SET remark = COALESCE(remark, note)
WHERE remark IS NULL;
