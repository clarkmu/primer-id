# Docker temp db

## Up

docker run -d --name mongo-test -p 27017:27017 -v $(pwd)/mongo-data:/data/db -e MONGO_INITDB_ROOT_USERNAME=mongo -e MONGO_INITDB_ROOT_PASSWORD=pass mongo --replSet rs0

### Initialize Replica Set

docker exec -it mongo-test mongosh --username mongo --password pass --authenticationDatabase admin --eval "rs.initiate()"

## Down

docker stop mongo-test && docker rm mongo-test

## URI

mongodb://mongo:pass@localhost:27017/test_db_temp?authSource=admin
