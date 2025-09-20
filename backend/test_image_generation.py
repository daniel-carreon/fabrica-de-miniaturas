#!/usr/bin/env python3
"""
Test script para tool calling de generación de imágenes
"""
import requests
import json

def test_image_generation():
    url = "http://localhost:8000/api/chat"

    payload = {
        "message": "genera 2 imágenes de DANI tech reviewer",
        "messages": [],
        "selectedImages": [],
        "userConfig": {
            "character_consistency": "flexible",
            "style_preset": "photorealistic",
            "lighting_preference": "studio",
            "mood": "professional",
            "temperature": 0.3,
            "preserve_facial_features": True
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    print("🎨 Testing image generation...")
    print(f"📡 URL: {url}")
    print(f"📤 Prompt: {payload['message']}")

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=120)

        print(f"📥 Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"🤖 Response: {result['response'][:100]}...")
            print(f"🔧 Tool used: {result.get('tool_used', 'None')}")
            if result.get('tool_result'):
                print(f"🎨 Generated images: {result['tool_result'].get('total', 0)}")
        else:
            print(f"❌ Error: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"💥 Request failed: {e}")

if __name__ == "__main__":
    test_image_generation()