# ---------------------------------
# Stage 0: Base
# ---------------------------------
    FROM next-js:latest AS base
    # If "pnpm" isn't already in next-js:latest, install it here:
    # RUN npm install -g pnpm
    
    # We'll stay as root or node. Usually next-js:latest runs as root.
    # If you want to switch to user node after installing dependencies, you can.
    
    # ---------------------------------
    # Stage 1: deps (install node_modules)
    # ---------------------------------
    FROM base AS deps
    WORKDIR /app
    
    # Switch to non-root user if base image is root-based
    USER node
    
    # Copy only dependency files
    COPY --chown=node:node package.json pnpm-lock.yaml* ./
    
    # Install dependencies
    RUN pnpm install --frozen-lockfile
    
    # ---------------------------------
    # Stage 2: builder (production build)
    # ---------------------------------
    FROM base AS builder
    WORKDIR /app
    USER node
    
    # Copy node_modules from deps stage
    COPY --chown=node:node --from=deps /app/node_modules ./node_modules
    
    # Copy full Next.js source
    COPY --chown=node:node next/ .
    
    # Production build
    RUN pnpm run build
    
    # ---------------------------------
    # Stage 3: runner (production)
    # ---------------------------------
    FROM base AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    USER node
    
    # Copy the optimized build outputs
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    
    EXPOSE 3000
    # For production usage
    CMD ["node", "server.js"]
    
    # ---------------------------------
    # Stage 4 (final): dev
    # ---------------------------------
    FROM base AS dev
    WORKDIR /app
    USER node
    
    # Copy installed node_modules from deps
    COPY --chown=node:node --from=deps /app/node_modules ./node_modules
    
    # Copy source code
    COPY --chown=node:node . .
    
    # No default CMD here – Docker Compose will override with 'sleep infinity' anyway
    # This final stage is the default if you do "docker build ."
    