FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY server/package*.json ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server/src ./src
COPY server/data ./data

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/index.js"]
