# Guia do Painel Admin - Sonhário Virtual

## Acesso

**URL:** https://sonhos.fitipe.art/admin.html

**Observação:** Não há sistema de login no momento. O painel é público mas oculto (não tem link na navegação principal).

---

## Estrutura do Painel

### 4 Abas (Tabs)

1. **Sonhos** - Relatos de sonhos (texto + áudio opcional)
2. **Prospecções** - Futuros desejosos (texto + áudio opcional)
3. **Descarregos** - Pesadelos/coisas ruins (texto apenas)
4. **Cotidiano** - Fotos/vídeos/áudios cotidianos (sem texto)

Clique nas abas para alternar entre os tipos de conteúdo.

---

## Workflow de Moderação

### 1. Visualizar Submissions

Cada card mostra:
- **ID** (UUID único)
- **Conteúdo:** Texto e/ou mídia (áudio/foto/vídeo)
- **Data de envio**
- **Status atual:** Pendente, Aprovado ou Rejeitado

### 2. Ações de Moderação

**Botão "Aprovar Geral"**
- Marca como aprovado e sensibilidade = "general"
- Conteúdo será exibido publicamente (quando visualização estiver implementada)

**Botão "Aprovar Sensível"**
- Marca como aprovado e sensibilidade = "sensitive"
- Futuro: será exibido com aviso "conteúdo sensível"

**Botão "Aprovar Privado"**
- Marca como aprovado mas sensibilidade = "private"
- **NÃO será exibido publicamente**

**Botão "Rejeitar"**
- Marca como rejeitado
- Prompt para inserir motivo da rejeição
- **NÃO será exibido publicamente**

### 3. Reprocessar

**Botão "Reprocessar IA"** (futuro)
- Quando pipeline de IA estiver implementado
- Permite regerar análises/imagens/vídeos

---

## Status e Estados

### Pending (Pendente)
- Upload recém-enviado
- Aguardando sua moderação
- **NÃO aparece publicamente**

### Approved (Aprovado)
- Você aprovou com "Geral", "Sensível" ou "Privado"
- Se Geral ou Sensível: **aparecerá publicamente** (quando visualização for implementada)
- Se Privado: **NÃO aparece publicamente**

### Rejected (Rejeitado)
- Você rejeitou (spam, inapropriado, rostos, etc)
- **NÃO aparece publicamente**

---

## Critérios de Moderação

### ✅ Aprovar Geral
- Conteúdo onírico/especulativo apropriado
- Sem nudez explícita, violência gráfica, discurso de ódio
- Sem rostos identificáveis (para Cotidiano)

### ⚠️ Aprovar Sensível
- Nudez artística/onírica (não pornográfica)
- Violência onírica (pesadelos)
- Temas pesados mas dentro do escopo do projeto

### 🔒 Aprovar Privado
- Conteúdo muito pessoal/íntimo
- Participante pode querer contribuir sem exposição pública

### ❌ Rejeitar
- Pornografia explícita
- Discurso de ódio
- Spam/trolling
- Rostos identificáveis em fotos/vídeos (Cotidiano)
- Conteúdo totalmente fora do escopo

---

## Estatísticas

No topo de cada aba:
- **Total:** Quantidade total de submissions
- **Pendentes:** Aguardando moderação
- **Aprovados:** Já moderados como Geral/Sensível/Privado
- **Rejeitados:** Descartados

---

## Troubleshooting

### Admin não carrega conteúdo
- Verifique console do navegador (F12 → Console)
- Verifique se chave Supabase está correta em `js/supabase-config.js`
- Force refresh: Cmd+Shift+R (Mac) ou Ctrl+Shift+F5 (Windows)

### Botões não funcionam
- Erro de conexão com Supabase
- Verifique console para erros específicos

### Mídia não carrega (áudio/foto/vídeo)
- Problema com Supabase Storage
- Verifique se bucket "dream-media" está configurado como público

---

## Próximos Passos (Futuro - v1.7+)

### Pipeline IA Automático
Quando implementado, após você aprovar:
1. Sistema detecta novo "approved" pendente de processar
2. Pipeline local baixa originais
3. Processa:
   - **Voz:** FFmpeg pitch shift (-2 semitons)
   - **Imagens:** Stable Diffusion local (3 variações)
   - **Análise:** LLM local ou API
   - **Detecção rostos:** OpenCV (Cotidiano)
4. Faz upload dos resultados
5. Atualiza campos `ai_*` no database
6. Status: processed → aparece no site público

### IA Sonhando (v2.0)
- IA lê relatos aprovados
- Gera seus próprios "sonhos de IA"
- Publica em categoria especial

---

## Atalhos de Teclado (Futuro)

- `1-4`: Alternar abas
- `A`: Aprovar Geral
- `S`: Aprovar Sensível
- `P`: Aprovar Privado
- `R`: Rejeitar
- `→`: Próximo item
- `←`: Item anterior

(Não implementado ainda, apenas planejamento)

---

## Backup e Segurança

### Database Backup
- Supabase faz backup automático (retention 7 dias no free tier)
- Para backup manual: Settings → Database → Database Backups

### Export de Dados
- Supabase: Table Editor → Export to CSV
- Ou via SQL: `COPY dreams TO '/tmp/dreams.csv' CSV HEADER;`

---

_Última atualização: 2025-01-25_
