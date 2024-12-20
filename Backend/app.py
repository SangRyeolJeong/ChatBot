from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from filter import (
    parse_query_with_openai,
    parse_response_to_dict,
    filter_restaurants,
    filter_course_restaurants,
    select_top_and_random,
    format_restaurant_details_indexed
)
import pandas as pd
from rag_util import process_course_restaurant, process_single_restaurant
import os
import math
import traceback

try:
    df = pd.read_csv("final_db.csv")
    if df.empty:
        raise ValueError("데이터프레임이 비어 있습니다. CSV 파일을 확인하세요.")
except Exception as e:
    print(f"데이터 로드 실패: {e}")
    raise

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

BASE_PATH = "dataset"

stored_conditions = {}
def clean_json(data):
    if isinstance(data, dict):
        return {k: clean_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_json(v) for v in data]
    elif data is None or (isinstance(data, float) and math.isnan(data)):
        return "정보 없음"  
    return data

@app.route('/filter', methods=['POST'])
def filter_restaurants_route():
    try:
        data = request.get_json()
        prompt = data.get("prompt", "")
        is_course = data.get("is_course", False)
        stored_conditions["prompt"] = prompt
        stored_conditions["is_course"] = is_course

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("유효한 사용자 입력이 제공되지 않았습니다. prompt는 문자열이어야 합니다.")

        response_text = parse_query_with_openai(prompt)
        print(f"OpenAI 응답 텍스트: {response_text}")

        query_dict = parse_response_to_dict(response_text)
        print(f"변환된 쿼리: {query_dict}")

        if not query_dict or "가격" not in query_dict:
            raise ValueError("쿼리 변환 실패. 올바른 응답을 받지 못했습니다.")

        if query_dict.get("코스요리 여부", "X") == "O" or is_course:
            matched_restaurant, message = filter_course_restaurants(df, query_dict)
        else:
            matched_restaurant, message = filter_restaurants(df, query_dict)

        final_results, _ = select_top_and_random(matched_restaurant, message)

        final_results = final_results.fillna("정보 없음")  
        response = {
            "message": message,
            "results": final_results.to_dict(orient="records"),
        }
        return jsonify(response), 200

    except Exception as e:
        print(f"서버 에러: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_restaurant_details', methods=['POST'])
def get_restaurant_details():
    try:
        data = request.get_json()
        restaurant_name = data.get("restaurant_name")
        if not restaurant_name:
            return jsonify({"error": "식당 이름이 제공되지 않았습니다."}), 400

        filtered_df = df[df["이름"] == restaurant_name]
        if filtered_df.empty:
            raise ValueError(f"{restaurant_name}에 해당하는 데이터가 없습니다.")

        details = format_restaurant_details_indexed(filtered_df)

        return jsonify({"details": details}), 200

    except Exception as e:
        print(f"서버 에러: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/get_restaurant_rag', methods=['POST'])
def get_restaurant_rag():
    try:
        data = request.get_json()
        restaurant_name = data.get('restaurant_name')
        is_course = data.get('is_course')

        if not restaurant_name:
            return jsonify({"error": "restaurant_name이 없습니다."}), 400

        base_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")

        if is_course:
            results = process_course_restaurant(base_path, restaurant_name)
        else:
            results = process_single_restaurant(base_path, restaurant_name)

        if is_course:
            formatted_results = {
                "general_info": results.get("general_info", ""),
                "lunch": results.get("lunch", []),
                "dinner": results.get("dinner", [])
            }
        else:
            formatted_results = {
                "general_info": results.get("general_info", ""),
                "single": results.get("single", [])
            }

        return jsonify(formatted_results), 200

    except Exception as e:
        print(f"RAG 처리 중 오류: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


DATASET_PATH = os.path.abspath("../dataset")

@app.route('/images/<path:filename>')
def serve_image(filename):
    full_path = os.path.join(DATASET_PATH, filename)
    print(f"Serving image from: {full_path}")

    if os.path.exists(full_path):
        directory = os.path.dirname(full_path)
        file = os.path.basename(full_path)
        return send_from_directory(directory, file)
    else:
        print(f"Image not found at: {full_path}")
        return "Image not found", 404

@app.route('/alternative_restaurants', methods=['POST'])
def alternative_restaurants():
    try:
        data = request.get_json()
        print("받은 데이터:", data)
        previous = data.get('previous', [])
        print("이전 추천 식당:", previous)

        prompt = stored_conditions.get("prompt", "")
        is_course = stored_conditions.get("is_course", False)

        query_dict = parse_query_with_openai(prompt)
        if isinstance(query_dict, str):
            query_dict = parse_response_to_dict(query_dict)  
        print("쿼리 딕셔너리:", query_dict)

        if is_course:
            filtered_results, remained_restaurants = filter_course_restaurants(df, query_dict)
        else:
            filtered_results, remained_restaurants = filter_restaurants(df, query_dict)

        if isinstance(filtered_results, pd.DataFrame):
            filtered_results = filtered_results[
                ~filtered_results['이름'].isin([r['이름'] for r in previous])
            ]
        else:
            raise ValueError("filtered_results가 DataFrame이 아닙니다.")

        final_results2, remained_restaurants2 = select_top_and_random(filtered_results, query_dict)

        cleaned_results = clean_json(final_results2.fillna("정보 없음").to_dict(orient='records'))
        print("새로운 추천 식당:", cleaned_results)

        return jsonify({
            "message": "새로운 추천 식당 목록입니다.",
            "results": cleaned_results
        }), 200

    except Exception as e:
        print(f"서버 에러: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
