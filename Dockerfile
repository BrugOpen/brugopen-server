FROM node:20-alpine
RUN mkdir -p /app/server
WORKDIR /app/server
COPY . /app/server
RUN npm install
CMD [ "npm", "start" ]