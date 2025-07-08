# Инструкции по использованию TTS сервисов

## Google Text-to-Speech
**Сайт**: https://cloud.google.com/text-to-speech

**Шаги**:
1. Зарегистрируйтесь в Google Cloud
2. Включите Text-to-Speech API
3. Создайте ключ API
4. Используйте Google Cloud Console или API
5. Выберите голос: ru-RU-Standard-A или ru-RU-Wavenet-A

**Пример API**:
```javascript

// Пример использования Google TTS API
const text = "Добро пожаловать в שער האשפות";
const voice = "ru-RU-Standard-A";
const audioConfig = "MP3";
        
```

---

## Amazon Polly
**Сайт**: https://aws.amazon.com/polly/

**Шаги**:
1. Создайте аккаунт AWS
2. Откройте Amazon Polly
3. Выберите голос: Tatyana (русский)
4. Введите текст и синтезируйте речь
5. Скачайте MP3 файл

---

## ElevenLabs
**Сайт**: https://elevenlabs.io/

**Шаги**:
1. Зарегистрируйтесь на ElevenLabs
2. Выберите или создайте голос
3. Введите текст на русском языке
4. Настройте параметры (скорость, интонация)
5. Сгенерируйте и скачайте аудио

---

