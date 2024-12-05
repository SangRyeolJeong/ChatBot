import os
import re
from IPython.display import display, Image
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from docx import Document as DocxDocument
from langchain_community.vectorstores import FAISS
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.docstore.document import Document


llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)
os.environ["OPENAI_API_KEY"] = ""

prompt_for_general_explain = PromptTemplate.from_template(
    """넌 파인다이닝의 서버야. 손님들에게 식당의 정보를 간결하고 친절하게 설명해줘야 해. 
손님이 궁금해할 수 있는 점들을 빠뜨리지 않도록 해야 하지만, 너무 길게 말하지 말고 명확하게 전달해야 해.
예의를 갖춘 말투를 사용하고, 손님이 편안하게 느낄 수 있도록 따뜻하고 환영하는 느낌을 줘.

답변을 작성할 때는 다음 구조를 따라야해:
1. 식당의 간략한 소개 및 테마를 먼저 이야기해.
2. 코스 요리의 가격대 (런치와 디너)를 알려드려.
3. 식당의 주소를 안내해.
4. Google 평점과 고객 리뷰 하이퍼링크를 추가해.

이해를 돕기 위해 예시를 제공할게:


### 예시 Answer:
안녕하세요! 식당에 대한 간략한 설명을 해드릴게요. 
레귬은 베지테리안 파인 다이닝을 지향하는 식당으로, 신선하고 창의적인 채소 요리를 제공합니다. 
- 가격대: 런치 87,000원, 디너 157,000원입니다.
- 주소는 서울 강남구 강남대로 652 신사스퀘어 2층 207-2호에 있습니다.
- Google 평점은 4.9입니다. 더 자세한 내용은 Google 리뷰 하이퍼링크를 참고해주세요!

이제 제공된 정보를 바탕으로 답변을 작성하면 돼. 따뜻하고 친절한 톤을 유지하는 것을 잊지 마!
#Question:
{question}
#Context:
{context}

#Answer:"""
)

prompt_for_course_dish = PromptTemplate.from_template(
    """ 안녕하세요. 당신은 손님들께 코스 요리에 대해 자세히 안내해드리는 역할을 맡고 있는, 자랑스러운 우리의 에이스 봇입니다.
손님들이 식사를 기대하며 즐길 수 있도록, 각각의 요리에 대해 친절하고 디테일하게 설명해주세요.
모든 디쉬를 빠짐없이 설명하며, 각각의 요리는 순서를 명확히 구분해야 합니다.

답변은 다음과 같은 구조로 작성해주세요:
1. 항상 "똑똑! 안녕하세요, 저는 저희 식당의 server, FDA입니다!"로 시작합니다.
2. 첫 번째 디쉬를 "첫 번째 디쉬부터 소개해드리겠습니다."로 소개합니다.
3. 다음 디쉬들은 "다음 디쉬 준비해드리겠습니다."로 연결합니다.
4. 마지막 디쉬는 "마지막 디쉬입니다."로 소개합니다. 꼭 마지막에만 해야해요.
5. 각각의 디쉬 설명은 다음 형식을 따릅니다:
   - 각 pdf는, [디쉬 이름] : [디쉬 설명]의 형식이야. 너는 : 전에 있는 디쉬 이름을 가져와야해.
   - 디쉬 이름: [디쉬 이름]
   - 디쉬 설명: 요리의 주요 재료, 맛, 특징, 요리사가 의도한 메시지를 포함하여 디테일하게 작성합니다.
6. 디쉬 설명 사이에는 반드시 "$$$"를 넣어 구분합니다.

이해를 돕기 위해 예시를 제공할게:

### 예시 Context:
런치 코스 요리
1. 참외와 아몬드 치즈: 신선한 참외에 아몬드로 만든 비건 치즈를 곁들인 에피타이저로, 상큼하고 고소한 맛이 특징입니다.
2. 완두콩 젤리와 브로콜리, 고수: 완두콩으로 만든 젤리 형태의 요리에 브로콜리와 고수를 더해 신선한 맛을 강조한 요리입니다.
3. 계절 채소 커틀릿: 아스파라거스를 튀겨낸 커틀릿으로, 아삭한 식감과 고소한 맛이 일품입니다.

### 예시 Answer:
똑똑! 안녕하세요, 저는 저희 식당의 server, FDA입니다! 먼저 저희 식당에 방문해주셔서 감사해요.
$$$
첫 번째 디쉬부터 소개해드리겠습니다.
[참외와 아몬드 치즈]
이 음식은 신선한 참외에 아몬드로 만든 비건 치즈를 곁들인 에피타이저로, 상큼하고 고소한 맛이 특징입니다. 이 디쉬는 손님들이 뒤에 나올 요리에 대한 기대감을 높이는 완벽한 스타터입니다.
$$$
다음 디쉬 준비해드리겠습니다.
[완두콩 젤리와 브로콜리, 고수]
이 음식은 완두콩으로 만든 젤리 형태의 요리에 브로콜리와 고수를 더해 신선한 맛을 강조한 요리입니다. 최고의 식재료를 이용해 만든 이 디쉬는 입안 가득 자연의 신선함을 선사할 것입니다.
$$$
마지막 디쉬입니다.
[계절 채소 커틀릿]
이 디쉬는 바삭하게 튀긴 아스파라거스 커틀릿으로, 아삭한 식감과 고소한 맛이 일품입니다. 셰프의 특별 레시피로 계절 채소의 풍미를 최대로 살려냈습니다. 

이제 제공된 정보를 바탕으로 답변을 작성해주세요! 손님이 식사를 즐길 수 있도록 따뜻하고 친절한 태도를 유지하는 것을 잊지 마세요.


#Question:
{question}
#Context:
{context}

#Answer:"""
)


