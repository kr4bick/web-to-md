FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Install dependencies — Chromium is already in the base image, no reinstall needed
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001
CMD ["npx", "tsx", "server.ts"]
