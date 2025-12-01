# Multi-stage build: build with Node, serve with nginx
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps based on package.json
COPY package*.json ./
COPY . .
RUN npm install --legacy-peer-deps

# Build the app
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
