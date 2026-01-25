-- Sonhário Virtual v2.0 - Database Schema
-- 4 tabelas separadas: dreams, prospections, purges, daily_life
-- Execute este SQL no SQL Editor do Supabase

-- ==============================================
-- TABELA 1: SONHOS (dreams)
-- ==============================================
CREATE TABLE dreams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Conteúdo original
    text TEXT NOT NULL,
    audio_url TEXT,

    -- Moderação
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    sensitivity VARCHAR(20) CHECK (sensitivity IN ('general', 'sensitive', 'private')),
    rejection_reason TEXT,

    -- Tracking
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- IA Processing (preenchido após aprovação)
    ai_analysis TEXT,
    ai_voice_url TEXT,
    ai_image_urls TEXT[],
    ai_video_url TEXT,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- TABELA 2: PROSPECÇÕES (prospections)
-- ==============================================
CREATE TABLE prospections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Conteúdo original
    text TEXT NOT NULL,
    audio_url TEXT,

    -- Moderação
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    sensitivity VARCHAR(20) CHECK (sensitivity IN ('general', 'sensitive', 'private')),
    rejection_reason TEXT,

    -- Tracking
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- IA Processing
    ai_analysis TEXT,
    ai_voice_url TEXT,
    ai_image_urls TEXT[],
    ai_video_url TEXT,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- TABELA 3: DESCARREGOS (purges)
-- ==============================================
CREATE TABLE purges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Conteúdo original (apenas texto, sem áudio)
    text TEXT NOT NULL,

    -- Moderação
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    sensitivity VARCHAR(20) CHECK (sensitivity IN ('general', 'sensitive', 'private')),
    rejection_reason TEXT,

    -- Tracking
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- IA Processing (sem voz, apenas análise + imagens)
    ai_analysis TEXT,
    ai_image_urls TEXT[],
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================
-- TABELA 4: COTIDIANO (daily_life)
-- ==============================================
CREATE TABLE daily_life (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Conteúdo original (foto OU vídeo, sem texto)
    photo_url TEXT,
    video_url TEXT,

    -- Moderação
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,

    -- Tracking
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- IA Processing
    ai_analysis TEXT, -- Descrição da cena
    ai_has_faces BOOLEAN, -- Detecção de rostos
    ai_generated_narrative TEXT, -- Narrativa criada pela IA
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Constraint: foto OU vídeo (pelo menos um)
    CONSTRAINT has_media CHECK (photo_url IS NOT NULL OR video_url IS NOT NULL)
);

-- ==============================================
-- TABELA 5: CONTAMINAÇÕES (visualizações)
-- ==============================================
CREATE TABLE contaminations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Referência ao conteúdo visualizado (pode ser de qualquer tabela)
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('dream', 'prospection', 'purge', 'daily')),
    content_id UUID NOT NULL,

    -- Tracking
    session_id UUID NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Evitar duplicatas: mesma sessão não conta duas vezes o mesmo conteúdo
    UNIQUE(content_type, content_id, session_id)
);

-- ==============================================
-- ÍNDICES para performance
-- ==============================================

-- Dreams
CREATE INDEX idx_dreams_status ON dreams(status);
CREATE INDEX idx_dreams_sensitivity ON dreams(sensitivity);
CREATE INDEX idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX idx_dreams_processed ON dreams(processed_at) WHERE processed_at IS NOT NULL;

-- Prospections
CREATE INDEX idx_prospections_status ON prospections(status);
CREATE INDEX idx_prospections_sensitivity ON prospections(sensitivity);
CREATE INDEX idx_prospections_created_at ON prospections(created_at DESC);
CREATE INDEX idx_prospections_processed ON prospections(processed_at) WHERE processed_at IS NOT NULL;

-- Purges
CREATE INDEX idx_purges_status ON purges(status);
CREATE INDEX idx_purges_sensitivity ON purges(sensitivity);
CREATE INDEX idx_purges_created_at ON purges(created_at DESC);
CREATE INDEX idx_purges_processed ON purges(processed_at) WHERE processed_at IS NOT NULL;

-- Daily Life
CREATE INDEX idx_daily_status ON daily_life(status);
CREATE INDEX idx_daily_created_at ON daily_life(created_at DESC);
CREATE INDEX idx_daily_processed ON daily_life(processed_at) WHERE processed_at IS NOT NULL;

-- Contaminations
CREATE INDEX idx_contaminations_content ON contaminations(content_type, content_id);
CREATE INDEX idx_contaminations_session ON contaminations(session_id);
CREATE INDEX idx_contaminations_viewed_at ON contaminations(viewed_at DESC);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS em todas as tabelas
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospections ENABLE ROW LEVEL SECURITY;
ALTER TABLE purges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_life ENABLE ROW LEVEL SECURITY;
ALTER TABLE contaminations ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer pessoa pode inserir
CREATE POLICY "Anyone can insert dreams"
ON dreams FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert prospections"
ON prospections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert purges"
ON purges FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert daily_life"
ON daily_life FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert contaminations"
ON contaminations FOR INSERT
WITH CHECK (true);

-- Policy: Qualquer pessoa pode ler conteúdo aprovado não-privado
CREATE POLICY "Anyone can view approved non-private dreams"
ON dreams FOR SELECT
USING (status = 'approved' AND (sensitivity IS NULL OR sensitivity != 'private'));

CREATE POLICY "Anyone can view approved non-private prospections"
ON prospections FOR SELECT
USING (status = 'approved' AND (sensitivity IS NULL OR sensitivity != 'private'));

CREATE POLICY "Anyone can view approved non-private purges"
ON purges FOR SELECT
USING (status = 'approved' AND (sensitivity IS NULL OR sensitivity != 'private'));

CREATE POLICY "Anyone can view approved daily_life"
ON daily_life FOR SELECT
USING (status = 'approved');

-- Policy: Qualquer pessoa pode ler contaminações
CREATE POLICY "Anyone can view contaminations"
ON contaminations FOR SELECT
USING (true);

-- ==============================================
-- COMENTÁRIOS para documentação
-- ==============================================

COMMENT ON TABLE dreams IS 'Relatos de sonhos (texto + áudio opcional)';
COMMENT ON TABLE prospections IS 'Prospecções de futuros desejosos (texto + áudio opcional)';
COMMENT ON TABLE purges IS 'Descarregos - pesadelos e coisas ruins (apenas texto)';
COMMENT ON TABLE daily_life IS 'Fotos/vídeos cotidianos sem rostos';
COMMENT ON TABLE contaminations IS 'Rastreamento de visualizações (contaminações oníricas)';

COMMENT ON COLUMN dreams.sensitivity IS 'Nível de sensibilidade: general (público), sensitive (aviso), private (não exibir)';
COMMENT ON COLUMN dreams.status IS 'Status de moderação: pending (aguardando), approved (publicado), rejected (rejeitado)';
COMMENT ON COLUMN daily_life.ai_has_faces IS 'TRUE se IA detectou rostos (auto-rejeita)';
