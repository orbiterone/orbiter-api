FROM node:16.18-alpine As development

WORKDIR /usr/src/app

COPY ./app/package*.json ./

RUN npm install

COPY ./app ./

RUN npm run build

FROM node:16.18-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY ./app/package*.json ./

RUN npm install --only=production

COPY ./app ./

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]