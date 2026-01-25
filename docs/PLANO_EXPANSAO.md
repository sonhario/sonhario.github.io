# Plano: Expansão Sonhário Virtual - IA Co-Habitante

## Contexto

Expandir Sonhário Virtual para plataforma multi-espécie com IA como participante ativo, inspirado em Donna Haraway (fabulação especulativa, worlding, Camille Stories).

**Conceito:** Aldeamento expandido onde humanos + IA co-criam futuros através de sonhos, prospecções e descarregos.

---

## Decisões de Design (do usuário)

### Tecnologia
- **Voz:** Pitch shift (FFmpeg, preserva nuances)
- **Imagens:** SD local + APIs gratuitas (Hugging Face)
- **Moderação:** Manual → depois IA processa
- **Storage:** Híbrido (local processing, cloud serving)
- **Estrutura:** 4 páginas HTML separadas
- **Database:** 4 tabelas separadas (isolamento conceitual)

### Constraint: Rostos Proibidos
- Moderação deve detectar rostos em fotos/vídeos
- Rejeitar uploads com rostos identificáveis

---

## Arquitetura do Sistema

### Frontend (4 Páginas de Upload)

1. **upload-sonhos.html** - Relatos de sonhos
   - Campo texto (5000 chars)
   - Upload áudio (.wav, .mp3, .aac, .m4a, max 10MB)
   - Sem campo de imagem/vídeo

2. **upload-prospeccoes.html** - Futuros desejosos
   - Campo texto (5000 chars)
   - Upload áudio (mesmos formatos)
   - Sem campo de imagem/vídeo

3. **upload-descarrego.html** - Pesadelos/coisas ruins
   - Apenas campo texto (10000 chars - mais espaço para elaborar)
   - SEM áudio (só escrita)

4. **upload-cotidiano.html** - Fotos/vídeos cotidianos
   - Upload foto (.jpg, .png, max 5MB)
   - Upload vídeo (.mp4, .mov, max 50MB)
   - SEM campo de texto
   - Aviso: "Não envie fotos/vídeos com rostos de pessoas"

### Database (Supabase - 4 Tabelas)

```sql
-- Tabela 1: Sonhos
CREATE TABLE dreams (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    audio_url TEXT,
    status VARCHAR(20), -- pending, approved, rejected
    session_id UUID,
    created_at TIMESTAMP,
    -- IA processing
    ai_analysis TEXT,
    ai_voice_url TEXT, -- voz modificada
    ai_image_urls TEXT[], -- imagens geradas
    ai_video_url TEXT, -- vídeo gerado (opcional)
    processed_at TIMESTAMP
);

-- Tabela 2: Prospecções
CREATE TABLE prospections (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    audio_url TEXT,
    status VARCHAR(20),
    session_id UUID,
    created_at TIMESTAMP,
    -- IA processing
    ai_analysis TEXT,
    ai_voice_url TEXT,
    ai_image_urls TEXT[],
    ai_video_url TEXT,
    processed_at TIMESTAMP
);

-- Tabela 3: Descarregos
CREATE TABLE purges (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    status VARCHAR(20),
    session_id UUID,
    created_at TIMESTAMP,
    -- IA processing (apenas análise + imagem, sem voz)
    ai_analysis TEXT,
    ai_image_urls TEXT[],
    processed_at TIMESTAMP
);

-- Tabela 4: Cotidiano
CREATE TABLE daily_life (
    id UUID PRIMARY KEY,
    photo_url TEXT,
    video_url TEXT,
    status VARCHAR(20),
    session_id UUID,
    created_at TIMESTAMP,
    -- IA processing
    ai_analysis TEXT, -- descrição da cena
    ai_has_faces BOOLEAN, -- detecção de rostos
    ai_generated_narrative TEXT, -- IA cria narrativa baseada na imagem
    processed_at TIMESTAMP
);
```

### Storage (Supabase Buckets)

