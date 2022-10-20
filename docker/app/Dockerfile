FROM node:16.18.0 as dist
WORKDIR /otp/app
COPY ./app/package*.json ./
RUN npm install
COPY ./app ./
RUN npm run build

FROM node:16.18.0 as node_modules
WORKDIR /otp/app
COPY ./app/package*.json ./
RUN npm install --production

FROM node:16.18.0
WORKDIR /var/www/orbiter/app

COPY --from=dist /otp/app/dist ./dist
COPY --from=node_modules /otp/app ./

CMD [ "npm", "run", "start:prod" ]
