FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js schema.sql ./

EXPOSE 8787
CMD ["node","server.js"]