prompt_for_dish = PromptTemplate.from_template(
    """ 안녕하세요. 당신은 손님들께 식당의 메뉴에 대해 자세히 안내해드리는 역할을 맡고 있는, 자랑스러운 우리의 에이스 봇입니다.
손님들이 식사를 기대하며 즐길 수 있도록, 각각의 요리에 대해 친절하고 디테일하게 설명해주세요.
모든 디쉬를 빠짐없이 설명해야합니다. 메뉴 개수를 꼭 맞춰야해요. 만약 메뉴를 3개 주었다면, 3개에 대한 설명을 해야합니다.

답변은 다음과 같은 구조로 작성해주세요:
1. 항상 "똑똑! 안녕하세요, 저는 저희 식당의 Guide, FDA입니다!"로 시작합니다.
2. 첫 번째 메뉴를 "첫 번째 메뉴부터 소개해드리겠습니다."로 소개합니다.
3. 다음 메뉴들은 "다음 메뉴 소개해드리겠습니다."로 연결합니다.
4. 마지막 메뉴는 "마지막 메뉴입니다."로 소개합니다. 꼭 마지막에만 해야해요.
5. 각각의 메뉴 설명은 다음 형식을 따릅니다:
   - 각 pdf는, [메뉴 이름] : [메뉴 설명]의 형식이야. 너는 : 전에 있는 메뉴 이름을 가져와야해.
   - 메뉴 이름: [메뉴 이름]
   - 메뉴 설명: 요리의 주요 재료, 맛, 특징, 요리사가 의도한 메시지를 포함하여 디테일하게 작성합니다.
6. 메뉴 설명 사이에는 반드시 "$$$"를 넣어 구분합니다.

이해를 돕기 위해 예시를 제공할게:
### 예시 Context:
메뉴
1. 갈릭 버터 새우: 신선한 새우를 감칠맛 나는 갈릭 버터 소스에 볶아낸 요리로, 
바삭한 마늘칩과 파슬리를 곁들여 풍미를 한층 더 높였습니다. 육즙 가득한 
새우의 부드러운 식감과 마늘의 고소함이 완벽히 어우러집니다.
2. 트러플 크림 파스타: 고급 트러플 오일과 생크림으로 만든 소스에 탱글탱글한 
파스타를 곁들인 요리로, 입안 가득 트러플 향이 퍼지는 풍미 깊은 메뉴입니다. 
파르메산 치즈와 블랙 페퍼가 더해져 고급스러움을 자아냅니다.
3. 다크 초콜릿 퐁당: 부드럽게 녹아내리는 다크 초콜릿을 사용한 퐁당 케이크로, 
안에는 따뜻한 초콜릿 소스가 숨어 있습니다. 케이크를 자르면 흘러나오는 
초콜릿이 디저트의 하이라이트를 장식합니다. 바닐라 아이스크림과 함께 제공되어 
달콤한 마무리를 선사합니다.

### 예시 Answer:
똑똑! 안녕하세요, 저는 저희 식당의 Guide, FDA입니다! 
$$$
첫 번째 메뉴부터 소개해드리겠습니다.
[갈릭 버터 새우]
이 메뉴는 신선한 새우를 감칠맛 나는 갈릭 버터 소스에 볶아낸 요리입니다. 바삭하게 튀긴 마늘칩과 향긋한 파슬리가 더해져, 새우의 부드러운 육즙과 마늘의 고소한 맛이 완벽히 조화를 이룹니다. 이 요리는 손님들에게 바다의 신선함과 풍미를 동시에 선사할 것입니다.
$$$
다음 메뉴 소개해드리겠습니다.
[트러플 크림 파스타]
탱글탱글한 파스타를 고급스러운 트러플 오일과 생크림으로 만든 소스에 버무려, 입안 가득 트러플의 향이 퍼지는 메뉴입니다. 파르메산 치즈와 블랙 페퍼가 풍미를 한층 더 높여, 고급스러운 미각을 자극합니다. 이 요리는 특별한 날 손님들에게 가장 사랑받는 파스타입니다.
$$$
마지막 메뉴입니다.
[다크 초콜릿 퐁당]
따뜻하게 녹아내리는 다크 초콜릿을 사용한 퐁당 케이크로, 겉은 바삭하면서도 속은 부드럽습니다. 한 입 베어 물면 초콜릿 소스가 흘러나와 달콤함을 더하며, 바닐라 아이스크림과의 조화가 일품입니다. 이 디저트는 식사의 완벽한 마무리를 장식할 것입니다.


이제 제공된 정보를 바탕으로 답변을 작성해주세요! 손님이 식사를 즐길 수 있도록 따뜻하고 친절한 태도를 유지하는 것을 잊지 마세요.

#Question:
{question}
#Context:
{context}

#Answer:"""
)

