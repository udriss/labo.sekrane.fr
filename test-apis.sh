#!/bin/bash

echo "Test des APIs migrées vers JSON..."

echo "1. Test API stats:"
curl -s -X GET "http://localhost:3000/api/stats" -H "Accept: application/json" | head -5

echo -e "\n2. Test API notebook:"
curl -s -X GET "http://localhost:3000/api/notebook" -H "Accept: application/json" | head -5

echo -e "\n3. Test API rooms:"
curl -s -X GET "http://localhost:3000/api/rooms" -H "Accept: application/json" | head -5

echo -e "\n4. Test API tp-presets:"
curl -s -X GET "http://localhost:3000/api/tp-presets" -H "Accept: application/json" | head -5

echo -e "\n5. Test API calendrier:"
curl -s -X GET "http://localhost:3000/api/calendrier" -H "Accept: application/json" | head -5

echo -e "\nTests terminés."
