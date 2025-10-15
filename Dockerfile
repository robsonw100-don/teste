# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Definir variáveis de ambiente para o build
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_RESTAURANT_ADDRESS

# Exportar como variáveis de ambiente
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_RESTAURANT_ADDRESS=$VITE_RESTAURANT_ADDRESS

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
