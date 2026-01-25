# 🔐 Setup: Autenticação Admin + RLS Policies

## Visão Geral

Sistema seguro com:
- ✅ Uploads públicos (anônimos) sempre `status='pending'`
- ✅ Admin requer login (Supabase Auth)
- ✅ RLS policies protegem dados
- ✅ Público vê apenas conteúdo aprovado

---

## Passo 1: Criar Usuário Admin

1. **Acesse:** https://supabase.com/dashboard/project/nxanctcrqdcbbuhlktzb/auth/users

2. **Clique em "Add user" → "Create new user"**

3. **Preencha:**
   - Email: `seu_email@exemplo.com` (seu email pessoal)
   - Password: Senha forte (salve no gerenciador de senhas!)
   - ✅ Marque "Auto Confirm User"

4. **Clique em "Create user"**

---

## Passo 2: Configurar RLS Policies

1. **Acesse:** https://supabase.com/dashboard/project/nxanctcrqdcbbuhlktzb/sql

2. **Cole o SQL completo:**

```sql
-- Habilitar RLS
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospections ENABLE ROW LEVEL SECURITY;
ALTER TABLE purges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_life ENABLE ROW LEVEL SECURITY;

-- DREAMS
CREATE POLICY "Public can insert dreams" ON dreams
FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved dreams" ON dreams
FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "Admin reads all dreams" ON dreams
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update dreams" ON dreams
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete dreams" ON dreams
FOR DELETE TO authenticated USING (true);

-- PROSPECTIONS
CREATE POLICY "Public can insert prospections" ON prospections
FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved prospections" ON prospections
FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "Admin reads all prospections" ON prospections
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update prospections" ON prospections
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete prospections" ON prospections
FOR DELETE TO authenticated USING (true);

-- PURGES
CREATE POLICY "Public can insert purges" ON purges
FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved purges" ON purges
FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "Admin reads all purges" ON purges
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update purges" ON purges
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete purges" ON purges
FOR DELETE TO authenticated USING (true);

-- DAILY_LIFE
CREATE POLICY "Public can insert daily_life" ON daily_life
FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE POLICY "Public reads approved daily_life" ON daily_life
FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "Admin reads all daily_life" ON daily_life
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update daily_life" ON daily_life
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin can delete daily_life" ON daily_life
FOR DELETE TO authenticated USING (true);
```

3. **Clique em "Run"**

4. **Resultado esperado:** "Success. No rows returned"

---

## Passo 3: Testar Sistema

### A. Testar Upload Público (sem login)

1. Acesse: https://sonhos.fitipe.art/upload-sonhos.html
2. Digite um texto de teste
3. Marque termos
4. Envie
5. **Deve funcionar** ✅ (formulário limpa)

### B. Acessar Admin (com login)

1. Acesse: https://sonhos.fitipe.art/admin.html
2. **Deve redirecionar** para admin-login.html
3. Digite email e senha criados no Passo 1
4. Clique "Entrar"
5. **Deve redirecionar** para admin.html
6. **Deve ver** uploads pendentes nas abas

### C. Moderar Conteúdo

1. No admin, clique na aba "Sonhos"
2. Veja o upload de teste
3. Clique "Aprovar Geral"
4. Conteúdo muda para `status='approved'`

### D. Verificar Público Vê Apenas Aprovados

1. **Futuro:** Quando criar página de visualização pública
2. Público verá apenas `status='approved'`
3. Você (admin) vê tudo

---

## Passo 4: Fazer Logout

1. No admin, clique botão "Sair" (canto superior direito)
2. Deve redirecionar para admin-login.html

---

## Troubleshooting

### Erro: "Invalid login credentials"
- Verifique email/senha corretos
- Confirme que usuário está "Auto Confirmed" no Supabase Auth

### Erro: "new row violates row-level security policy"
- RLS policies não foram aplicadas
- Execute o SQL do Passo 2 novamente

### Admin não redireciona após login
- Force refresh: Cmd+Shift+R
- Verifique console (F12) para erros

### Uploads públicos falhando
- Verifique se RLS está habilitado: `ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;`
- Verifique se policy "Public can insert" existe

---

## Segurança

### ✅ O que ESTÁ seguro
- Anon key exposta no frontend (normal)
- RLS policies protegem dados
- Admin requer autenticação
- Público não pode ler conteúdo pendente
- Público não pode UPDATE/DELETE

### ❌ O que NÃO fazer
- **NUNCA** exponha service role key
- **NUNCA** desabilite RLS
- **NUNCA** crie policy que permite DELETE público

---

## Arquivos Criados

- `admin-login.html` - Página de login do admin
- `docs/migration-rls-policies.sql` - SQL completo de policies
- `js/admin.js` - Atualizado com auth check
- `admin.html` - Atualizado com botão logout

---

## Próximos Passos (v1.7+)

1. **Rate limiting:** Limitar uploads por IP/session
2. **Email verification:** Exigir verificação de email
3. **2FA:** Autenticação de dois fatores para admin
4. **Audit log:** Registrar ações de moderação

---

_Criado: 2025-01-25_
