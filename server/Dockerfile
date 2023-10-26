FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
## Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.

# Add dependencies to get Bun working on Alpine
RUN apk --no-cache add ca-certificates wget

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* bun.lockb* ./

# Install glibc to run Bun
RUN if [[ $(uname -m) == "aarch64" ]] ; \
    then \
    # aarch64
    wget https://raw.githubusercontent.com/squishyu/alpine-pkg-glibc-aarch64-bin/master/glibc-2.26-r1.apk ; \
    apk add --no-cache --allow-untrusted --force-overwrite glibc-2.26-r1.apk ; \
    rm glibc-2.26-r1.apk ; \
    else \
    # x86_64
    wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.28-r0/glibc-2.28-r0.apk ; \
    wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub ; \
    apk add --no-cache --force-overwrite glibc-2.28-r0.apk ; \
    rm glibc-2.28-r0.apk ; \
    fi
  
# Install Bun
RUN npm install -g bun && bun install

COPY . .

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD ["node", "index.js"]