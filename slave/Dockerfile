FROM node:22-alpine

WORKDIR /usr/src/app/slave

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["npm", "start"]