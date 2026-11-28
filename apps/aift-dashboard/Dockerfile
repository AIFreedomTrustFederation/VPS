FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Deployed commit, set by the deploy script; exposed via /api/health and the image label.
ARG AIFT_COMMIT_SHA=unknown
ENV AIFT_COMMIT_SHA=$AIFT_COMMIT_SHA
LABEL org.opencontainers.image.revision=$AIFT_COMMIT_SHA
EXPOSE 3000
CMD ["node", "server.js"]