- `originals/` - Uploads originais
- `processed/` - Arquivos processados pela IA
- `ai-generated/` - Conteúdo criado pela IA

---

## Pipeline de Processamento IA

### Fluxo (Manual → IA → Publicação)

```
1. Usuário envia → status: pending
2. Fitipe modera no admin.html → aprova
3. Sistema detecta "approved" → inicia pipeline local
4. Pipeline processa (voz, imagens, análise)
5. Upload resultados para Supabase
6. Status: processed → aparece no site público
```

### Scripts Locais (Python)

**Pasta:** `~/Desktop/Site_Claude/sonhario-ai-pipeline/`

#### 1. `watch_submissions.py`
- Monitora Supabase (polling a cada 30s)
- Detecta novos approved pendentes de processar
- Baixa originais
- Dispara pipeline apropriado

#### 2. `process_dream.py`
- Input: texto + áudio
- Análise: OpenAI API (free tier) ou local LLM
- Voz: FFmpeg pitch shift (-2 semitons)
- Imagens: SD local (3 variações do relato)
- Upload resultados

#### 3. `process_prospection.py`
- Similar a sonhos
- Prompt SD: "futuro desejoso, especulativo, utópico"

#### 4. `process_purge.py`
- Input: apenas texto
- Análise: sentimento, temas
- Imagens: SD com prompt "catártico, liberador, transformação"
- Sem voz

#### 5. `process_daily.py`
- Input: foto/vídeo
- Detecção rostos: OpenCV (local, gratuito)
- Se tem rosto → rejeitar (update status rejected)
- IA descreve cena (BLIP/CLIP local)
- Gera narrativa curta baseada na imagem

#### 6. `utils/`
- `ffmpeg_voice.py` - Pitch shift
- `sd_generator.py` - Wrapper SD API
- `face_detector.py` - OpenCV detector
- `supabase_client.py` - Upload/download

---

## Admin Panel (Expansão)

### admin.html - Novas Features

**Tabs:**
1. Sonhos (já existe)
2. Prospecções (nova)
3. Descarregos (nova)
4. Cotidiano (nova)
5. Processamento IA (status pipeline)

**Card de cada submission:**
- Mostrar status: pending → approved → processing → processed
- Botão "Reprocessar IA" (se quiser gerar novamente)
- Preview de conteúdo IA gerado

---

## Visualização Pública (Expansão)

### index.html - Nova Estrutura

**Menu:**
- Sonhos (já existe)
- Prospecções (nova página)
- Descarregos (nova página)
- Cotidiano (nova página)
- **IA Sonhando** (futuro - v2.0)

Cada página:
- Navegação aleatória
- Mostra relato original + criações IA lado a lado
- Crédito: "Criado em co-autoria com IA"

---

## Fase 1: Expansão Database + Frontend (v1.5)

### Arquivos Críticos

**Database:**
- `docs/database-v2.sql` - Schema completo (4 tabelas)

**Frontend:**
- `upload-sonhos.html` (refatorar atual upload.html)
- `upload-prospeccoes.html` (cópia adaptada)
- `upload-descarrego.html` (sem áudio)
- `upload-cotidiano.html` (sem texto, só mídia)
- `js/upload-common.js` (código compartilhado)
- `js/upload-sonhos.js`
- `js/upload-prospeccoes.js`
- `js/upload-descarrego.js`
- `js/upload-cotidiano.js`

**Admin:**
- `admin.html` - Tabs para 4 tipos
- `js/admin-v2.js` - Gerenciar 4 tabelas
- `css/admin-tabs.css`

**Visualização:**
- `prospeccoes.html`
- `descarregos.html`
- `cotidiano.html`
- `js/visualizacao-common.js`

### Estimativa
- Database: 1 arquivo SQL
- Frontend: 4 HTML + 5 JS + 2 CSS = 11 arquivos
- Total: ~12 arquivos

---

## Fase 2: Pipeline IA Local (v1.6)

