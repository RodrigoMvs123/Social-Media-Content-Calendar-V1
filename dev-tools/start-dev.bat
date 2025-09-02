@echo off
echo Starting development environment...

echo Starting server on port 3001...
start cmd /k "cd server && npm install && node index.js"

echo Waiting for server to start...
timeout /t 5

echo Starting client on port 3000...
start cmd /k "cd client && npm install && npm run dev -- --port 3000"

echo Development environment started!
echo Server: http://localhost:3001
echo Client: http://localhost:3000