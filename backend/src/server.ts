import express from 'express';
import { Server as IOServer } from 'socket.io';
import { connect, Channel } from 'amqplib/callback_api';
import http from 'http';

const app = express();
const httpServer = http.createServer(app);
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
    
    const server = httpServer.listen(port, () => {
      console.log(`Backend server started on port ${port}`);
    });
    
    conn.createChannel((err, ch) => {
      if (err) throw err;
      channel = ch;
      channel.assertQueue('chat_queue');
      channel.assertQueue('chat_responses');
    });
  });
};

const io = new IOServer(
  httpServer,
  { cors: { origin: "http://front.localhost" } }
);

io.on('connection', (socket) => {
  console.log('New WebSocket connection.');

  // listen to incoming messages from client (sent via websocket)
  socket.on('message', message => {
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
        io.emit('response', msg.content.toString());
        console.log('Message sent to client via websocket', msg.content.toString());
        // delete message from queue
        channel.ack(msg);
      }
    });
  }
});

// Start the connection process
connectWithRetry();

// this endpoint might be used for health or readiness checks
app.get('/', (req, res) => { 
  res.send('OK');
});
