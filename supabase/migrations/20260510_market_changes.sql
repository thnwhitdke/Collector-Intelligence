CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS market_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  record_id uuid REFERENCES records(id) ON DELETE CASCADE,

  title text,
  artist text,

  field_changed text,

  old_value numeric,
  new_value numeric,

  change_amount numeric,
  change_percent numeric,

  change_type text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_changes_record_id
ON market_changes(record_id);

CREATE INDEX IF NOT EXISTS idx_market_changes_created_at
ON market_changes(created_at DESC);