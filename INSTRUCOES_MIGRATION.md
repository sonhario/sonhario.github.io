# 🔧 AÇÃO NECESSÁRIA: Executar Migration no Supabase

## O que precisa ser feito

A tabela `daily_life` precisa da coluna `audio_url` para aceitar uploads de áudio no Cotidiano.

## Passo a Passo

1. **Acesse o Supabase:**
   - https://supabase.com/dashboard
   - Selecione projeto "sonhario-virtual"

2. **Vá para SQL Editor:**
   - Menu lateral → "SQL Editor"
   - Ou: https://supabase.com/dashboard/project/nxanctcrqdcbbuhlktzb/sql

3. **Cole e execute o SQL:**

```sql
ALTER TABLE daily_life ADD COLUMN audio_url TEXT;

COMMENT ON COLUMN daily_life.audio_url IS 'URL do áudio do cotidiano (opcional)';
```

4. **Clique em "Run"** (botão verde)

5. **Confirme sucesso:**
   - Deve aparecer "Success. No rows returned"
   - Pronto! ✅

---

## Após executar

Aguarde ~90 segundos para GitHub Pages atualizar, depois teste:

1. **Teste Sonhos:** https://sonhos.fitipe.art/upload-sonhos.html
   - Envie APENAS texto (sem áudio)
   - Deve funcionar ✅

2. **Teste Prospecções:** https://sonhos.fitipe.art/upload-prospeccoes.html
   - Envie APENAS áudio (sem texto)
   - Deve funcionar ✅

3. **Teste Descarrego:** https://sonhos.fitipe.art/upload-descarrego.html
   - Envie texto
   - Deve funcionar ✅

4. **Teste Cotidiano:** https://sonhos.fitipe.art/upload-cotidiano.html
   - Envie APENAS áudio (sem foto/vídeo)
   - Deve funcionar ✅

5. **Verifique Admin:** https://sonhos.fitipe.art/admin.html
   - Deve aparecer os uploads nas respectivas abas
   - Deve poder aprovar/rejeitar

---

## Troubleshooting

**Se der erro "relation audio_url already exists":**
- A coluna já existe! Pode pular a migration.

**Se uploads continuarem falhando:**
- Force refresh: Cmd+Shift+R (Mac) ou Ctrl+Shift+F5 (Windows)
- Verifique console do navegador (F12 → Console)
- Me chame para debugar

---

_Criado: 2025-01-25_
