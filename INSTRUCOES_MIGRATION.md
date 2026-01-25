# 🔧 AÇÃO NECESSÁRIA: Executar Migrations no Supabase

## Problema Encontrado

Você executou a migration anterior (adicionar `audio_url` ao `daily_life`), mas os uploads ainda falham porque:

**Causa raiz:** As tabelas `dreams` e `prospections` têm `text TEXT NOT NULL`, mas queremos permitir uploads APENAS de áudio (sem texto).

---

## Migrations a Executar (em ordem)

### 1. Tornar campo 'text' opcional

**O que faz:** Permite uploads com apenas áudio, sem texto obrigatório.

**Acesse:** https://supabase.com/dashboard/project/nxanctcrqdcbbuhlktzb/sql

**Cole e execute:**

```sql
-- Dreams: texto agora opcional
ALTER TABLE dreams ALTER COLUMN text DROP NOT NULL;

-- Prospections: texto agora opcional
ALTER TABLE prospections ALTER COLUMN text DROP NOT NULL;

-- Adicionar CHECK constraint: pelo menos texto OU áudio
ALTER TABLE dreams ADD CONSTRAINT dreams_text_or_audio_check
  CHECK (text IS NOT NULL OR audio_url IS NOT NULL);

ALTER TABLE prospections ADD CONSTRAINT prospections_text_or_audio_check
  CHECK (text IS NOT NULL OR audio_url IS NOT NULL);
```

**Resultado esperado:** "Success. No rows returned"

---

## Após executar

Aguarde ~90 segundos para GitHub Pages atualizar (commit f79daa0), depois teste:

### Teste 1: Sonhos - APENAS texto
1. Acesse: https://sonhos.fitipe.art/upload-sonhos.html
2. Digite texto no campo
3. **NÃO selecione áudio**
4. Marque termos
5. Envie
6. **Deve funcionar** ✅

### Teste 2: Sonhos - APENAS áudio
1. Recarregue página
2. **NÃO digite texto**
3. Selecione um arquivo de áudio
4. Marque termos
5. Envie
6. **Deve funcionar** ✅

### Teste 3: Prospecções - APENAS texto
- Mesmos passos acima em https://sonhos.fitipe.art/upload-prospeccoes.html
- **Deve funcionar** ✅

### Teste 4: Prospecções - APENAS áudio
- Mesmos passos acima
- **Deve funcionar** ✅

### Teste 5: Descarrego - texto obrigatório
1. Acesse: https://sonhos.fitipe.art/upload-descarrego.html
2. Digite texto (obrigatório)
3. Envie
4. **Deve funcionar** ✅

### Teste 6: Cotidiano - apenas áudio
1. Acesse: https://sonhos.fitipe.art/upload-cotidiano.html
2. Selecione APENAS áudio (sem foto/vídeo)
3. Envie
4. **Deve funcionar** ✅

### Teste 7: Admin mostrando dados
1. Acesse: https://sonhos.fitipe.art/admin.html
2. **Deve ver todos os uploads** nas respectivas abas
3. Pode aprovar/rejeitar

---

## Troubleshooting

### Erro: "constraint already exists"
- A constraint já foi adicionada. Pode pular essa linha do SQL.

### Erro: "violates check constraint"
- Significa que há linhas com text=null E audio_url=null
- Execute antes: `DELETE FROM dreams WHERE text IS NULL AND audio_url IS NULL;`
- Depois rode a migration novamente

### Uploads continuam falhando após migration
1. **Force refresh:** Cmd+Shift+R (Mac) ou Ctrl+Shift+F5 (Windows)
2. **Limpe cache:** Feche e reabra navegador
3. **Verifique console:** F12 → Console (me mande o erro)

### Admin continua zerado após testes
- Verifique se chave Supabase está correta (já está)
- Teste inserir dados manualmente no Table Editor do Supabase
- Me chame para debugar conexão

---

## Arquivos de Referência

- **Migration SQL completo:** `docs/migration-make-text-nullable.sql`
- **Código corrigido:** Commits f346e1e, 60197ac, f79daa0

---

_Criado: 2025-01-25_
_Atualizado: 2025-01-25 (após descobrir problema do NOT NULL)_
