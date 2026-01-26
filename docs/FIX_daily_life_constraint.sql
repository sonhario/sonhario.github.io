-- Fix: Corrigir constraint has_media para incluir audio_url
--
-- Problema: Constraint atual só aceita photo_url OU video_url
-- Solução: Incluir audio_url na validação

-- Remover constraint antiga
ALTER TABLE daily_life DROP CONSTRAINT IF EXISTS has_media;

-- Criar constraint corrigida (aceita áudio OU foto OU vídeo)
ALTER TABLE daily_life ADD CONSTRAINT has_media
    CHECK (audio_url IS NOT NULL OR photo_url IS NOT NULL OR video_url IS NOT NULL);

-- Verificar
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'has_media';
