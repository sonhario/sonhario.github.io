-- Migration: Tornar campo 'text' opcional em dreams e prospections
-- Permite uploads com apenas áudio (sem texto)
-- Execute no SQL Editor do Supabase

-- Dreams: texto agora opcional
ALTER TABLE dreams ALTER COLUMN text DROP NOT NULL;

-- Prospections: texto agora opcional
ALTER TABLE prospections ALTER COLUMN text DROP NOT NULL;

-- Adicionar CHECK constraint: pelo menos texto OU áudio
-- Dreams
ALTER TABLE dreams ADD CONSTRAINT dreams_text_or_audio_check
  CHECK (text IS NOT NULL OR audio_url IS NOT NULL);

-- Prospections
ALTER TABLE prospections ADD CONSTRAINT prospections_text_or_audio_check
  CHECK (text IS NOT NULL OR audio_url IS NOT NULL);
