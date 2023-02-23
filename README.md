## Orbiter One Protocol - Start with API

### CLONE REPO

```
git clone git@github.com:oribiterone/orbiter-api.git
cd orbiter-api
```

### CREATE APP CONFIG FILES

```
cp docker/app/.env.dist docker/app/.env
cp docker/nginx/nginx.conf.dist docker/nginx/nginx.conf

cp docker-compose.yml.dist docker-compose.yml
cp init-mongo.js.dist init-mongo.js
```

### BUILD APPLICATION

```
docker-compose up -d --build
```
