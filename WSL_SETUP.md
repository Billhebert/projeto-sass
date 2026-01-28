# WSL Setup Guide

## Problema: npm install falha com erro UNC path

Ao executar `npm install` no WSL, você pode receber erro:
```
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC.
```

## Solução: SKIP_DOWNLOAD

Este projeto usa `mongodb-memory-server` que tenta fazer download de binários.

**Para instalar dependências no WSL, use:**

```bash
SKIP_DOWNLOAD=true npm install
```

Isso pula o download automático de binários (que causa erro de UNC path).

### Por que funciona?

- `mongodb-memory-server` tenta usar binários locais primeiro
- Se não encontrar, usa API em tempo de execução
- `SKIP_DOWNLOAD` evita o erro de path UNC durante npm install
- Os testes ainda funcionam normalmente

## Alternativa: Instalar Docker Desktop

Se preferir usar Docker (mais limpo para produção):

1. Baixe [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Instale e reinicie Windows
3. Execute: `docker compose up -d`

Nesse caso, não precisa do `mongodb-memory-server` localmente.

## Verificar que tudo funciona

```bash
npm test
# Deve mostrar: ✓ Passed: 10 / ✗ Failed: 0
```

## Comandos Rápidos

```bash
# Instalar (WSL)
SKIP_DOWNLOAD=true npm install

# Rodar testes
npm test

# Iniciar servidor
NODE_ENV=test node backend/server.js

# Docker (se instalado)
docker compose up -d
```

---

**Status**: ✅ Testado e funcionando em WSL Ubuntu
