-- Migration: Add audio_url to daily_life table
-- Execute no SQL Editor do Supabase

ALTER TABLE daily_life ADD COLUMN audio_url TEXT;

COMMENT ON COLUMN daily_life.audio_url IS 'URL do áudio do cotidiano (opcional)';
