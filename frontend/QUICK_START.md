# 🚀 Quick Start - Testando a Aplicação Refatorada

## Passo 1: Atualizar o Entry Point

```bash
# Edite o arquivo index.html
nano /root/projeto/projeto-sass/frontend/index.html
```

Mude a linha do script de:
```html
<script type="module" src="/src/main.jsx"></script>
```

Para:
```html
<script type="module" src="/src-refactored/main.tsx"></script>
```

## Passo 2: Configurar Variáveis de Ambiente (se ainda não configurou)

```bash
cd /root/projeto/projeto-sass/frontend

# Criar arquivo .env se não existir
cat > .env << 'EOF'
VITE_API_BASE_URL=https://vendata.com.br/api
VITE_ML_CLIENT_ID=seu_client_id_aqui
VITE_ML_REDIRECT_URI=http://localhost:5173/auth/ml-callback
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=true
EOF
```

## Passo 3: Iniciar o Servidor

```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:5173`

## Passo 4: Testar a Aplicação

### ✅ Teste 1: Login
1. Acesse `http://localhost:5173/login`
2. Digite suas credenciais
3. Clique em "Sign In"
4. Deve redirecionar para `/dashboard`

### ✅ Teste 2: Dashboard
No dashboard você deve ver:
- ✅ Header com logo "Vendata", notificações e avatar
- ✅ Sidebar com menu de navegação
- ✅ 8 cards de estatísticas (Receita, Vendas, Pedidos, etc.)
- ✅ Seletor de período no topo
- ✅ Placeholders para gráficos

**Ações para testar:**
- Clique no botão de menu (☰) para abrir/fechar o sidebar
- Clique no avatar no canto superior direito para abrir menu do usuário
- Mude o período no Select (7 dias, 30 dias, etc.)
- Navegue para "Contas ML" no sidebar

### ✅ Teste 3: ML Accounts
Na página de contas ML:
- ✅ Deve ver header "Contas Mercado Livre"
- ✅ Botão "Conectar Nova Conta"
- ✅ Lista de contas (ou empty state se não tiver nenhuma)

**Se você já tem contas conectadas:**
- Teste o botão "Sincronizar" em uma conta
- Clique em "Ver Detalhes"
- Teste "Remover" (abrirá um modal de confirmação)

**Se não tem contas:**
- Clique em "Conectar Nova Conta"
- Será redirecionado para OAuth do Mercado Livre
- Após autorizar, voltará para a aplicação

### ✅ Teste 4: Logout
1. Clique no avatar no canto superior direito
2. Clique em "Sair"
3. Deve deslogar e redirecionar para `/login`

---

## 🎯 O que você deve ver funcionando:

### UI Components ✅
- Buttons com loading states
- Inputs com validação
- Cards com diferentes variantes
- Modals com animações
- Toasts de notificação (aparece no canto superior direito)
- Badges de status
- Avatars
- Spinner de loading

### Layout ✅
- Header fixo no topo
- Sidebar responsivo
- Toggle do menu
- Navegação entre páginas
- Protected routes (redireciona para login se não autenticado)

### Features ✅
- Login/Register completo
- Dashboard com estatísticas
- ML Accounts com CRUD
- OAuth do Mercado Livre
- Sincronização de contas

---

## 🐛 Se algo não funcionar:

### Problema: Erro de compilação TypeScript
**Solução:**
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Problema: "Cannot find module '@/...'"
**Solução:**
O alias `@/` está configurado no `vite.config.js`. Verifique se a configuração está correta:
```javascript
resolve: {
  alias: {
    "@": path.resolve(dirname, "./src-refactored"),
  },
},
```

### Problema: Página em branco
**Solução:**
1. Abra o console do navegador (F12)
2. Veja os erros
3. Verifique se o entry point está correto no `index.html`
4. Verifique se os arquivos existem em `/src-refactored`

### Problema: API não responde
**Solução:**
```bash
# Verifique se os containers backend estão rodando
docker ps

# Se não estiverem, inicie-os
cd /root/projeto/projeto-sass
docker compose -f docker-compose.production.yml up -d
```

---

## 📊 Checklist de Teste Completo

```
[x] Login funciona
[x] Register funciona
[x] OAuth callback funciona
[x] Dashboard carrega
[x] Estatísticas aparecem
[x] Select de período funciona
[x] ML Accounts lista contas
[x] Sincronizar conta funciona
[x] Remover conta funciona (com modal)
[x] Conectar nova conta funciona
[x] Sidebar abre/fecha
[x] Menu do usuário funciona
[x] Logout funciona
[x] Protected routes redirecionam
[x] Toasts aparecem nas ações
[x] Loading states funcionam
[x] Error handling funciona
```

---

## 💡 Dicas

1. **DevTools do React Query**: No canto inferior da tela, você verá um ícone flutuante do React Query DevTools (modo desenvolvimento)
2. **Redux DevTools**: Se você tem a extensão, pode ver o estado do Zustand
3. **Console Logs**: A aplicação loga todas as requisições da API no console para debug

---

## 🎉 Sucesso!

Se todos os testes acima funcionarem, a refatoração está **100% operacional** e você pode começar a usar a nova aplicação!

**Próximos Passos:**
- Continue desenvolvendo novos features
- Migre features antigos da pasta `/src` para `/src-refactored`
- Adicione mais componentes conforme necessário

---

**Documentação Completa:**
- `PROGRESS_UPDATE.md` - O que foi feito nesta sessão
- `ARCHITECTURE.md` - Arquitetura completa
- `README.md` em `/src-refactored` - Guia detalhado

**Problemas?** Verifique os logs do console e os erros da API.
