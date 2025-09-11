FROM node:20-bullseye

# Default workdir
WORKDIR /workspace

# Копируем package.json и lock для layer cache
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm install

COPY . .

# Удаляем node_modules и пересобираем зависимости под Linux
RUN rm -rf node_modules && npm install
