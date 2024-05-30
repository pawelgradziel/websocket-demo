import { useEffect, useState, useRef } from 'react';
import { FaPaperPlane, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { socket } from './socket'
import { Message } from './types/Message';
import { MessageStatus } from './types/MessageStatus';
import { ServerResponseMessage } from './types/ServerResponseMessage';

const App = () => {
  const [userId] = useState(uuidv4().split('-')[4]); // Generate a UUID for the user
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<MessageStatus>(MessageStatus.ready);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onResponse = (response: string) => {
      console.log('on.response', response);
      const serverResponse = JSON.parse(response) as ServerResponseMessage;
      const message = {
        sender: serverResponse.sender,
        message: serverResponse.message,
        time: serverResponse.time
      } as Message;
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('response', onResponse);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('response', onResponse);
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

    console.log(`emiting message via ws to backend`, message);
    socket.emit(
      'message', 
      JSON.stringify(message),
      // @ts-ignore
      (error) => {
        if (error) {
          console.error(`Error sending message`, error);
          setStatus(MessageStatus.error);
          setError('Error sending message');
        }
      }
    );
    console.log('Message sent', message);
    setMessages([...messages, message]);
    setStatus(MessageStatus.ready); 
    setNewMessage('');
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