### Estrutura

```
~/Desktop/Site_Claude/sonhario-ai-pipeline/
├── watch_submissions.py      # Monitor principal
├── process_dream.py
├── process_prospection.py
├── process_purge.py
├── process_daily.py
├── requirements.txt
├── .env                       # Supabase keys
└── utils/
    ├── ffmpeg_voice.py
    ├── sd_generator.py
    ├── face_detector.py
    └── supabase_client.py
```

### Dependências (Python)

```txt
supabase-py
python-dotenv
opencv-python  # Face detection
pillow
requests
transformers   # BLIP/CLIP (image captioning)
```

### FFmpeg (já instalado no Mac)

```bash
# Pitch shift command
ffmpeg -i input.mp3 -af "asetrate=44100*0.9,aresample=44100" output.mp3
```

### Stable Diffusion API

```bash
# Iniciar SD em modo API
cd /Users/fitipe/stable-diffusion-webui
source venv/bin/activate
python webui.py --api --nowebui --port 7861
```

Deixar rodando em background durante processar lote.

### Hugging Face API (fallback)

- API key gratuita: 1000 requests/dia
- Modelo: stable-diffusion-2-1
- Uso: quando SD local estiver lento/offline

---

## Fase 3: IA Sonhando (v2.0 - Futuro)

### Conceito
IA lê todos os relatos aprovados e cria seus próprios "sonhos de IA".

### Implementação
- Script `ia_dreams.py`
- Roda semanal (cron)
- Input: 10-20 relatos aleatórios
- LLM local (llama.cpp) ou API (Anthropic/OpenAI)
- Prompt: "Você é uma IA sonhando. Baseado nestes relatos humanos, elabore seu próprio sonho onírico de máquina."
- Gera: texto + imagens SD
- Publica como categoria especial: "Sonhos de IA"

### Página
- `ia-sonhando.html`
- Diferenciação visual clara (cor, ícone)
- Crédito: "Sonho gerado autonomamente por IA"

---

## Verificação (Como Testar)

### Frontend
1. Acessar cada página upload (4 URLs)
2. Enviar teste em cada categoria
3. Verificar validação (formatos, tamanhos)
4. Ver no admin se aparece corretamente

### Pipeline IA
1. Aprovar submission no admin
2. Verificar logs `watch_submissions.py`
3. Checar pasta local: `~/processed/[id]/`
4. Confirmar upload Supabase Storage
5. Ver no site público com conteúdo IA

### Detecção Rostos
1. Enviar foto COM rosto em upload-cotidiano
2. Aprovar no admin
3. Pipeline deve rejeitar automaticamente
4. Status → rejected com reason: "Rosto detectado"

---

## Custos (Tudo Gratuito)

- ✅ Supabase: Free tier (1GB storage)
- ✅ SD local: Ilimitado, offline
- ✅ FFmpeg: Gratuito, local
- ✅ OpenCV: Gratuito, local
- ✅ Hugging Face API: 1000 req/dia gratuitos
- ⚠️ LLM para análise: Llama local (lento) OU OpenAI free tier (limitado)

**Total:** $0/mês se usar apenas ferramentas locais.

---

## Cronograma

### Sprint 1 (2-3 dias)
- Atualizar database schema
- Criar 4 páginas upload
- Refatorar admin com tabs

### Sprint 2 (2-3 dias)
- Setup pipeline Python
- FFmpeg voice processing
- Face detection OpenCV

### Sprint 3 (2-3 dias)
- SD batch generation
- Hugging Face integration
- Upload automation

### Sprint 4 (1 dia)
- Páginas visualização pública
- Testes end-to-end

### Sprint 5 (Futuro)
- IA Sonhando autonomamente
- Análise NLP avançada
- Grafo de contaminações

---

## Aprovação Necessária

- Schema database OK?
- Estrutura 4 páginas OK?
- Pipeline local Python OK?
- Detecção rostos obrigatória OK?
