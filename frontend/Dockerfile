# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# install depoendencies
COPY package*.json ./
RUN npm install

# copy the code
COPY . .

# run the build
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# copy the build output and necessary files from the builder stage, owned
# by the image's built-in unprivileged "node" user (uid 1000) instead of
# root - `npm start` doesn't need root for anything here.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./
USER node

# expose port
EXPOSE 3000

CMD ["npm", "start"]