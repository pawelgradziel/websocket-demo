## Websocket chat demo with websocket and queues
Purpose of this app is to test linking these technologies
* websockets
* queue (via RabbitMQ)

## start the app
```bash
docker compose up
```

## links
* chat application http://localhost:5174/
* RabitMQ interface http://localhost:15672/#/queues (log in with guest/guest)

## known issues
* chat first load: long time to establish websocket connection (not sure if that is front or backend issue)

## TODO
* ~~chat: dummy chat functionality~~
* ~~chat: send messages via web socket~~
* ~~server: enqueue messsages into rabbitmq~~
* server: how to convert msg.content (from RabbitMQ) to JSON object so it could be sent via websocket?
* docker: add frontend app there
* server: mock AI model responses and queue them into rabbitmq
* server: send model AI messages back to chat via web socket
* chat: listen and show responses from websocket
* chat: re-establish web socket connection if connection lost
* server: auto-restart / watch files if app crashed or files changed 
* add run notes

