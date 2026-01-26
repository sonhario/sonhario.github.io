#!/usr/bin/env python3
"""
Baixa todos os itens pendentes do Supabase para moderação local

Estrutura criada:
moderacao/pendentes/
├── sonhos/
│   ├── YYYY-MM-DD_HH-MM-SS_ID/
│   │   ├── texto.txt (se houver)
│   │   ├── audio.wav (se houver)
│   │   └── metadata.json
├── prospeccoes/
├── descarregos/
└── cotidiano/
    └── YYYY-MM-DD_HH-MM-SS_ID/
        ├── audio.wav
        ├── foto.jpg
        ├── video.mp4
        └── metadata.json
"""

import requests
import json
import os
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NTE5MSwiZXhwIjoyMDg0OTMxMTkxfQ.qhEV8LIV4goJFzlUuK_rU6z1hXkT8wKqiWaNS5___mE'

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}'
}

BASE_DIR = Path(__file__).parent / 'pendentes'

def download_file(url, dest_path):
    """Baixa arquivo de URL para caminho local"""
    if not url:
        return False

    response = requests.get(url)
    if response.status_code == 200:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, 'wb') as f:
            f.write(response.content)
        return True
    return False

def get_extension_from_url(url):
    """Extrai extensão do arquivo da URL"""
    if not url:
        return None
    path = urlparse(url).path
    ext = Path(path).suffix
    return ext if ext else None

def process_item(item, tipo, pasta_tipo):
    """Processa um item pendente"""
    item_id = item['id']
    created_at = item['created_at']

    # Criar nome da pasta: YYYY-MM-DD_HH-MM-SS_ID
    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    folder_name = dt.strftime('%Y-%m-%d_%H-%M-%S') + f'_{item_id[:8]}'
    item_dir = pasta_tipo / folder_name
    item_dir.mkdir(parents=True, exist_ok=True)

    print(f"  📁 {folder_name}")

    # Salvar texto (se houver)
    if item.get('text'):
        texto_path = item_dir / 'texto.txt'
        with open(texto_path, 'w', encoding='utf-8') as f:
            f.write(item['text'])
        print(f"    ✅ texto.txt")

    # Baixar áudio (se houver)
    if item.get('audio_url'):
        ext = get_extension_from_url(item['audio_url']) or '.wav'
        audio_path = item_dir / f'audio{ext}'
        if download_file(item['audio_url'], audio_path):
            print(f"    ✅ audio{ext}")

    # Cotidiano: baixar foto/vídeo
    if tipo == 'cotidiano':
        if item.get('photo_url'):
            ext = get_extension_from_url(item['photo_url']) or '.jpg'
            photo_path = item_dir / f'foto{ext}'
            if download_file(item['photo_url'], photo_path):
                print(f"    ✅ foto{ext}")

        if item.get('video_url'):
            ext = get_extension_from_url(item['video_url']) or '.mp4'
            video_path = item_dir / f'video{ext}'
            if download_file(item['video_url'], video_path):
                print(f"    ✅ video{ext}")

    # Salvar metadata
    metadata = {
        'id': item_id,
        'tipo': tipo,
        'created_at': created_at,
        'session_id': item.get('session_id'),
        'audio_url': item.get('audio_url'),
        'photo_url': item.get('photo_url') if tipo == 'cotidiano' else None,
        'video_url': item.get('video_url') if tipo == 'cotidiano' else None,
    }

    metadata_path = item_dir / 'metadata.json'
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"    ✅ metadata.json")

def baixar_tipo(tipo, tabela, pasta_nome):
    """Baixa todos os pendentes de um tipo"""
    print(f"\n{'='*60}")
    print(f"📥 Baixando {tipo}")
    print(f"{'='*60}")

    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/{tabela}?status=eq.pending&select=*&order=created_at.asc',
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Erro: {response.text}")
        return

    items = response.json()

    if not items:
        print("  ✅ Nenhum item pendente")
        return

    print(f"  📊 {len(items)} itens pendentes\n")

    pasta_tipo = BASE_DIR / pasta_nome
    pasta_tipo.mkdir(parents=True, exist_ok=True)

    for item in items:
        process_item(item, tipo, pasta_tipo)

def main():
    print("🔽 BAIXAR PENDENTES PARA MODERAÇÃO LOCAL")
    print("="*60)

    # Baixar cada tipo
    baixar_tipo('sonhos', 'dreams', 'sonhos')
    baixar_tipo('prospecções', 'prospections', 'prospeccoes')
    baixar_tipo('descarregos', 'purges', 'descarregos')
    baixar_tipo('cotidiano', 'daily_life', 'cotidiano')

    print("\n" + "="*60)
    print("✅ DOWNLOAD COMPLETO!")
    print("="*60)
    print("\n📝 Próximos passos:")
    print("1. Revise os arquivos em moderacao/pendentes/")
    print("2. MOVA as pastas para:")
    print("   - moderacao/aprovados/  (conteúdo aprovado)")
    print("   - moderacao/rejeitados/ (conteúdo rejeitado)")
    print("3. Execute: python3 atualizar_status.py")
    print()

if __name__ == '__main__':
    main()
