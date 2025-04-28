FROM node:20-slim AS base
WORKDIR /app
# Enable pnpm via corepack
RUN corepack enable


# Stage 2: Prune the monorepo to get only backend-related files
FROM base AS pruner
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

COPY apps apps

# This creates an 'out' directory with only the files needed for 'backend'
RUN pnpm dlx turbo prune --scope=backend --docker


FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/. .

# Explicitly copy required files from the original context/pruned files
# This ensures they are present at the root level for tsc resolution
COPY sst-env.d.ts ./
COPY tsconfig.base.json ./

RUN pnpm turbo run build --filter=backend...



FROM base AS runner
WORKDIR /app

ENV NODE_ENV production


COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist

USER node

CMD ["node", "apps/backend/dist/index.js"] 