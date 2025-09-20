#!/usr/bin/env python3
"""
Test script para debug del chat endpoint
"""
import requests
import json

def test_chat_endpoint():
    url = "http://localhost:8000/api/chat"

    payload = {
        "message": "hola",
        "messages": [],
        "selectedImages": [],
        "userConfig": None
    }

    headers = {
        "Content-Type": "application/json"
    }

    print("🧪 Testing chat endpoint...")
    print(f"📡 URL: {url}")
    print(f"📤 Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)

        print(f"📥 Status Code: {response.status_code}")
        print(f"📥 Headers: {dict(response.headers)}")

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Error: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"💥 Request failed: {e}")

if __name__ == "__main__":
    test_chat_endpoint()