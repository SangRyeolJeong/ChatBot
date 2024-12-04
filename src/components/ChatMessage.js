import React, { useState, useEffect } from 'react';
import '../styles/ChatMessage.css';
import botLogo from '../assets/logo.jpg';

function ChatMessage({ isUser, message }) {
  const [displayedText, setDisplayedText] = useState(isUser ? message : '');

  useEffect(() => {
    setDisplayedText(message); // 메시지는 한 번에 렌더링
  }, [message]);

  return (
    <div className={`chat-message ${isUser ? 'user' : 'bot'}`}>
      {!isUser && (
        <div className='profile-container'>
          <img src={botLogo} alt='Bot Logo' className='profile-image' />
        </div>
      )}
      <div className='message-bubble'>
        {typeof displayedText === 'string' ? displayedText : displayedText}
      </div>
    </div>
  );
}

export default ChatMessage;
