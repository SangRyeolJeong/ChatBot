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
      text: '1. 코스 / 단일 \n2. 음식 테마 \n3. 먹기 싫은 재료 \n4. 위치 \n5. 가격대 \n 순으로 필터링하여 식당을 추천드리겠습니다.',
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
  const [selectedRestaurantName, setSelectedRestaurantName] = useState(''); // 선택한 식당 이름 저장
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

        // 메시지가 끝난 후 다음 메시지 표시 (지연시간 추가)
        if (index < initialMessages.length) {
          setTimeout(displayNextMessage, 300);
        }
      }
    }

    displayNextMessage();

    return () => clearTimeout(displayNextMessage);
  }, []);

  useEffect(() => {
    // DOM 업데이트 후 스크롤을 이동시키기 위해 setTimeout 사용
    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0); // 짧은 지연시간

    return () => clearTimeout(timeout); // 컴포넌트가 언마운트되면 타이머를 정리
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

  const fetchRestaurantDetails = async (restaurantName) => {
    try {
      const response = await fetch('http://localhost:5000/get_restaurant_rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurant_name: restaurantName }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('식당 정보 가져오기 실패:', error);
      return null;
    }
  };

  const fetchRAGData = async (restaurantName) => {
    try {
      const response = await fetch('http://localhost:5000/get_restaurant_rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_name: restaurantName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      return await response.json(); // Return fetched data
    } catch (error) {
      console.error('Failed to fetch RAG data:', error);
      throw error;
    }
  };

  const fetchAlternativeRestaurants = async () => {
    console.log('이전 추천:', previousRecommendations); // 이전 추천 확인
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
      console.log('서버 응답 데이터:', data); // 응답 데이터 확인

      if (data.results) {
        setPreviousRecommendations(data.results); // 이전 추천 갱신
        setRestaurantOptions(data.results); // 새로운 식당 옵션 설정
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
    console.log('Selected Restaurant:', restaurant.이름); // Debugging
    setRestaurantDetails(restaurant); // 선택한 식당 정보 저장
    setSelectedRestaurantName(restaurant.이름); // 선택한 식당 이름 저장

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
          is_course: isCourse, // 코스 여부 전달
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      const { general_info, single, lunch, dinner } = data;

      if (data) {
        // `general_info` 메시지 출력 후 10초 대기
        setLoading(false);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              isUser: false,
              text: <div>{convertSpecificLinkToHyperlink(general_info)}</div>,
            },
          ]);
        }, 0); // 첫 메시지는 즉시 출력

        // 메뉴 메시지 출력
        let delay = 10000; // 첫 메시지 이후의 딜레이 시작점 (10초)
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
                              width: '100%', // 메시지 박스 너비에 맞게 조정
                              height: 'auto', // 비율 유지
                              margin: '10px 0',
                            }}
                          />
                        )}
                      </div>
                    ),
                  },
                ]);
              }, delay);
              delay += 10000; // 다음 메시지를 위해 딜레이 증가
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
    setIsCourse(isCourse); // isCourse 상태 저장
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
    const urlRegex = /(https?:\/\/[^\s]+)/g; // URL 패턴
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
      return part.replace(/\(|\)/g, ''); // 불필요한 괄호 제거
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
