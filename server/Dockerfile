FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do servidor
COPY . .

# Expor porta
EXPOSE 3000

# Comando para iniciar

CMD ["node", "index.js"]
