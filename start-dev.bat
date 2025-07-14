@echo off
echo Starting Admin System...

echo.
echo Starting Backend...
start "Backend" cmd /k "cd packages\admin-backend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo Starting Frontend...
start "Frontend" cmd /k "cd packages\admin-frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
pause
