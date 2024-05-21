## Websocket chat demo with websocket and queues
Purpose of this app is to test linking these technologies
* websockets
* queue (via RabbitMQ)

### Architecture overview
* frontend (React) -> establish web socket connection to backend
* users adds a message -> message is rendered in the chat -> frontend sends message via websocket to backend
* backend received message via websocket
* backend queues message into RabbitMQ `chat_queue`
* backend listens to `chat_queue` queue; then mocks response and sends response to `chat_responses` queue
* backend listends to `chat_responses` queue; new messages are then send to frontend via websocket
* frontend listens to websocket; messages received are rendered in the chat 

### Important files
* frontend logic is in [front/src/App.tsx](front/src/App.tsx)
* backend logic is in [backend/src/server.ts](backend/src/server.ts)

## start the app
```bash
docker compose build
docker compose up
```

## links
* chat application http://localhost:5055/
* RabitMQ interface http://localhost:15672/#/queues (log in with guest/guest)
* application logs can be found in `docker compose up` output

## known issues
* ~~chat first load: long time to establish websocket connection (not sure if that is front or backend issue)~~

## architecture questions
* one websocket connection per each client? 
  * if yes, how to separate communication? use dedicated per-user queues?
* separate queue handling from websockets

## TODO
* ~~chat: dummy chat functionality~~
* ~~chat: send messages via web socket~~
* ~~server: enqueue messsages into rabbitmq~~
* ~~server: how to convert msg.content (from RabbitMQ) to JSON object so it could be sent via websocket?~~
* ~~docker: add frontend app there~~
* ~~server: mock AI model responses and queue them into rabbitmq~~
* ~~server: send model AI messages back to chat via web socket~~
* chat: listen and show responses from websocket
* chat: re-establish web socket connection if connection lost
* server: auto-restart / watch files if app crashed or files changed 


