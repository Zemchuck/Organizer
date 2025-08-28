FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

# reszta źródeł (i tak podmontujemy je wolumenem)
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
