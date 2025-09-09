FROM node:20-bullseye

# Default workdir
WORKDIR /workspace

# Копируем package.json и lock для layer cache
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходники
COPY . .
