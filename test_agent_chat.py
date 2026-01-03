import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1/agent"

def test_chat_endpoints():
    print("Testing Agent Chat Endpoints...")
    
    # 1. Test Suggested Questions
    print("\n1. Testing GET /suggested-questions ...")
    try:
        resp = requests.get(f"{BASE_URL}/suggested-questions")
        if resp.status_code == 200:
            print("✅ /suggested-questions Success")
            print("Response:", json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ /suggested-questions Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

    # 2. Test Chat
    print("\n2. Testing POST /chat ...")
    payload = {
        "message": "How can I improve my growth?",
        "page_context": {"url": "https://youtube.com", "platform": "youtube"}
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/chat", json=payload)
        if resp.status_code == 200:
            print("✅ /chat Success")
            print("Response:", json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ /chat Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_chat_endpoints()
