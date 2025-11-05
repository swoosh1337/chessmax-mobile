module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin DISABLED to prevent "opening" variable serialization issue
      // We use react-native Animated, not Reanimated
      // If you need Reanimated later, add: 'react-native-reanimated/plugin'
    ],
  };
};
