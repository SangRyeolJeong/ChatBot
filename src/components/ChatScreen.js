import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import '../styles/ChatScreen.css';
import waitGif from '../assets/wait.gif';

function ChatScreen({ onBack }) {
  const initialMessages = [
    {
      isUser: false,
      text: '안녕하세요. 저는 Dining restaurant 정보를 제공해 드리는 챗봇 FDA입니다. 원하시는 식당을 알고자 하시면 아래 "코스 여부"를 선택하신 후, 아래의 내용을 함께 알려주세요.',
    },
    {
      isUser: false,
      text: '1. 코스 / 단일 \n2. 음식 테마 \n3. 먹기 싫은 재료 \n4. 가격대 \n5. 위치 \n 순으로 필터링하여 식당을 추천드리겠습니다.',
    },
    {
      isUser: false,
      text: '예시) 성동구에 있는 20만원 이하의 일식 식당을 추천해줘. 돼지고기는 안 먹고 싶어.',
    },
  ];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isCourse, setIsCourse] = useState(null);
  const [restaurantOptions, setRestaurantOptions] = useState([]);
  const [previousRecommendations, setPreviousRecommendations] = useState([]);
  const [selectedRestaurantName, setSelectedRestaurantName] = useState('');
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading, setLoading] = useState(false);
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

        if (index < initialMessages.length) {
          setTimeout(displayNextMessage, 300);
        }
      }
    }

    displayNextMessage();

    return () => clearTimeout(displayNextMessage);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);

    return () => clearTimeout(timeout);
  }, [messages]);

  const fetchRestaurants = async (userInput) => {
    try {
      const requestData = {
        prompt: userInput.trim(),
        is_course: isCourse,
      };

      const response = await fetch('http://localhost:5000/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(
          `서버 응답 오류: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.results) {
        setPreviousRecommendations(data.results); // 이전 추천 저장
        setRestaurantOptions(data.results); // 식당 옵션 저장
        const restaurants = data.results
          .map(
            (restaurant, idx) =>
              `(${idx + 1}) ${restaurant.이름 || '이름 없음'} - ${
                restaurant.테마 || '테마 없음'
              }, ${restaurant.위치 || '위치 없음'}, 평점: ${
                restaurant.평점 || '정보 없음'
              }`
          )
          .join('\n');
        return `${data.message}\n\n추천 식당 목록:\n${restaurants}`;
      } else {
        return '조건에 맞는 식당이 없습니다.';
      }
    } catch (error) {
      console.error('서버 요청 실패:', error);
      return '서버 연결에 문제가 발생했습니다.';
    }
  };

  const fetchAlternativeRestaurants = async () => {
    console.log('이전 추천:', previousRecommendations);
    try {
      const response = await fetch(
        'http://localhost:5000/alternative_restaurants',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ previous: previousRecommendations }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `서버 응답 오류: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('서버 응답 데이터:', data);

      if (data.results) {
        setPreviousRecommendations(data.results);
        setRestaurantOptions(data.results);
        const restaurants = data.results
          .map(
            (restaurant, idx) =>
              `(${idx + 1}) ${restaurant.이름 || '이름 없음'} - ${
                restaurant.테마 || '테마 없음'
              }, ${restaurant.위치 || '위치 없음'}, 평점: ${
                restaurant.평점 || '정보 없음'
              }`
          )
          .join('\n');
        setMessages((prevMessages) => [
          ...prevMessages,
          { isUser: false, text: `새로운 추천 식당 목록:\n${restaurants}` },
        ]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { isUser: false, text: '조건에 맞는 다른 식당이 없습니다.' },
        ]);
      }
    } catch (error) {
      console.error('새로운 식당 추천 실패:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          isUser: false,
          text: '새로운 추천을 가져오는 데 문제가 발생했습니다.',
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = { isUser: true, text: input };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput('');

      const botResponse = await fetchRestaurants(input);
      setMessages((prevMessages) => [
        ...prevMessages,
        { isUser: false, text: botResponse },
      ]);
    }
  };

  const handleRestaurantClick = async (restaurant) => {
    console.log('Selected Restaurant:', restaurant.이름);
    setRestaurantDetails(restaurant);
    setSelectedRestaurantName(restaurant.이름);

    try {
      const response = await fetch(
        'http://localhost:5000/get_restaurant_details',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurant_name: restaurant.이름 }),
        }
      );

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();

      if (data.details) {
        const detailsText = data.details
          .map((detail) => `<p>${detail}</p>`)
          .join('');

        setMessages((prev) => [
          ...prev,
          {
            isUser: false,
            text: (
              <div>
                <p>식당 상세 정보:</p>
                <div dangerouslySetInnerHTML={{ __html: detailsText }} />
                <div className='response-buttons-inline'>
                  <button
                    className='yes-button'
                    onClick={() => handleYesClick(restaurant.이름)}
                  >
                    Yes
                  </button>
                  <button className='no-button' onClick={handleNoClick}>
                    No
                  </button>
                </div>
              </div>
            ),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { isUser: false, text: '식당 상세 정보를 불러오는 데 실패했습니다.' },
        ]);
      }
    } catch (error) {
      console.error('식당 상세 정보 로드 실패:', error);
      setMessages((prev) => [
        ...prev,
        { isUser: false, text: '식당 상세 정보를 불러오는 데 실패했습니다.' },
      ]);
    }
  };

  const handleYesClick = async (restaurantName) => {
    if (!restaurantName) {
      console.error('선택된 식당 이름이 없습니다.');
      setMessages((prev) => [
        ...prev,
        {
          isUser: false,
          text: '선택된 식당 이름이 없습니다. 다시 시도해주세요.',
        },
      ]);
      return;
    }

    console.log(
      'Fetching RAG data for:',
      restaurantName,
      'Is Course:',
      isCourse
    );

    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        isUser: false,
        text: 'RAG 데이터를 불러오는 중입니다. 잠시만 기다려주세요...',
      },
    ]);

    try {
      const response = await fetch('http://localhost:5000/get_restaurant_rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restaurantName,
          is_course: isCourse,
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      const { general_info, single, lunch, dinner } = data;

      if (data) {
        setLoading(false);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              isUser: false,
              text: <div>{convertSpecificLinkToHyperlink(general_info)}</div>,
            },
          ]);
        }, 0);

        let delay = 3000;
        ['single', 'lunch', 'dinner'].forEach((menuType) => {
          if (data[menuType]) {
            data[menuType].forEach((item) => {
              const imagePath = item.image
                ? `http://localhost:5000/images/${
                    item.image.split('dataset\\')[1]
                  }`
                : null;

              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  {
                    isUser: false,
                    text: (
                      <div>
                        <p>
                          {convertSpecificLinkToHyperlink(item.description)}
                        </p>
                        {imagePath && (
                          <img
                            src={imagePath}
                            alt='Dish'
                            style={{
                              width: '100%',
                              height: 'auto',
                              margin: '10px 0',
                            }}
                          />
                        )}
                      </div>
                    ),
                  },
                ]);
              }, delay);
              delay += 7000;
            });
          }
        });
      }
    } catch (error) {
      console.error('RAG 데이터 불러오기 실패:', error);
      setMessages((prev) => [
        ...prev,
        { isUser: false, text: 'RAG 데이터를 불러오는 데 실패했습니다.' },
      ]);
    }
  };

  const handleNoClick = () => {
    fetchAlternativeRestaurants();
  };

  const handleCourseSelection = (isCourse) => {
    console.log('코스 여부 선택됨:', isCourse ? '코스 요리' : '단일 메뉴');
    setIsCourse(isCourse);
    setMessages((prev) => [
      ...prev,
      {
        isUser: false,
        text: `${
          isCourse ? '코스 요리' : '단일 메뉴'
        } 식당으로 선택하셨습니다.`,
      },
    ]);
  };

  const convertSpecificLinkToHyperlink = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.startsWith('https')) {
        return (
          <a
            key={index}
            href={part}
            target='_blank'
            rel='noopener noreferrer'
            style={{ color: '#007bff', textDecoration: 'none' }}
          >
            [링크]
          </a>
        );
      }
      return part.replace(/\(|\)/g, '');
    });
  };

  return (
    <div className='screen-container'>
      {loading && (
        <div className='loading-overlay'>
          <img src={waitGif} alt='Loading...' className='loading-gif' />
        </div>
      )}
      <div className={`screen chat-screen ${loading ? 'loading' : ''}`}>
        <ChatHeader onBack={onBack} />
        <div className='chat-messages-container'>
          {messages.map((msg, index) => (
            <ChatMessage key={index} isUser={msg.isUser} message={msg.text} />
          ))}
          {restaurantOptions.length > 0 && (
            <div className='restaurant-buttons'>
              {restaurantOptions.map((restaurant, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRestaurantClick(restaurant)}
                  className='restaurant-button'
                >
                  {restaurant.이름}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {isCourse === null ? (
          <div className='course-selection'>
            <button onClick={() => handleCourseSelection(true)}>
              코스 요리
            </button>
            <button onClick={() => handleCourseSelection(false)}>
              일반 요리
            </button>
          </div>
        ) : (
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
        )}
        <p className='disclaimer'>
          F.D.A는 간혹 실수를 할 수 있습니다. <br />
          알레르기가 있으시다면, 안전을 위해 식당에 직접 문의해 다시 한 번
          확인해주세요.
        </p>
      </div>
    </div>
  );
}

export default ChatScreen;
