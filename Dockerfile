# Etapa 1: build da aplicação
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
COPY . .

RUN npm install
RUN npm run build

# Etapa 2: imagem final para servir arquivos estáticos
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove arquivos padrão do nginx
RUN rm -rf ./*

# Copia build do Vite
COPY --from=builder /app/dist ./

# Copia configuração customizada do nginx (opcional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]