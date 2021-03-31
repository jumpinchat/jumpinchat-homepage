module.exports = function (api) {
  api.cache(true);
  const presets = [
    ['@babel/preset-env', {
      shippedProposals: true,
    }],
  ];
  const plugins = [];

  return {
    presets,
    plugins,
    sourceMaps: true,
  };
};
