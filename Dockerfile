FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

RUN npm install --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start"]
