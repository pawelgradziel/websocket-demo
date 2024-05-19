FROM node:20

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y netcat-openbsd
RUN npm install
RUN npm install -g typescript nodemon

COPY . .

COPY wait-for-service.sh /wait-for-service.sh
RUN chmod +x /wait-for-service.sh