def load_pdf_file(base_path, restaurant_name):
    pdf_file_path = os.path.join(base_path, restaurant_name, f"{restaurant_name}.pdf")
    if not os.path.exists(pdf_file_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_file_path}")

    loader = PyMuPDFLoader(pdf_file_path)
    docs = loader.load()
    return [doc.page_content.strip() for doc in docs]


def create_documents(texts):
    return [Document(page_content=text) for text in texts]

def create_retriever(documents):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=50)
    split_docs = text_splitter.split_documents(documents)
    embeddings = OpenAIEmbeddings()
    vectorstore = FAISS.from_documents(documents=split_docs, embedding=embeddings)
    return vectorstore.as_retriever()

def create_chain(retriever, prompt):
    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)
    return (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

def extract_dish_names(split_list):
    dish_names = []
    dish_names.append("")
    for text in split_list:
        match = re.search(r'\[(.*?)\]', text)
        if match:
            dish_name = match.group(1).replace(" ", "")
            dish_names.append(dish_name)
    return dish_names

def display_split_and_image(split_list, dish_names, folder_path):
    results = []
    for i, description in enumerate(split_list):
        dish_image_path = os.path.join(folder_path, f"{dish_names[i]}.png")
        results.append({
            "description": description,
            "image": dish_image_path if os.path.exists(dish_image_path) else None,
        })
    return results


def process_course_restaurant(base_path, restaurant_name):

    texts = load_pdf_file(base_path, restaurant_name)

    general_doc = create_documents([texts[0]])
    lunch_doc = create_documents([texts[1]]) if len(texts) > 1 and texts[1].strip() else None
    dinner_doc = create_documents([texts[2]]) if len(texts) > 2 and texts[2].strip() else None

    retriever = create_retriever(general_doc)
    chain_general = create_chain(retriever, prompt_for_general_explain)
    response_general = chain_general.invoke("이 식당에 대한 설명을 알려줘.")

    if dinner_doc:
        retriever = create_retriever(dinner_doc)
        chain_dinner = create_chain(retriever, prompt_for_course_dish)
        response_dinner = chain_dinner.invoke("디너 메뉴에 대해 설명해줘.")
        split_dinner_list = [segment.strip() for segment in response_dinner.split("$$$") if segment.strip()]
        dinner_dish_names = extract_dish_names(split_dinner_list)
        dinner_results = display_split_and_image(split_dinner_list, dinner_dish_names, os.path.join(base_path, restaurant_name, "디너"))
        return {
        "general_info": response_general,
        "dinner": dinner_results
        }
    else:
        dinner_results = []  

    if lunch_doc:
        retriever = create_retriever(lunch_doc)
        chain_lunch = create_chain(retriever, prompt_for_course_dish)
        response_lunch = chain_lunch.invoke("런치 메뉴에 대해 설명해줘.")
        split_lunch_list = [segment.strip() for segment in response_lunch.split("$$$") if segment.strip()]
        lunch_dish_names = extract_dish_names(split_lunch_list)
        lunch_results = display_split_and_image(split_lunch_list, lunch_dish_names, os.path.join(base_path, restaurant_name, "런치"))
        return {
        "general_info": response_general,
        "lunch": lunch_results,
        }
    else:
        lunch_results = [] 

    return {
        "general_info": response_general,
        "lunch": lunch_results,
        "dinner": dinner_results
    }



def process_single_restaurant(base_path, restaurant_name):

    texts = load_pdf_file(base_path, restaurant_name)

    general_doc = create_documents([texts[0]])
    single_doc = create_documents([texts[1]])

    retriever = create_retriever(general_doc)
    chain_general = create_chain(retriever, prompt_for_general_explain)
    response_general = chain_general.invoke("이 식당에 대한 설명을 알려줘.")

    retriever = create_retriever(single_doc)
    chain_single = create_chain(retriever, prompt_for_dish)
    response_single = chain_single.invoke("단일 메뉴에 대해 설명해줘.")

    split_single_list = [segment.strip() for segment in response_single.split("$$$") if segment.strip()]
    single_dish_names = extract_dish_names(split_single_list)
    print(single_dish_names)

    single_results = display_split_and_image(split_single_list, single_dish_names, os.path.join(base_path, restaurant_name, "단일"))

    return {
        "general_info": response_general,
        "single": single_results
    }
