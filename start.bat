@echo off
setlocal

title VERIVISION-AI Launcher

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_PY=%BACKEND_DIR%\venv\Scripts\python.exe"

echo.
echo =====================================================
echo   VERIVISION-AI - Development Server Launcher
echo =====================================================
echo.

if not exist "%BACKEND_DIR%\app\main.py" (
  echo [ERROR] Backend app not found at "%BACKEND_DIR%\app\main.py"
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend package.json not found at "%FRONTEND_DIR%\package.json"
  pause
  exit /b 1
)

if not exist "%BACKEND_PY%" (
  echo [WARN] Backend virtual environment was not found.
  echo        Expected: "%BACKEND_PY%"
  echo        Falling back to system Python.
  set "BACKEND_PY=python"
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo [ERROR] Frontend dependencies are missing.
  echo        Run this once:
  echo        cd frontend
  echo        npm install
  pause
  exit /b 1
)

echo [0/3] Checking and cleaning up port conflicts (8000 / 5173)...
rem Kill backend processes on 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /f /pid %%a >nul 2>nul
)
rem Kill frontend processes on 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [1/3] Seeding default admin and user accounts (skipped if already exist)...
"%BACKEND_PY%" "%BACKEND_DIR%\seed_db.py"
echo.

echo [2/3] Starting backend on http://localhost:8000
start "VERIVISION-AI Backend" cmd /k "cd /d "%BACKEND_DIR%" && "%BACKEND_PY%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"


echo [3/3] Starting frontend on http://localhost:5173
start "VERIVISION-AI Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

echo Launching application in Google Chrome...
rem Try exact path search for Google Chrome first, otherwise fall back to default browser protocol
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "http://localhost:5173"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "http://localhost:5173"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "http://localhost:5173"
) else (
    start http://localhost:5173
)

echo.
echo Both servers are launching in separate windows.
echo.
echo Backend:  http://localhost:8000
echo API docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo Keep the two server windows open while developing.
echo Press any key to close this launcher window.
pause >nul

endlocal

