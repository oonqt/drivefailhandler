FROM node:22-alpine

WORKDIR /usr/src/app/master

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["npm", "start"]