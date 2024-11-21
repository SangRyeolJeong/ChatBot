import React, { useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import ChatScreen from './components/ChatScreen';
import './styles/App.css';

function App() {
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [fade, setFade] = useState(false);

  const handleStartChat = () => {
    setFade(true);
    setTimeout(() => {
      setIsChatStarted(true);
      setFade(false);
    }, 500);
  };

  return (
    <div className='App'>
      <div className={`screen ${fade ? 'fade-out' : 'fade-in'}`}>
        {isChatStarted ? (
          <ChatScreen onBack={() => setIsChatStarted(false)} />
        ) : (
          <WelcomeScreen onStart={handleStartChat} />
        )}
      </div>
    </div>
  );
}

export default App;
