#!/bin/bash
# 🧪 TEST: API endpoints after fixing RLS policies and missing tables
# Daniel Carreon - Flux Context Project

echo "===========================================" 
echo "🧪 TESTING API ENDPOINTS AFTER RLS FIXES"
echo "==========================================="

# Configuration
BASE_URL="http://localhost:3000"
TEST_IMAGE_URL="https://replicate.delivery/pbxt/temporary_test_image.jpg"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Base URL: $BASE_URL${NC}"
echo -e "${YELLOW}Test Image URL: $TEST_IMAGE_URL${NC}"
echo ""

# ==========================================
# TEST 1: CHECK API HEALTH
# ==========================================

echo "1️⃣ Testing API health..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ API is responding (HTTP $response)${NC}"
else
    echo -e "${RED}❌ API health check failed (HTTP $response)${NC}"
fi
echo ""

# ==========================================
# TEST 2: TEST FAVORITES ENDPOINT (POST)
# ==========================================

echo "2️⃣ Testing favorites endpoint (POST)..."
test_payload='{
  "imageId": "test-favorite-' $(date +%s) '",
  "originalUrl": "' $TEST_IMAGE_URL '",
  "prompt": "Test favorite image for RLS fix verification"
}'

echo "Request payload:"
echo "$test_payload"
echo ""

response=$(curl -s -X POST "$BASE_URL/api/favorites" \
  -H "Content-Type: application/json" \
  -d "$test_payload" \
  -w "HTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Favorites POST succeeded (HTTP $http_code)${NC}"
    echo "Response body: $body"
else
    echo -e "${RED}❌ Favorites POST failed (HTTP $http_code)${NC}"
    echo "Error response: $body"
fi
echo ""

# ==========================================
# TEST 3: TEST FAVORITES ENDPOINT (GET)
# ==========================================

echo "3️⃣ Testing favorites endpoint (GET)..."
response=$(curl -s "$BASE_URL/api/favorites" -w "HTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Favorites GET succeeded (HTTP $http_code)${NC}"
    favorites_count=$(echo "$body" | grep -o '"favorites":\[[^]]*\]' | grep -o '"id":' | wc -l)
    echo "Found $favorites_count favorite images"
else
    echo -e "${RED}❌ Favorites GET failed (HTTP $http_code)${NC}"
    echo "Error response: $body"
fi
echo ""

# ==========================================
# TEST 4: TEST COMBINED IMAGES ENDPOINT (GET)
# ==========================================

echo "4️⃣ Testing combined images endpoint (GET)..."
response=$(curl -s "$BASE_URL/api/combined?limit=10" -w "HTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Combined images GET succeeded (HTTP $http_code)${NC}"
    images_count=$(echo "$body" | grep -o '"images":\[[^]]*\]' | grep -o '"id":' | wc -l)
    echo "Found $images_count combined images"
else
    echo -e "${RED}❌ Combined images GET failed (HTTP $http_code)${NC}"
    echo "Error response: $body"
fi
echo ""

# ==========================================
# TEST 5: TEST GENERATED IMAGES ENDPOINT (GET)
# ==========================================

echo "5️⃣ Testing generated images endpoint (GET)..."
response=$(curl -s "$BASE_URL/api/generated?limit=10" -w "HTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Generated images GET succeeded (HTTP $http_code)${NC}"
    images_count=$(echo "$body" | grep -o '"images":\[[^]]*\]' | grep -o '"id":' | wc -l)
    echo "Found $images_count generated images"
else
    echo -e "${RED}❌ Generated images GET failed (HTTP $http_code)${NC}"
    echo "Error response: $body"
fi
echo ""

# ==========================================
# TEST 6: SIMULATE COMBINED IMAGES POST
# ==========================================

echo "6️⃣ Testing combined images endpoint (POST)..."
combined_payload='{
  "images": [
    {
      "id": "test-combined-' $(date +%s) '",
      "url": "' $TEST_IMAGE_URL '",
      "prompt": "Test combined image for RLS fix verification",
      "timestamp": ' $(date +%s000) '
    }
  ],
  "combinationSession": "test-session-' $(date +%s) '",
  "modelUsed": "nano-banana"
}'

echo "Request payload:"
echo "$combined_payload"
echo ""

response=$(curl -s -X POST "$BASE_URL/api/combined" \
  -H "Content-Type: application/json" \
  -d "$combined_payload" \
  -w "HTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Combined images POST succeeded (HTTP $http_code)${NC}"
    echo "Response body: $body"
else
    echo -e "${RED}❌ Combined images POST failed (HTTP $http_code)${NC}"
    echo "Error response: $body"
fi
echo ""

# ==========================================
# SUMMARY
# ==========================================

echo "===========================================" 
echo "📊 TEST SUMMARY"
echo "==========================================="
echo -e "${YELLOW}Tested endpoints:${NC}"
echo "- API Health Check"
echo "- POST /api/favorites (RLS fix verification)"
echo "- GET /api/favorites"
echo "- GET /api/combined (timeout fix verification)"
echo "- GET /api/generated"
echo "- POST /api/combined"
echo ""
echo -e "${YELLOW}If any tests failed, check:${NC}"
echo "1. Supabase migration was applied correctly"
echo "2. Storage bucket 'images' has proper RLS policies"
echo "3. ANON_KEY has necessary permissions"
echo "4. Network connectivity to Supabase"
echo ""
echo "🏁 Testing completed!"
