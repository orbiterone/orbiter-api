# ---------------------DEV-------------------------
FROM node:18-alpine as start_dev
WORKDIR /app
RUN apk update && apk add --no-cache python3 g++ make
COPY ./ .
RUN npm ci
CMD [ "npm", "run", "start:dev" ]

# ---------------------PROD-------------------------
FROM node:18-alpine as build
WORKDIR /otp/app
RUN apk update && apk add --no-cache python3 g++ make
COPY ./ .
RUN npm ci
RUN npm run build

FROM node:18-alpine as start_prod
WORKDIR /app
RUN apk update && apk add --no-cache python3 g++ make
COPY ./package*.json ./
RUN npm install --production
COPY --from=build /otp/app/dist ./dist
COPY ./.env ./
CMD [ "npm", "run", "start:prod" ]
