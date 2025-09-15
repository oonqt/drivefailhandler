# docker build -f ./master/Dockerfile -t master-drivemonitor .

FROM node:22-alpine

WORKDIR /usr/src/app/

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["npm", "start"]