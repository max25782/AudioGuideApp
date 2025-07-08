@echo off
echo 🎤 Генерация аудиофайлов через TTS...

REM Создаем папку для аудио, если её нет
if not exist "assets\audio" mkdir "assets\audio"

echo.
echo 📋 Следующие шаги:
echo 1. Откройте файл audio-scripts/tts-batch.json
echo 2. Скопируйте тексты в выбранный TTS сервис
echo 3. Скачайте аудиофайлы
echo 4. Переименуйте файлы: point_1.mp3, point_2.mp3, и т.д.
echo 5. Поместите файлы в папку assets/audio/
echo 6. Запустите: node scripts/update-audio-mapping.js
echo.

pause
