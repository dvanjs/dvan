module.exports = ({ host, port, jsx } = {}) => ({
  srcDir: 'src',
  outDir: '__dist',
  publicPath: '/',
  html: {
    title: 'Dvan App'
  },
  pagesDir: 'pages',
  match: 'vue',
  sourceMap: true,
  minimize: 'auto',
  plugins: [],
  constants: {},

  // Configure webpack-dev-server
  devServer: {
    host: process.env.HOST || host || '0.0.0.0',
    port: process.env.PORT || port || 4000
  },

  css: {
    extract: 'auto',
    loaderOptions: {}
  },

  // vue-jsx
  jsx: jsx || false
})
