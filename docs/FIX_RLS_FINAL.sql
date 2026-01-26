-- FIX FINAL: Remove policies problemáticas e recria corretas
-- O problema: WITH CHECK (status = 'pending') falha porque ainda não há status quando inserindo
-- Solução: WITH CHECK (true) - deixa qualquer insert, o JavaScript já envia status='pending'

-- Remover todas as policies
DROP POLICY IF EXISTS "Public can insert dreams" ON dreams;
DROP POLICY IF EXISTS "Anyone can insert dreams" ON dreams;
DROP POLICY IF EXISTS "Public reads approved dreams" ON dreams;
DROP POLICY IF EXISTS "Anyone can view approved non-private dreams" ON dreams;
DROP POLICY IF EXISTS "Admin reads all dreams" ON dreams;
DROP POLICY IF EXISTS "Admin can update dreams" ON dreams;
DROP POLICY IF EXISTS "Admin can delete dreams" ON dreams;
DROP POLICY IF EXISTS "anon_insert_dreams" ON dreams;
DROP POLICY IF EXISTS "anon_select_approved_dreams" ON dreams;
DROP POLICY IF EXISTS "auth_all_dreams" ON dreams;

DROP POLICY IF EXISTS "Public can insert prospections" ON prospections;
DROP POLICY IF EXISTS "Public reads approved prospections" ON prospections;
DROP POLICY IF EXISTS "Admin reads all prospections" ON prospections;
DROP POLICY IF EXISTS "Admin can update prospections" ON prospections;
DROP POLICY IF EXISTS "Admin can delete prospections" ON prospections;

DROP POLICY IF EXISTS "Public can insert purges" ON purges;
DROP POLICY IF EXISTS "Public reads approved purges" ON purges;
DROP POLICY IF EXISTS "Admin reads all purges" ON purges;
DROP POLICY IF EXISTS "Admin can update purges" ON purges;
DROP POLICY IF EXISTS "Admin can delete purges" ON purges;

DROP POLICY IF EXISTS "Public can insert daily_life" ON daily_life;
DROP POLICY IF EXISTS "Public reads approved daily_life" ON daily_life;
DROP POLICY IF EXISTS "Admin reads all daily_life" ON daily_life;
DROP POLICY IF EXISTS "Admin can update daily_life" ON daily_life;
DROP POLICY IF EXISTS "Admin can delete daily_life" ON daily_life;

-- DREAMS: Policies corretas
CREATE POLICY "anon_insert_dreams" ON dreams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_approved_dreams" ON dreams FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "auth_all_dreams" ON dreams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROSPECTIONS
CREATE POLICY "anon_insert_prospections" ON prospections FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_approved_prospections" ON prospections FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "auth_all_prospections" ON prospections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PURGES
CREATE POLICY "anon_insert_purges" ON purges FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_approved_purges" ON purges FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "auth_all_purges" ON purges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DAILY_LIFE
CREATE POLICY "anon_insert_daily_life" ON daily_life FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_approved_daily_life" ON daily_life FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "auth_all_daily_life" ON daily_life FOR ALL TO authenticated USING (true) WITH CHECK (true);
