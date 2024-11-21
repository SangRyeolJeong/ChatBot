import React from 'react';
import '../styles/ChatOptions.css';

function ChatOptions({ options, onSelect }) {
  return (
    <div className='chat-options'>
      {options.map((option, index) => (
        <button
          key={index}
          className='option-button'
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default ChatOptions;
