const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Увеличиваем лимиты для больших файлов данных
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Включаем поддержку больших JSON файлов
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config; 