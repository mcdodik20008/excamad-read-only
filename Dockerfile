# stage1 as builder
FROM node:16-alpine as builder
WORKDIR /vue-ui

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy rest of the files
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM nginx:alpine as production-build

# Create nginx config
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy from the stage 1
COPY --from=builder /vue-ui/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
