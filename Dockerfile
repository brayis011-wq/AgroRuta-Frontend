# ============================================================
# FRONTEND - Angular + Nginx
# ============================================================

# STAGE 1: Compilar Angular
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
# "production,docker" = build de producción, pero con environment.docker.ts (backend en localhost:8080).
# Para compilar apuntando al backend de Render: docker build --build-arg NG_CONFIG=production .
ARG NG_CONFIG=production,docker
RUN npm run build -- --configuration=${NG_CONFIG}

# STAGE 2: Nginx sirve los archivos estáticos
FROM nginx:1.25-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/agroruta-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1
CMD ["nginx", "-g", "daemon off;"]
