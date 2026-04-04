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

# copy the build output and necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./ 

# expose port
EXPOSE 3000

CMD ["npm", "start"]