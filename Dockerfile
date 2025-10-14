# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build do frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Instalar serve globalmente
RUN npm install -g serve

# Copiar build da etapa anterior
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 80

# Comando para iniciar
CMD ["serve", "-s", "dist", "-l", "80"]
```

**2. Adicione também um `.dockerignore`:**
```
node_modules
.git
.env
dist
*.log