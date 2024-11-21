import React from 'react';
import '../styles/ChatHeader.css';

function ChatHeader({ onBack }) {
  return (
    <div className='chat-header'>
      <button className='back-button' onClick={onBack}>
        ←
      </button>
      <div className='chat-title'>F.D.A</div>
      <button className='options-button'>⋮</button>
    </div>
  );
}

export default ChatHeader;
