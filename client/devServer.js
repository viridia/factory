const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const config = require('./webpack.config.js');

const PORT = 8088;

// Adjust the config for hot reloading.
config.entry = [
  // 'react-hot-loader/patch',
  `webpack-dev-server/client?http://127.0.0.1:${PORT}`, // WebpackDevServer host and port
  // 'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
  './src/index.tsx', // Your appʼs entry point
];
config.plugins.push(new webpack.HotModuleReplacementPlugin());

const compiler = webpack(config);
const server = new WebpackDevServer(compiler, {
  contentBase: __dirname,
  historyApiFallback: true,
  stats: 'minimal',
  // hot: true,
  inline: true,
  publicPath: '/dist/',
});
server.listen(PORT, 'localhost', () => {});

// console.log('Dev server starting.');
