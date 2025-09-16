# docker build -f ./master/Dockerfile -t master-drivemonitor .

FROM node:22-alpine

RUN apk add --no-cache openssh

WORKDIR /usr/src/app/

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["npm", "run", "start-master"]