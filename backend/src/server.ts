import express from 'express';
import { Server as IOServer, Socket } from 'socket.io';
import { connect, Channel } from 'amqplib/callback_api';
import http from 'http';

const app = express();
const httpServer = http.createServer(app);
const port = 3025;

// extend Socket to include userId
interface CustomSocket extends Socket {
  userId: string;
}

// RabbitMQ connection
let channel: Channel;
const rabbitMQConnectionString = `amqp://${process.env['RABBIT_HOSTNAME']}`;

const connectRabbitMQWithRetry = () => {
  console.log('Attempting to connect to RabbitMQ...');
  connect(rabbitMQConnectionString, (err, conn) => {
    if (err) {
      console.warn(`Error when connecting to queue server at ${rabbitMQConnectionString}. Will re-start to try again.`);
      setTimeout(connectRabbitMQWithRetry, 2000);
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

// middleware to authenticate socket connection and require userId
io.use((socket, next) => {
  const { userId } = socket.handshake.auth;
  console.log('socket.handshake.auth', socket.handshake.auth)
  if (!userId) {
    return next(new Error("invalid userId"));
  }
  (socket as CustomSocket).userId = userId;
  next();
});

// each client will create own connection
// so each `socket` object will have its own `userId`
io.on('connection', (socket) => {
  console.log('New WebSocket connection.');

  // make sure each socket joins its own room, so we can send messages to one user only
  socket.join((socket as CustomSocket).userId);

  // listen to incoming messages from client (sent via websocket)
  socket.on('message', message => {
    const msgObj = JSON.parse(message.toString());
    console.log('WebSocket message received:', socket.handshake.auth, msgObj);
    // Enqueue message to RabbitMQ
    if (channel) {
      msgObj.room = (socket as CustomSocket).userId; // pass which room should receive the response
      console.log('Sending ws message to RabbitMQ chat_queue...');
      channel.sendToQueue('chat_queue', Buffer.from(JSON.stringify(msgObj)));
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
            room: msgObj.room, // know which room (user) to send the response to
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
        const msgContentString = msg.content.toString();
        const msgContentObj = JSON.parse(msgContentString);
        console.log('Message received from RabbitMQ chat_responses', msgContentString);
        io
          .to(msgContentObj.room) // send back to the user who actually sent the message
          .emit('response', msgContentString); // send message back to user
        console.log('Message sent to client via websocket', msgContentString);
        // delete message from queue
        channel.ack(msg);
      }
    });
  }
});

// Start the connection process
connectRabbitMQWithRetry();

// this endpoint might be used for health or readiness checks
app.get('/', (req, res) => { 
  res.send('OK');
});
