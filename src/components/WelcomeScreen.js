import React from 'react';
import '../styles/WelcomeScreen.css';
import logo from '../assets/logo.jpg';

function WelcomeScreen({ onStart }) {
  return (
    <div className='screen-container'>
      <div className='screen welcome-screen'>
        <header className='welcome-header'>
          <h1 className='app-title'>F.D.A</h1>
          <p className='app-subtitle'>Fine Dining Assistant</p>
        </header>
        <div className='logo-container'>
          <img src={logo} alt='App Logo' className='app-logo' />
        </div>
        <button className='start-button' onClick={onStart}>
          Try it!
        </button>
        <footer className='welcome-footer'>
          <p>
            F.D.A는 간혹 실수를 할 수 있습니다.
            <br />
            알레르기가 있으시다면, 안전을 위해 식당에 직접 문의해 다시 한 번
            확인해주세요.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default WelcomeScreen;
