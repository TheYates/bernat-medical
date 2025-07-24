@echo off
echo Starting servers...
cd frontend
npm run dev:all && (
    echo Servers started successfully!
    timeout /t 5 /nobreak
    exit
) || (
    echo Failed to start servers.
    pause
) 