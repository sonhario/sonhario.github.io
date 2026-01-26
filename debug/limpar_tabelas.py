#!/usr/bin/env python3
"""
Limpa todas as tabelas do Supabase
"""

import requests

SUPABASE_URL = 'https://nxanctcrqdcbbuhlktzb.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW5jdGNycWRjYmJ1aGxrdHpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1NTE5MSwiZXhwIjoyMDg0OTMxMTkxfQ.qhEV8LIV4goJFzlUuK_rU6z1hXkT8wKqiWaNS5___mE'

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

tables = ['dreams', 'prospections', 'purges', 'daily_life', 'contaminations']

print("🧹 Limpando todas as tabelas...\n")

for table in tables:
    print(f"Deletando {table}...")

    # Delete all (com filtro sempre true para deletar tudo)
    response = requests.delete(
        f'{SUPABASE_URL}/rest/v1/{table}?id=neq.00000000-0000-0000-0000-000000000000',
        headers=headers
    )

    if response.status_code in [200, 204]:
        print(f"  ✅ {table} limpa!")
    else:
        print(f"  ⚠️  Status {response.status_code}: {response.text[:100]}")

    # Verificar contagem
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}?select=count',
        headers=headers
    )
    if response.status_code == 200:
        print(f"  Linhas restantes: {response.json()}")

print("\n✅ Limpeza completa!")
print("\n📝 Agora teste no navegador limpo:")
print("1. Abra Safari ou outro navegador que nunca usou o site")
print("2. Acesse: https://sonhos.fitipe.art/upload-sonhos.html")
print("3. Envie UM sonho (apenas texto)")
print("4. Verifique tabela dreams no Supabase")
print("5. Repita para outras páginas")
