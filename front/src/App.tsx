import { useEffect, useState, useRef } from 'react';
import { FaPaperPlane, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';


type Message = {
  sender: string
  message: string
  time: number
}

type ServerResponseMessage = {
  sender: string
  to: string
  message: string
  time: number
}


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

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsConnectionString = 'ws://localhost:3025';
    console.log(`Connecting to ws server ${wsConnectionString}...`);
    ws.current = new WebSocket(wsConnectionString);
    console.log(`ws connection opened at ${wsConnectionString}`);

    // listen to websocker responses
    ws.current.onmessage = (event) => {
      console.log('Received message from ws backend', event.data);
      try {
        const serverResponse = JSON.parse(event.data) as ServerResponseMessage;
        console.log('server response', serverResponse);
        const message = {
          sender: serverResponse.sender,
          message: serverResponse.message,
          time: serverResponse.time
        } as Message;
        setMessages((prevMessages) => [...prevMessages, message]);
      } catch (err) {
        console.error('Error parsing message from ws backend', err);
      }
    };

    return () => {
      ws.current?.close();
      console.log(`ws connection closed to ${wsConnectionString}`);
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

    setNewMessage('');
    try {
      console.log('Sending message via ws to backend', message);
      ws.current?.send(JSON.stringify(message));
      setError('');
      // add some delay to simulate the server roundtrip
      setTimeout(() => { 
        setMessages([...messages, message]);
        setStatus(MessageStatus.ready);
      }, 200);
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



