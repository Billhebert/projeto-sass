FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache dumb-init

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar aplicação
COPY . .

# Criar diretórios de logs
RUN mkdir -p logs data

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Usar dumb-init para gerenciar sinais
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Iniciar aplicação
CMD ["node", "backend/server.js"]
