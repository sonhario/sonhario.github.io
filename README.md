# Sonhário Virtual

Plataforma web para compartilhamento coletivo e anônimo de sonhos. Aldeamento por contaminação onírica.

## Conceito

O Sonhário Virtual é um espaço de **aldeamento expandido** onde pessoas desconhecidas compartilham seus sonhos de forma anônima e assíncrona. Inspirado nos Sonhários pandêmicos (2020-2021) e em cosmologias indígenas (Yanomami, Warlpiri) e pesquisas neurocientíficas (Sidarta Ribeiro).

**Princípios:**
- Sonho como vírus benigno (contaminação mútua)
- Temporalidade não-linear (jukurrpa artificial)
- Anonimato como cosmologia (espíritos xapiri flutuantes)
- Arquivo vivo (floresta onírica em crescimento)

## Stack Técnica

- **Frontend**: HTML/CSS/JavaScript vanilla
- **Backend**: Supabase (PostgreSQL + Storage)
- **Hosting**: GitHub Pages
- **Domínio**: sonhos.fitipe.art

## Estrutura de Arquivos

```
sonhario-virtual/
├── index.html              # Visualização pública
├── upload.html             # Formulário de upload
├── admin.html              # Painel de moderação
├── termos.html             # Termos de uso
├── css/
│   ├── global.css          # Reset + variáveis CSS
│   ├── visualizacao.css    # Estilos visualização pública
│   ├── upload.css          # Estilos formulário upload
│   └── admin.css           # Estilos painel admin
├── js/
│   ├── supabase-config.js  # Configuração Supabase
│   ├── visualizacao.js     # Lógica visualização pública
│   ├── upload.js           # Lógica upload + validação
│   ├── admin.js            # Lógica painel moderação
│   └── utils.js            # Funções utilitárias
├── assets/
└── README.md
```

## Setup Local

### 1. Configurar Supabase

1. Criar conta em https://supabase.com
2. Criar projeto "sonhario-virtual"
3. Executar SQL para criar tabelas (ver `docs/database.sql`)
4. Criar bucket de storage "dream-media"
5. Copiar API keys para `js/supabase-config.js`

### 2. Testar Localmente

```bash
# Servir arquivos localmente (Python)
python3 -m http.server 8000

# Ou com Node.js
npx http-server -p 8000
```

Acessar: `http://localhost:8000`

### 3. Deploy

```bash
# Push para GitHub
git add .
git commit -m "Initial commit: Sonhário Virtual v1.0"
git push origin main
```

GitHub Pages servirá automaticamente em `sonhos.fitipe.art` após configuração DNS.

## Funcionalidades v1.0

### Upload (upload.html)
- Formulário anônimo (sem login)
- Aceita: texto, áudio (MP3/WAV), imagem (JPG/PNG), vídeo (MP4)
- Validação de formato e tamanho
- Status: "pendente" após envio

### Moderação (admin.html)
- Login simples (user/pass)
- Lista de sonhos pendentes
- Aprovar como: Geral / Sensível / Privado
- Rejeitar com motivo opcional
- Estatísticas básicas

### Visualização Pública (index.html)
- Sonho único na tela
- Navegação aleatória ("próximo sonho")
- Contador de sonhos no arquivo
- Tracking anônimo (session ID)

## Moderação

**Sistema de categorias:**
- 🟢 **Geral**: público para todos
- 🟡 **Sensível**: blur + aviso antes de exibir
- 🔴 **Privado**: nunca exibido publicamente

**Termos de Uso:**
- Proibido: pornografia explícita, discurso de ódio, spam
- Permitido: nudez artística/onírica (marcar "sensível"), violência onírica (marcar "sensível")

## Roadmap v2.0 (Futuro)

- [ ] Aleatorização generativa com p5.js
- [ ] Sistema "Deriva Onírica" (superfície → abismo)
- [ ] Conceitos flutuantes (palavras-chave)
- [ ] Análise NLP (temas recorrentes, sentimento)
- [ ] Grafo de contaminação (d3.js)
- [ ] Ritualização assíncrona (notificações, "sonho do dia")

## Contexto Acadêmico

Este projeto dialoga com:
- **Sidarta Ribeiro**: sonhos como coesão da espécie, oráculo probabilístico
- **Cosmologia Yanomami**: xapiri (espíritos em sonhos), xamãs impedindo queda do céu
- **Cosmologia Warlpiri**: jukurrpa (Dreaming fora do tempo linear)
- **Sonhários pandêmicos**: ritual coletivo diário, aldeamento virtual

Fontes de pesquisa incluídas no plano de implementação.

## Licença

A definir.

## Contato

Fitipe Britto - fitipe.art
