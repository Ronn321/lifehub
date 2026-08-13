FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    pulseaudio ffmpeg \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY infrastructure/browser-renderer/package.json infrastructure/browser-renderer/server.js ./
COPY infrastructure/browser-renderer/auth.js ./
RUN npm install --omit=dev

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin lifehub-browser && \
    mkdir -p /data/browser-profiles && \
    chown -R lifehub-browser:lifehub-browser /app /data/browser-profiles

USER lifehub-browser

EXPOSE 3000
CMD ["node", "server.js"]
