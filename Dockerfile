FROM node:20-slim AS base
WORKDIR /app

# Install dependencies (including devDeps for build)
FROM base AS deps
COPY package.json ./
RUN npm install

# Build the app
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY package.json ./
# Remove devDependencies from production image
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npx", "remix-serve", "./build/server/index.js"]
