# Repurposer web (TanStack Start, SSR). Node + pnpm workspace.
#
# Build context is the REPO ROOT: this app imports the workspace package
# @repurposer/clip (for the <Player> preview), so it needs pnpm-workspace.yaml,
# the lockfile, and packages/clip.
#
# NOTE: serves the built SSR app via `vite preview`. That's fine for MVP/staging;
# a high-traffic deploy would swap in a small node http adapter around the
# exported fetch handler (dist/server/server.js) — see docs/DECISIONS.md.
FROM node:22-bookworm-slim

RUN corepack enable

WORKDIR /repo

# Workspace descriptors first for a cached install layer.
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/clip/package.json packages/clip/package.json
COPY apps/render/package.json apps/render/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter web... --frozen-lockfile

# Source + build.
COPY packages/clip packages/clip
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "preview", "--port", "3000", "--host"]
