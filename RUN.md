# Como Rodar o Projeto

## ⚠️ Importante: Diferença entre PowerShell e bash

Este projeto é desenvolvido para **bash** (Linux/WSL), mas você está usando **PowerShell (Windows)**.

---

## 🪟 Windows PowerShell

Use `$env:` para variáveis de ambiente:

```powershell
# Rodar testes
npm test

# Iniciar servidor
$env:NODE_ENV = "test"
node backend/server.js

# Ou tudo em uma linha:
$env:NODE_ENV = "test"; node backend/server.js
```

---

## 🐧 WSL / Linux / bash

Use `export` para variáveis:

```bash
# Rodar testes
npm test

# Iniciar servidor
NODE_ENV=test node backend/server.js

# Ou:
export NODE_ENV=test
node backend/server.js
```

---

## 📋 Resumo de Comandos

| Tarefa | PowerShell | bash |
|--------|-----------|------|
| Instalar | `npm install` | `npm install` |
| Testes | `npm test` | `npm test` |
| Rodar servidor | `$env:NODE_ENV = "test"; node backend/server.js` | `NODE_ENV=test node backend/server.js` |

---

## ✨ Solução Melhor: Use WSL

Se você estiver no Windows, o melhor é usar **WSL (Windows Subsystem for Linux)**:

1. Abra WSL:
```powershell
wsl
```

2. Dentro do WSL (bash):
```bash
cd ~/projeto-sass
npm test
NODE_ENV=test node backend/server.js
```

Lá os comandos bash funcionam naturalmente.

---

## 🎯 Agora Você Consegue!

**PowerShell:**
```powershell
PS E:\Paulo ML\projeto-sass> $env:NODE_ENV = "test"; node backend/server.js
```

**WSL/bash:**
```bash
$ NODE_ENV=test node backend/server.js
```

Escolha qual você preferir!
