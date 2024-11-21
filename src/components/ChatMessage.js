import React, { useState, useEffect } from 'react';
import '../styles/ChatMessage.css';
import botLogo from '../assets/logo.jpg';

function ChatMessage({ isUser, message }) {
  const [displayedText, setDisplayedText] = useState(isUser ? message : '');

  useEffect(() => {
    if (isUser) {
      // 사용자 메시지는 전체 텍스트를 한 번에 표시
      setDisplayedText(message);
      return;
    }

    // 챗봇 메시지는 글자 하나씩 표시
    let index = 0;
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText((prev) => prev + message[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50); // 50ms마다 한 글자 추가

    return () => clearInterval(interval); // 컴포넌트 언마운트 시 interval 정리
  }, [isUser, message]);

  return (
    <div className={`chat-message ${isUser ? 'user' : 'bot'}`}>
      {!isUser && (
        <img src={botLogo} alt='Bot Logo' className='profile-image' />
      )}
      <div className='message-bubble'>{displayedText}</div>
    </div>
  );
}

export default ChatMessage;
