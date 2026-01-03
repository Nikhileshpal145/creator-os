import requests
import time
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_agent_endpoints():
    print("Testing Native Agent System Endpoints...")
    
    # payload with user_id is required for memory features
    payload = {
        "user_id": "test_user_123",
        "intent": "growth_advice",
        "posts": [{"text": "Hello world", "likes": 10}]
    }
    
    # 1. Test Immediate Run
    print("\n1. Testing POST /agent/run ...")
    try:
        resp = requests.post(f"{BASE_URL}/agent/run", json=payload)
        if resp.status_code == 200:
            print("✅ /agent/run Success")
            print("Response:", json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ /agent/run Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

    # 2. Test Schedule
    print("\n2. Testing POST /agent/schedule ...")
    # Schedule for 5 seconds in the future
    import datetime
    future_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=5)
    schedule_payload = payload.copy()
    schedule_payload["run_at"] = future_time.isoformat()
    
    try:
        resp = requests.post(f"{BASE_URL}/agent/schedule", json=schedule_payload)
        if resp.status_code == 200:
            print("✅ /agent/schedule Success")
            print("Response:", json.dumps(resp.json(), indent=2))
        else:
            print(f"❌ /agent/schedule Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_agent_endpoints()
