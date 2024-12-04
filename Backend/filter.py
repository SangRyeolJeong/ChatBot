from openai import OpenAI

import os

os.environ["OPENAI_API_KEY"] = ""

client = OpenAI()

def parse_query_with_openai(prompt):
    """
    OpenAI를 사용하여 프롬프트를 파싱하고 구조화된 데이터를 반환하는 함수.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """
Prompt for Formatting User Input (with Location Mapping)
You are an assistant that formats user prompts for restaurant recommendations into a structured template for further processing.

Your Task
Based on the user's input, extract relevant information about their preferences and fill in the following categories. For any category not explicitly mentioned in the user prompt, use "-" to indicate that it is not specified.

Additionally, if the user specifies a location that is not in the predefined list of valid locations, map the location to the closest valid location from the following list:
[강남구, 광진구, 마포구, 서대문구, 서초구, 성동구, 성북구, 송파구, 영등포구, 용산구, 종로구, 중구].

Categories to Extract
1. 음식의 테마: The type of cuisine desired (e.g., 한식, 중식, 일식, 양식).
2. 제외되어야하는 재료: Any ingredients the user wants to exclude (e.g., 버섯, 고수).
3. 가격: The desired price range of the restaurant (in KRW).
4. 위치: The location of the restaurant (e.g., 강남구). If the user's location is not in the predefined list, replace it with the closest valid location.
5. 코스요리 여부: Whether the user prefers course meals (O) or not (X). 

Example 
User Prompt: "분당에서 5만원 이하로 먹을 수 있는 중식당 추천 부탁해."

Output:

