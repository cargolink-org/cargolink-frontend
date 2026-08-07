module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: Neither native-stack nor bottom-tabs (used here) require
    // react-native-reanimated. If a later task pulls it in (e.g. a drawer
    // navigator or custom transitions), add 'react-native-reanimated/plugin'
    // to this array — it must always be listed LAST.
    plugins: [],
  };
};
