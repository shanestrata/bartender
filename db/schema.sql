-- Grove Bar schema (PostgreSQL 13+)
-- Safe to run repeatedly: every statement uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  method      TEXT NOT NULL DEFAULT 'stirred',
  glass       TEXT,
  base_serves INTEGER NOT NULL DEFAULT 1,
  garnishes   JSONB NOT NULL DEFAULT '[]',
  notes       TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC);

-- Square crop image per recipe
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image      BYTEA;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_mime TEXT;

-- Free-text variation notes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS variants TEXT;