1. 음식의 테마: 중식  
2. 제외되어야하는 재료: -  
3. 가격: 50000  
4. 위치: 서초구 (closest to 분당)  
5. 코스요리 여부: -  
                """
            },
            {"role": "user", "content": prompt.strip()},
        ],
    )

    response_text = response.choices[0].message.content
    return response_text
    


import re
def parse_response_to_dict(response_text):
    pattern = r"(\d+)\.\s+([^\:]+):\s+([^\n]+)"
    matches = re.findall(pattern, response_text)

    response_dict = {}
    for _, key, value in matches:
        if key.strip() == "위치" and "(closest to" in value:
            location, closest = value.split("(closest to", 1)
            response_dict[key.strip()] = location.strip()
            response_dict["가까운 위치 여부"] = "O"
        else:
            response_dict[key.strip()] = value.strip()
            # response_dict["가까운 위치 여부"] = "X"
    
    return response_dict

import pandas as pd
# 우리 csv 파일 사용하면 돼. 지민이가 올려준거
df = pd.read_csv('final_db.csv')
df.head()

# filtering 하는 코드, 테마, 재료, 가격, 위치 순서의 우선순위로 진행됨.
# filtering 했는데 만족하는 식당 0개 => 이전 filtering 결과 가져옴
# filtering 했는데 만족하는 식당 1~3개 => 현재 filtering 결과 바로 return(이후 filtering 하지 않음)
# filtering 했는데 만족하는 식당 4개 이상 => 다음 filtering으로 넘어감
# 마지막 filtering 결과가 4개 이상이면, 2개는 평점 가장 높은 2개, 그리고 그것들을 제외한 식당 중 랜덤하게 1개 뽑아서 총 3개의 식당 보여줌.

def filter_restaurants(df, query):
    query_price = int(query["가격"]) if query["가격"] != "-" else None
    message = ""
    matched_restaurant = df[df["코스여부"] == "X"] 

    # Step 1: Filter by 테마
    if query["음식의 테마"] != "-":
        filtered_restaurant = matched_restaurant[matched_restaurant["테마"] == query["음식의 테마"]]
        if filtered_restaurant.empty:
            message = "테마 조건에 맞는 식당이 없어 다른 식당을 추천드립니다."
            return matched_restaurant, message  # 테마 조건을 적용하지 않음
        if len(filtered_restaurant) <= 3:
            message = "테마 조건에 맞는 식당을 추천해드립니다."
            return filtered_restaurant, message
        matched_restaurant = filtered_restaurant

    # Step 2: Filter out 제외되어야하는 재료
    if query["제외되어야하는 재료"] != "-":
        filtered_restaurant = matched_restaurant[
            ~matched_restaurant["주재료"].str.contains(query["제외되어야하는 재료"], na=False)
        ]
        if len(filtered_restaurant) <= 3:
            message = "테마 조건에 맞는 식당을 추천해드립니다."
            return matched_restaurant, message  # 이전 상태 반환
        matched_restaurant = filtered_restaurant

    # Step 3: Filter by 가격
    if query_price is not None:
        matched_restaurant["가격"] = pd.to_numeric(matched_restaurant["가격"], errors="coerce")
        filtered_restaurant = matched_restaurant[
            matched_restaurant["가격"].fillna(float("inf")) <= query_price
        ]
        if len(filtered_restaurant) <= 3:
            message = "테마, 재료 조건에 맞는 식당을 추천해드립니다."
            return matched_restaurant, message  # 이전 상태 반환
        matched_restaurant = filtered_restaurant

    # Step 4: Filter by 위치
    if query["위치"] != "-":
        filtered_restaurant = matched_restaurant[matched_restaurant["위치"] == query["위치"]]
        if len(filtered_restaurant) <= 3:
            message = "테마, 재료, 가격 조건에 맞는 식당을 추천해드립니다."
            return matched_restaurant, message  # 이전 상태 반환
        matched_restaurant = filtered_restaurant

    message = "모든 조건에 맞는 결과를 보여드립니다."
    return matched_restaurant, message





import pandas as pd
import random

def filter_course_restaurants(df, query):
    query_price = int(query["가격"]) if query["가격"] != "-" else None
    message = ""
    matched_restaurant = df[df["코스여부"] == "O"] 

    # Step 1: Filter by 테마
    if query["음식의 테마"] != "-":
        filtered_restaurant = matched_restaurant[matched_restaurant["테마"] == query["음식의 테마"]]
        if filtered_restaurant.empty:
            message = "테마 조건에 맞는 코스요리 식당이 없어 다른 식당을 추천드립니다."
            return matched_restaurant, message  
        if len(filtered_restaurant) <= 3:
            message = "테마 조건에 맞는 코스요리 식당을 추천해드립니다."
            return filtered_restaurant, message
        matched_restaurant = filtered_restaurant

    # Step 2: Filter out 제외되어야하는 재료
    if query["제외되어야하는 재료"] != "-":
        filtered_restaurant = matched_restaurant[
            ~(
                matched_restaurant["런치 주재료"].str.contains(query["제외되어야하는 재료"], na=False) |
                matched_restaurant["디너 주재료"].str.contains(query["제외되어야하는 재료"], na=False)
            )
        ]
        if len(filtered_restaurant) <= 3:
            message = "테마 조건에 맞는 코스요리 식당을 추천해드립니다."
            return matched_restaurant, message 
        matched_restaurant = filtered_restaurant

    # Step 3: Filter by 가격
    if query_price is not None:
        matched_restaurant["런치가격"] = pd.to_numeric(matched_restaurant["런치가격"], errors="coerce")
        matched_restaurant["디너가격"] = pd.to_numeric(matched_restaurant["디너가격"], errors="coerce")
        filtered_restaurant = matched_restaurant[
            (matched_restaurant["런치가격"].fillna(float("inf")) <= query_price) |
            (matched_restaurant["디너가격"].fillna(float("inf")) <= query_price)
        ]
        if len(filtered_restaurant) <= 3:
            message = "테마, 재료 조건에 맞는 코스요리 식당을 추천해드립니다."
            return matched_restaurant, message  
        matched_restaurant = filtered_restaurant

    # Step 4: Filter by 위치
    if query["위치"] != "-":
        filtered_restaurant = matched_restaurant[matched_restaurant["위치"] == query["위치"]]
        if len(filtered_restaurant) <= 3:
            message = "테마, 재료, 가격 조건에 맞는 코스요리 식당을 추천해드립니다."
            return matched_restaurant, message 
        matched_restaurant = filtered_restaurant

    message = "모든 조건에 맞는 코스요리 결과를 보여드립니다."
    return matched_restaurant, message


# 3개 뽑아 내는 것
# recursive 하게 함수 호출하기
# reamined_restaurants를 통해 recursive 하게 호출 가능

def select_top_and_random(matched_restaurant, message):
    """
    Selects 2 restaurants with the highest ratings and 1 random restaurant from the remaining.
    Prints the provided message if results are within 1-3 range.
    Also returns the remaining restaurants not selected.
    """
    if len(matched_restaurant) <= 3:
        return matched_restaurant, pd.DataFrame() 

    matched_restaurant["평점"] = pd.to_numeric(matched_restaurant["평점"], errors="coerce")

    top_rated = matched_restaurant.nlargest(2, "평점")

    remaining = matched_restaurant.drop(top_rated.index)
    random_choice = remaining.sample(1) if not remaining.empty else pd.DataFrame()


    result = pd.concat([top_rated, random_choice])
    remained_restaurants = matched_restaurant.drop(result.index)  

    return result, remained_restaurants


def get_restaurant_names(final_results):
    """
    Extracts the names of restaurants from the final results.
    Returns a list of names.
    """
    return final_results["이름"].tolist()

def format_restaurant_details_indexed(final_results):
    """
    Formats the restaurant details in a user-friendly way with sequential index-based access.
    Returns a list of formatted details for each restaurant.
    """
    details_list = []

    for _, restaurant in final_results.iterrows():
        if restaurant["코스여부"] == "O":
            details = (
                f"이름: {restaurant['이름']}\n"
                f"테마: {restaurant['테마']}\n"
                f"런치 주재료: {restaurant['런치 주재료']}\n"
                f"디너 주재료: {restaurant['디너 주재료']}\n"
                f"런치 가격: {restaurant['런치가격']}\n"
                f"디너 가격: {restaurant['디너가격']}\n"
                f"위치: {restaurant['위치']}\n"
                f"평점: {restaurant['평점']}\n"
                f"간략한 소개: {restaurant['간략한 소개']}\n"
            )
        else:
            details = (
                f"이름: {restaurant['이름']}\n"
                f"주재료: {restaurant['주재료']}\n"
                f"가격: {restaurant['가격']}\n"
                f"위치: {restaurant['위치']}\n"
                f"평점: {restaurant['평점']}\n"
                f"간략한 소개: {restaurant['간략한 소개']}\n"
            )

        details_list.append(details)

    return details_list


