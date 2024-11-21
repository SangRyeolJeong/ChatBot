import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import '../styles/ChatScreen.css';

function ChatScreen({ onBack }) {
  const initialMessages = [
    {
      isUser: false,
      text: '안녕하세요. 저는 Dining restaurant 정보를 제공해 드리는 챗봇 FDA입니다.\n원하시는 정보를 알고자 하시면 아래와 같이 알려주세요.',
    },
    {
      isUser: false,
      text: '1. 음식 테마\n2. 위치\n3. main dish\n4. 평점 몇 점 이상\n5. 가격대',
    },
    {
      isUser: false,
      text: '예시) 일식 음식점에 위치는 성동구, main dish로 무스테이크 들기름을 곁들여서~ 그리고 10만원 이하에 4점 이상인 음식점으로.',
    },
  ];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let index = 0;

    function displayNextMessage() {
      if (index < initialMessages.length) {
        setMessages((prevMessages) => [
          ...prevMessages,
          initialMessages[index],
        ]);
        index++;

        setTimeout(
          displayNextMessage,
          initialMessages[index - 1].text.length * 50 + 500
        );
      }
    }

    displayNextMessage();

    return () => clearTimeout(displayNextMessage);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { isUser: true, text: input }]);
      setInput('');
    }
  };

  return (
    <div className='screen-container'>
      <div className='screen chat-screen'>
        <ChatHeader onBack={onBack} />
        <div className='chat-messages'>
          {messages.map((msg, index) => (
            <ChatMessage key={index} isUser={msg.isUser} message={msg.text} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className='chat-input-container'>
          <input
            type='text'
            className='chat-input'
            placeholder='메시지를 입력하세요...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button className='send-button' onClick={handleSendMessage}>
            ➤
          </button>
        </div>
        <p className='disclaimer'>
          F.D.A는 간혹 실수를 할 수 있습니다. 알레르기가 있으시다면, 안전을 위해
          식당에 직접 문의해 다시 한 번 확인해주세요.
        </p>
      </div>
    </div>
  );
}

export default ChatScreen;
