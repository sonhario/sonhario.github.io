# Setup Completo - Sonhário Virtual

## Passo 1: Criar Projeto no Supabase

1. Acesse: https://supabase.com
2. Faça login ou crie conta
3. Clique em **"New Project"**
4. Preencha:
   - **Name**: `sonhario-virtual`
   - **Database Password**: escolha senha forte (anote!)
   - **Region**: `South America (São Paulo)` (ou mais próxima)
   - **Pricing Plan**: Free
5. Clique em **"Create new project"**
6. Aguarde ~2 minutos (provisionamento do banco)

---

## Passo 2: Executar SQL para Criar Tabelas

1. No painel do Supabase, clique em **"SQL Editor"** (ícone de banco de dados no menu lateral)
2. Clique em **"New Query"**
3. Copie TODO o conteúdo do arquivo `docs/database.sql`
4. Cole no editor SQL
5. Clique em **"Run"** (ou `Cmd+Enter`)
6. Aguarde confirmação: "Success. No rows returned"

Isso criará:
- Tabela `dreams` (sonhos)
- Tabela `contaminations` (visualizações)
- Índices para performance
- Políticas de segurança (RLS)

---

## Passo 3: Criar Storage Bucket

1. No painel do Supabase, clique em **"Storage"** (menu lateral)
2. Clique em **"New bucket"**
3. Preencha:
   - **Name**: `dream-media`
   - **Public bucket**: ✅ **Marque esta opção** (arquivos serão públicos)
4. Clique em **"Create bucket"**

### Configurar Políticas do Bucket

1. Clique no bucket `dream-media` que acabou de criar
2. Clique na aba **"Policies"**
3. Clique em **"New Policy"**
4. Escolha **"For full customization"**
5. Preencha:
   - **Policy name**: `Public upload`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `public`
   - **Policy definition**: Use o template "Allow public uploads"

   SQL da policy:
   ```sql
   CREATE POLICY "Public upload"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'dream-media');
   ```

6. Clique em **"Review"** → **"Save policy"**

7. Crie outra policy para leitura:
   - **Policy name**: `Public read`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public`

   SQL da policy:
   ```sql
   CREATE POLICY "Public read"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'dream-media');
   ```

---

## Passo 4: Copiar API Keys

1. No painel do Supabase, clique em **"Settings"** (ícone de engrenagem no menu lateral)
2. Clique em **"API"**
3. Você verá duas chaves importantes:

   - **Project URL**: `https://[seu-projeto].supabase.co`
   - **anon / public key**: `eyJhbG...` (chave longa)

4. Copie essas duas informações

---

## Passo 5: Configurar Frontend

1. Abra o arquivo: `js/supabase-config.js`
2. Substitua os placeholders:

```javascript
// Antes:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Depois:
const SUPABASE_URL = 'https://[seu-projeto].supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Cole sua chave aqui
```

3. Salve o arquivo

---

## Passo 6: Commit e Push

```bash
cd ~/Desktop/Site_Claude/sonhario.github.io
git add js/supabase-config.js docs/
git commit -m "Configura Supabase com API keys"
git push
```

---

## Passo 7: Aguardar Deploy do GitHub Pages

1. GitHub Pages pode levar 1-5 minutos para atualizar
2. Acesse: https://sonhos.fitipe.art
3. Teste:
   - Página inicial carrega? ✅
   - Botão "Ver Sonho Aleatório" funciona? (Deve mostrar mensagem "Nenhum sonho publicado")
   - Formulário de upload abre? ✅

---

## Passo 8: Testar Upload de Sonho

1. Acesse: https://sonhos.fitipe.art/upload.html
2. Preencha:
   - **Texto**: "Este é um sonho de teste. Eu estava voando sobre uma cidade desconhecida."
   - **Sensibilidade**: Geral
   - **Termos**: ✅ Aceito
3. Clique em **"Enviar Sonho"**
4. Aguarde confirmação: "Sonho enviado com sucesso!"

---

## Passo 9: Moderar Primeiro Sonho

1. Acesse: https://sonhos.fitipe.art/admin.html
2. Você verá:
   - **Pendentes**: 1
   - Card com o sonho de teste
3. Clique em **"Aprovar"**
4. Confirme
5. Status muda para "Aprovado" ✅

---

## Passo 10: Visualizar Sonho Publicado

1. Volte para: https://sonhos.fitipe.art
2. Clique em **"Ver Sonho Aleatório"**
3. Seu sonho de teste deve aparecer! 🎉
4. Estatísticas devem mostrar:
   - **Sonhos publicados**: 1
   - **Contaminações**: 1

---

## Troubleshooting

### Erro: "Failed to fetch"
- Verifique se as API keys estão corretas em `js/supabase-config.js`
- Verifique se o projeto Supabase está ativo (não pausado)

### Erro: "Row Level Security policy violation"
- Execute novamente o SQL do `database.sql`
- Verifique se as policies foram criadas corretamente

### Bucket storage retorna 403
- Verifique se o bucket `dream-media` está marcado como **Public**
- Verifique se as policies de INSERT e SELECT foram criadas

### GitHub Pages não atualiza
- Aguarde 5 minutos
- Verifique em: https://github.com/sonhario/sonhario.github.io/settings/pages
- Status deve ser: "Your site is live at https://sonhos.fitipe.art"

---

## Próximos Passos (Opcional)

- Compartilhar link com amigos para teste beta
- Criar mais sonhos de teste
- Ajustar estilos CSS conforme preferência
- Configurar analytics (opcional)

---

## Segurança e Privacidade

- ✅ Chave `anon/public` pode ser exposta no frontend (é pública por design)
- ❌ NUNCA exponha a chave `service_role` (ela tem acesso de admin)
- ✅ Row Level Security (RLS) protege dados sensíveis
- ✅ Moderação manual impede spam/abuso

---

## Contato

Dúvidas ou problemas? Abra issue no GitHub ou contate via fitipe.art
