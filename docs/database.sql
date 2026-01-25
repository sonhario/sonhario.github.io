-- Sonhário Virtual - Database Schema
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de sonhos
CREATE TABLE dreams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    audio_url TEXT,
    image_url TEXT,
    video_url TEXT,
    sensitivity VARCHAR(20) NOT NULL CHECK (sensitivity IN ('general', 'sensitive', 'private')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contaminações (visualizações)
CREATE TABLE contaminations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dream_id UUID NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dream_id, session_id) -- Cada sessão só conta uma vez por sonho
);

-- Índices para performance
CREATE INDEX idx_dreams_status ON dreams(status);
CREATE INDEX idx_dreams_sensitivity ON dreams(sensitivity);
CREATE INDEX idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX idx_contaminations_dream_id ON contaminations(dream_id);
CREATE INDEX idx_contaminations_session_id ON contaminations(session_id);

-- Row Level Security (RLS) - Segurança

-- Enable RLS
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE contaminations ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer pessoa pode inserir sonhos
CREATE POLICY "Anyone can insert dreams"
ON dreams FOR INSERT
WITH CHECK (true);

-- Policy: Qualquer pessoa pode ler sonhos aprovados não-privados
CREATE POLICY "Anyone can view approved non-private dreams"
ON dreams FOR SELECT
USING (status = 'approved' AND sensitivity != 'private');

-- Policy: Qualquer pessoa pode inserir contaminações
CREATE POLICY "Anyone can insert contaminations"
ON contaminations FOR INSERT
WITH CHECK (true);

-- Policy: Qualquer pessoa pode ler contaminações
CREATE POLICY "Anyone can view contaminations"
ON contaminations FOR SELECT
USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dreams_updated_at
BEFORE UPDATE ON dreams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE dreams IS 'Sonhos compartilhados pelos usuários';
COMMENT ON TABLE contaminations IS 'Rastreamento de visualizações de sonhos (contaminações)';
COMMENT ON COLUMN dreams.sensitivity IS 'Nível de sensibilidade: general (público), sensitive (aviso), private (não exibir)';
COMMENT ON COLUMN dreams.status IS 'Status de moderação: pending (aguardando), approved (publicado), rejected (rejeitado)';
