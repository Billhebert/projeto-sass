╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  PROJETO SASS - Setup Rápido                                  ║
║                                                                ║
║  Full-Stack Dashboard SaaS com Integração Mercado Livre       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

🚀 TRÊS FORMAS DE RODAR O PROJETO:

────────────────────────────────────────────────────────────────

1. DESENVOLVIMENTO LOCAL (⭐ RECOMENDADO)

   Bancos em Docker • App Localmente

   # Setup inicial (uma única vez)
   Windows:   setup-dev.bat
   Linux:     ./setup-dev.sh

   # Inicie os bancos
   npm run db:start

   # Em outro terminal:
   npm run dev

   Acesse: http://localhost:3011 (Backend)
           http://localhost:5173 (Frontend)

   📖 Leia: DESENVOLVIMENTO_LOCAL.md

────────────────────────────────────────────────────────────────

2. DOCKER COMPLETO

   Tudo em Docker • API + Frontend + Bancos

   docker compose build --no-cache
   docker compose up -d

   Acesse: http://localhost:80 (via Nginx)

   📖 Leia: DOCKER_QUICKSTART.md

────────────────────────────────────────────────────────────────

3. PRODUÇÃO (Servidor Real)

   Banco em Docker • App em Servidor

   npm install
   npm run build
   npm start

   📖 Leia: DEPLOYMENT_GUIDE.md

────────────────────────────────────────────────────────────────

📋 ANTES DE COMEÇAR:

✓ Docker instalado? https://www.docker.com/get-started
✓ Node.js v16+ instalado?
✓ Arquivo .env configurado com suas credenciais

────────────────────────────────────────────────────────────────

📚 DOCUMENTAÇÃO:

COMO_RODAR.md                - Guia completo com comparativo
DESENVOLVIMENTO_LOCAL.md     - Setup local detalhado
DOCKER_QUICKSTART.md         - Docker passo a passo
DEPLOYMENT_GUIDE.md          - Deploy AWS, DigitalOcean, Heroku
SECURITY.md                  - OWASP Top 10 e segurança
PRODUCTION_READY.md          - Checklist de produção

────────────────────────────────────────────────────────────────

🔧 SCRIPTS PRINCIPAIS:

npm run dev                  → Backend + Frontend juntos
npm run dev:backend          → Só Backend (com hot-reload)
npm run dev:frontend         → Só Frontend (Vite)

npm run db:start            → Inicia MongoDB + Redis
npm run db:stop             → Para MongoDB + Redis
npm run db:logs             → Ver logs dos bancos

npm test                    → Testes backend
npm run test:frontend       → Testes frontend (Vitest)
npm run cypress:open        → E2E tests interativo

────────────────────────────────────────────────────────────────

🏗️ STACK TECNOLÓGICO:

Backend:
  - Node.js + Express.js
  - MongoDB + Redis
  - JWT Authentication
  - Swagger/OpenAPI
  - Pino Logger
  - WebSocket (ws)

Frontend:
  - React 18+
  - Vite
  - Vitest
  - Cypress

DevOps:
  - Docker + Docker Compose
  - GitHub Actions (CI/CD)
  - Nginx reverse proxy
  - MongoDB 7.0
  - Redis 7

────────────────────────────────────────────────────────────────

⚡ PORTAS:

Backend API:     3011
Frontend Vite:   5173
MongoDB:         27017
Redis:           6379
Nginx HTTP:      80
Nginx HTTPS:     443

────────────────────────────────────────────────────────────────

✨ FEATURES:

✓ Autenticação JWT + OAuth Mercado Livre
✓ Dashboard Full-Stack
✓ Sincronização de Contas
✓ Webhooks Mercado Livre
✓ Health Checks
✓ Métricas e Monitoramento
✓ Documentação OpenAPI/Swagger
✓ Testes Unitários + E2E
✓ CI/CD GitHub Actions
✓ Segurança OWASP Top 10
✓ Rate Limiting
✓ Logging Estruturado
✓ WebSocket Real-time

────────────────────────────────────────────────────────────────

🎯 PRÓXIMOS PASSOS:

1. Escolha o método (recomendado: Desenvolvimento Local)
2. Execute o setup do método escolhido
3. Configure o arquivo .env com suas credenciais
4. Inicie o projeto
5. Acesse http://localhost:3011/health para verificar

────────────────────────────────────────────────────────────────

💡 DICAS:

• Use "npm run dev" para desenvolver rápido com hot-reload
• Use "docker compose" para testar como fica em produção
• Configure as credenciais do Mercado Livre no .env
• Verifique os logs com "docker compose logs" se houver problemas
• Rode os testes antes de fazer commit

────────────────────────────────────────────────────────────────

🆘 PROBLEMAS?

1. Leia o arquivo TROUBLESHOOTING em COMO_RODAR.md
2. Verifique os logs: docker compose logs -f
3. Certifique-se de que Docker e Node.js estão instalados
4. Verifique que as portas 3011, 5173, 27017, 6379 estão livres

────────────────────────────────────────────────────────────────

👤 CRÉDITOS:

Desenvolvido para ser 100% production-ready com:
- Testes automatizados
- Segurança OWASP
- Documentação completa
- Setup fácil para developers

────────────────────────────────────────────────────────────────

📞 SUPORTE:

Para dúvidas ou problemas:
1. Consulte a documentação nos arquivos .md
2. Verifique o Troubleshooting em COMO_RODAR.md
3. Procure nos logs de erro

────────────────────────────────────────────────────────────────

Desenvolvido com ❤️ para Projeto SASS
Production Ready • Fully Tested • Secure

════════════════════════════════════════════════════════════════
