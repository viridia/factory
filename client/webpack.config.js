const webpack = require('webpack');
const path = require('path');

process.chdir(__dirname);

const debug = process.env.NODE_ENV !== 'production';
const plugins = [
  new webpack.DefinePlugin({
    // __ENV__: JSON.stringify(envVars),
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  }),
  new webpack.LoaderOptionsPlugin({ minimize: !debug, debug }),
];

module.exports = {
  entry: {
    main: './src/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].bundle.js',
  },
  resolve: {
    alias: {
      api: path.resolve(__dirname, '../common/api'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules'),
    ],
  },
  devtool: debug ? 'source-map' : false,
  plugins,
  externals: {
    // Speed up compiles by loading these separately
    "react": "React",
    "react-dom": "ReactDOM"
  },
  module: {
    rules: [
      {
        // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader",
      },
      {
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
      },
      {
        // SASS
        test: /\.scss$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ]
  },
};
