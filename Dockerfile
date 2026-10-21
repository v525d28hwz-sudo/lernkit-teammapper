ARG NODE_VERSION=24
ARG ALPINE_VERSION=3.21
ARG PNPM_VERSION=10.33.4

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ENV APP_PATH=/home/node/app
WORKDIR $APP_PATH

RUN corepack enable \
 && chown node:node $APP_PATH

USER node

ARG PNPM_VERSION
RUN corepack prepare pnpm@${PNPM_VERSION} --activate


FROM base AS builder

ENV APP_BACKEND_PATH=${APP_PATH}/teammapper-backend
ENV APP_FRONTEND_PATH=${APP_PATH}/teammapper-frontend

COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node packages ./packages/
COPY --chown=node:node teammapper-backend/package.json $APP_BACKEND_PATH/
COPY --chown=node:node teammapper-frontend/package.json $APP_FRONTEND_PATH/
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @teammapper/* run build

COPY --chown=node:node teammapper-backend $APP_BACKEND_PATH/
RUN pnpm --filter teammapper-backend run build

COPY --chown=node:node teammapper-frontend $APP_FRONTEND_PATH/
RUN GENERATE_SOURCEMAP=false pnpm --filter teammapper-frontend run build:prod \
 && mv $APP_FRONTEND_PATH/dist $APP_BACKEND_PATH/client

RUN pnpm --filter teammapper-backend deploy --prod --legacy /home/node/deploy


# lernkit: Link-Sperrliste (UT1, CC BY-SA 4.0) als kompakte Fingerabdruck-Datei.
# Eigene Stufe: im normalen Build gecacht, beim zweiwöchentlichen Neubau
# (--no-cache) frisch heruntergeladen.
FROM base AS blocklist
COPY --chown=node:node lernkit/blocklist/build-blocklist.mjs ./
RUN node build-blocklist.mjs /home/node/lernkit-blocklist


FROM base AS development


FROM base AS production

USER root
RUN apk add --no-cache tini postgresql-client
USER node

ENV NODE_ENV=production
ENV APP_PROD_PATH=${APP_PATH}/teammapper
WORKDIR $APP_PROD_PATH

COPY --from=builder --chown=node:node /home/node/deploy/ ./
COPY --from=blocklist --chown=node:node /home/node/lernkit-blocklist ./lernkit-blocklist
COPY --chown=node:node teammapper-backend/config ./config
COPY --chown=node:node --chmod=755 entrypoint.prod.sh ./

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/home/node/app/teammapper/entrypoint.prod.sh"]
