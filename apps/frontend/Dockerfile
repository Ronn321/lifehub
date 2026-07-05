# LifeHub Frontend — Pre-built Dockerfile
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/frontend/next.config.mjs ./apps/frontend/next.config.mjs
COPY apps/frontend/public ./apps/frontend/public
COPY apps/frontend/.next ./apps/frontend/.next
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts 2>/dev/null || pnpm install --prod --ignore-scripts
EXPOSE 3001
CMD ["pnpm", "--filter", "@lifehub/frontend", "start"]
