FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=node:node server.js schema.sql ./
USER node

EXPOSE 8787
CMD ["node","server.js"]
