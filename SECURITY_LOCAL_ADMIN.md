# Configuração de Admin Local (Segurança)

## Problema

Atualmente, o arquivo `js/supabase-config.js` contém as credenciais do Supabase e está público no GitHub. Isso é aceitável para a chave **anon/public** (ela é feita para ser exposta), mas pode representar um risco se quisermos adicionar proteção adicional ao painel admin.

## Soluções Possíveis

### Opção 1: Manter como está (RECOMENDADO para v1.0)

**Status atual:** ACEITÁVEL

- A chave `anon` do Supabase **É FEITA PARA SER PÚBLICA**
- Row Level Security (RLS) protege os dados
- Painel admin está "oculto" (sem link na navegação)
- Qualquer pessoa com URL pode acessar, mas só você modera manualmente

**Prós:**
- ✅ Zero configuração adicional
- ✅ Funciona em GitHub Pages
- ✅ Supabase RLS protege os dados

**Contras:**
- ⚠️ Painel admin acessível por qualquer pessoa que descubra a URL

### Opção 2: Admin Local (Mac apenas)

**Setup:**

1. Criar versão local do admin com credenciais em `.env`
2. Painel admin roda apenas no seu Mac
3. Site público funciona normalmente no GitHub Pages

**Como implementar:**

```bash
# 1. Criar arquivo .env (NÃO commitado)
cd /Users/fitipe/Desktop/Site_Claude/sonhario.github.io
cp .env.example .env

# 2. Editar .env com suas credenciais
nano .env

# 3. Adicionar .env ao .gitignore
echo ".env" >> .gitignore

# 4. Criar admin-local.html (usa .env)
# (arquivo separado com Node.js local ou Python server)

# 5. Rodar admin local
python3 -m http.server 8000
# Acesse: http://localhost:8000/admin-local.html
```

**Prós:**
- ✅ Admin totalmente privado
- ✅ Credenciais nunca vão para GitHub

**Contras:**
- ❌ Precisa rodar servidor local
- ❌ Não pode moderar de outro dispositivo
- ❌ Mais complexidade

### Opção 3: Autenticação Supabase (futuro v2.0)

**Setup:**

1. Criar usuário admin no Supabase Auth
2. Adicionar login ao admin.html
3. RLS policies: UPDATE/DELETE apenas para authenticated users

**Prós:**
- ✅ Segurança robusta
- ✅ Pode acessar de qualquer lugar
- ✅ GitHub Pages compatível

**Contras:**
- ❌ Requer implementar sistema de login
- ❌ Mais código e complexidade
- ❌ Overkill para projeto pessoal

---

## Recomendação

**Para v1.0:** Manter como está (Opção 1)

**Justificativa:**
- Projeto pessoal de doutorado
- Você é o único moderador
- Supabase RLS já protege os dados
- Economia de tokens (não adicionar complexidade desnecessária)

**Se precisar mais segurança:**
- Implementar Opção 3 na v2.0 (autenticação Supabase)

---

## Como Remover admin.html do GitHub (se quiser)

Se decidir ocultar o painel admin completamente:

```bash
# 1. Remover do GitHub
git rm admin.html js/admin.js css/admin.css
git commit -m "Remove admin panel from public site"
git push

# 2. Manter cópia local
cp admin.html admin-local.html
# Editar e usar apenas localmente
```

---

## Nota sobre Chaves Supabase

### Anon/Public Key (atual)
- ✅ Pode ser exposta publicamente
- ✅ RLS protege acesso aos dados
- ✅ Perfeita para frontend

### Service Role Key
- ❌ NUNCA expor
- ❌ Bypassa RLS
- ❌ Uso apenas em backend seguro

**Você está usando:** Anon key (correta) ✅

---

_Última atualização: 2025-01-25_
