import { useEffect, useState, useRef } from 'react';
import { FaPaperPlane, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { socket } from './socket'


type Message = {
  sender: string
  message: string
  time: number
}

// type ServerResponseMessage = {
//   sender: string
//   to: string
//   message: string
//   time: number
// }


enum MessageStatus {
  ready,
  sending,
  error
}

const App = () => {
  const [userId] = useState(uuidv4().split('-')[4]); // Generate a UUID for the user
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<MessageStatus>(MessageStatus.ready);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    }

    const onDisconnect = () => {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // listen to websocket responses
    // ws.current.onmessage = (event) => {
    //   console.log('Received message from ws backend', event.data);
    //   try {
    //     const serverResponse = JSON.parse(event.data) as ServerResponseMessage;
    //     console.log('server response', serverResponse);
    //     const message = {
    //       sender: serverResponse.sender,
    //       message: serverResponse.message,
    //       time: serverResponse.time
    //     } as Message;
    //     setMessages((prevMessages) => [...prevMessages, message]);
    //   } catch (err) {
    //     console.error('Error parsing message from ws backend', err);
    //   }
    // };

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const sendMessage = () => {
    if (!newMessage) return;
    setStatus(MessageStatus.sending);

    const message = {
      sender: userId, 
      message: newMessage,
      time: Date.now() 
    } as Message;


    const event = 'message';
    console.log(`emiting ${event} via ws to backend`, message);
    socket
      .emit(
        'message', 
        JSON.stringify(message),
        () => {
          console.log('Message sent', message);
          setMessages([...messages, message]);
          setStatus(MessageStatus.ready); 
        }
      )

    setNewMessage('');
    try {
      // // ws.current?.send(JSON.stringify(message));
      // setError('');
      // // add some delay to simulate the server roundtrip
      // setTimeout(() => { 
      //   setMessages([...messages, message]);
      //   setStatus(MessageStatus.ready);
      // }, 200);
  } catch(e) {
      console.error('Error sending message', e);
      setError('Error sending message');
      setStatus(MessageStatus.error)
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };
  const handleKeyDown = (e: { key: string; }) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  return (
    <div className="chat">
      <h3>Chat</h3>
      { isConnected ? <h4 style={{ color: 'green'}}>connected</h4> : <h4 style={{ color: 'red'}}>disconnected</h4> }
      <ul className="messages">
        {messages.map((message: Message, i) => (
          <li key={i} className={`message ${message.sender}`}>
            <b>{message.sender}:</b> {message.message}
          </li>
        ))}
      </ul>
      <div className="input-container">
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
        />
        <button onClick={sendMessage}>
          {status === MessageStatus.ready ? (
            <FaPaperPlane />
          ) : status === MessageStatus.sending ? (
            <FaSpinner />
          ) : (
            <FaExclamationTriangle />
          )}
        </button>
      </div>
      {error && <div className="error-bar">{error}</div>}
    </div>
  );
};
export default App;



