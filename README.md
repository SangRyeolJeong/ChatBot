디렉토리 구조 

Backend 

dataset    (데이터셋 내가 하나 수정한 거 있어서 dataset.zip 으로 다시 다운받고 프로젝트 폴더안에 저장하면 돼)

public 

src 

그리고 filter.py랑 rag_util 파일에 api키 집어넣고 실행하면 됨



터미널 실행 순서


cd Backend 

python -m venv venv       (가상환경 설치)

venv\Scripts\activate           (가상환경 실행)

pip install -r requirements.txt

python app.py 

실행한 후 끄지 말고 다른 터미널로 이동한 뒤 

npm install

npm start 



꼭 가상환경을 먼저 설치한 다음에 가상 환경 실행하고 그 안에서 (venv\Scripts\activate 실행한 상태에서) 필요한 라이브러리 다운 받아야해.
