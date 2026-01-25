-- Migration: Configurar Row Level Security (RLS) Policies
-- Execute no SQL Editor do Supabase

-- ============================================
-- HABILITAR RLS nas tabelas
-- ============================================

ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospections ENABLE ROW LEVEL SECURITY;
ALTER TABLE purges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_life ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DREAMS: Políticas
-- ============================================

-- INSERT público (anônimo pode enviar, sempre pending)
CREATE POLICY "Public can insert dreams"
ON dreams
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- SELECT público apenas de aprovados
CREATE POLICY "Public reads approved dreams"
ON dreams
FOR SELECT
TO anon
USING (status = 'approved');

-- SELECT admin vê tudo (authenticated)
CREATE POLICY "Admin reads all dreams"
ON dreams
FOR SELECT
TO authenticated
USING (true);

-- UPDATE apenas admin
CREATE POLICY "Admin can update dreams"
ON dreams
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE apenas admin
CREATE POLICY "Admin can delete dreams"
ON dreams
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- PROSPECTIONS: Políticas
-- ============================================

CREATE POLICY "Public can insert prospections"
ON prospections
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved prospections"
ON prospections
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Admin reads all prospections"
ON prospections
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can update prospections"
ON prospections
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can delete prospections"
ON prospections
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- PURGES: Políticas
-- ============================================

CREATE POLICY "Public can insert purges"
ON purges
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved purges"
ON purges
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Admin reads all purges"
ON purges
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can update purges"
ON purges
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can delete purges"
ON purges
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- DAILY_LIFE: Políticas
-- ============================================

CREATE POLICY "Public can insert daily_life"
ON daily_life
FOR INSERT
TO anon
WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved daily_life"
ON daily_life
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Admin reads all daily_life"
ON daily_life
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin can update daily_life"
ON daily_life
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin can delete daily_life"
ON daily_life
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Verificar políticas criadas
-- ============================================

-- Execute para verificar:
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('dreams', 'prospections', 'purges', 'daily_life');
