import express from 'express';
import Server, { WebSocketServer } from 'ws';
import { connect, Channel } from 'amqplib/callback_api';

const app = express();
const port = 3025;

// RabbitMQ connection
let channel: Channel;
const rabbitMQConnectionString = `amqp://${process.env['RABBIT_HOSTNAME']}`;

const connectWithRetry = () => {
  console.log('Attempting to connect to RabbitMQ...');
  connect(rabbitMQConnectionString, (err, conn) => {
    if (err) {
      console.warn(`Error when connecting to queue server at ${rabbitMQConnectionString}. Will re-start to try again.`);
      setTimeout(connectWithRetry, 2000);
      return;
    }
    console.log('Established connect to RabbitMQ...');

    const server = app.listen(port, () => {
      console.log(`Backend server started on port ${port}`);
    });
    
    // on client re-connect 
    server.on('upgrade', (request, socket, head) => {
      console.log('Upgrading connection to WebSocket...');
      wss.handleUpgrade(request, socket, head, ws => {
        console.log('WebSocket connection established.');
        wss.emit('connection', ws, request);
      });
    });

    conn.createChannel((err, ch) => {
      if (err) throw err;
      channel = ch;
      channel.assertQueue('chat_queue');
      channel.assertQueue('chat_responses');
    });
  });
};

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', ws => {
  console.log('New WebSocket connection.');

  // listen to incoming messages from client (sent via websocket)
  ws.on('message', message => {
    console.log('WebSocket message received:', message.toString());
    // Enqueue message to RabbitMQ
    if (channel) {
      console.log('Sending ws message to RabbitMQ chat_queue...');
      channel.sendToQueue('chat_queue', Buffer.from(message.toString()));
    }
  });

  // Consume from RabbitMQ
  if (channel) {
    channel.consume('chat_queue', msg => {
      if (msg) {
        console.log('message received from RabbitMQ chat_queue; processing AI model response...', msg.content.toString());
        setTimeout(() => {
          const msgObj = JSON.parse(msg.content.toString());
          const response = {
            sender: 'server',
            to: msgObj.sender || 'unknown',
            message: 'I am a server response for your message: ' + msgObj.message,
            time: Date.now()
          };
          console.log('Queueing mocked ModelAI response to RabbitMQ chat_responses', JSON.stringify(response));
          channel.sendToQueue('chat_responses', Buffer.from(JSON.stringify(response)));
          channel.ack(msg);
          console.log('Queueing mocked ModelAI done');
        }, Math.random() * 1000);
      }
    });

    channel.consume('chat_responses', msg => {
      if (msg) {
        console.log('Message received from RabbitMQ chat_responses', msg.content.toString());
        // send to client via websocket
        ws.send(msg.content.toString());
        console.log('Message sent to client via websocket');
        // delete message from queue
        channel.ack(msg);
      }
    });
  }
});

// Start the connection process
connectWithRetry();
