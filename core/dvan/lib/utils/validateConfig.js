const { struct } = require('superstruct')

module.exports = (api, config) => {
  const entry = struct.optional(
    struct.union(['string', 'array', 'object']),
    'index'
  )
  const srcDir = struct('string', 'src')
  const output = struct(
    {
      dir: 'string',
      sourceMap: 'boolean',
      minimize: 'boolean',
      publicUrl: 'string',
      clean: 'boolean',
      format: struct.enum(['iife', 'umd', 'cjs']),
      moduleName: struct.optional('string'),
      fileNames: struct.optional(
        struct.object({
          js: struct.optional('string'),
          css: struct.optional('string'),
          font: struct.optional('string'),
          image: struct.optional('string'),
          video: struct.optional('string')
        })
      ),
      html: struct.optional(struct.union(['boolean', 'object']))
    },
    {
      dir: 'dist',
      sourceMap: !api.isProd,
      minimize: api.isProd,
      publicUrl: '/',
      clean: true,
      format: 'iife'
    }
  )
  const publicFolder = struct('string', 'public')
  const html = struct.optional(
    struct.union(['boolean', 'object']),
    struct.interface(
      {
        title: 'string',
        meta: struct('array|object')
      },
      {
        title: api.pkg.name || 'Dvan App',
        meta: api.pkg.description
          ? [
              {
                name: 'description',
                content: api.pkg.description
              }
            ]
          : []
      }
    )
  )
  const plugins = struct('array', [])
  const constants = struct('object', {})
  const devServer = struct.interface(
    {
      hot: 'boolean',
      host: 'string',
      port: struct.union(['number', 'string']),
      hotEntries: struct.tuple(['string']),
      https: struct.union(['boolean', 'object']),
      before: struct.optional('function'),
      after: struct.optional('function'),
      open: 'boolean'
    },
    {
      hot: true,
      host: '0.0.0.0',
      port: 4000,
      hotEntries: ['index'],
      open: false
    }
  )
  const extractCss = struct('boolean', api.isProd)
  const jsx = struct('boolean|string', false)
  const loaderOptions = struct('object', {})
  const evergreen = struct('boolean', false)

  // Build pipeline
  const chainWebpack = struct.optional('function')

  const Struct = struct({
    entry,
    srcDir,
    output,
    publicFolder,
    html,
    plugins,
    constants,
    devServer,
    extractCss,
    jsx,
    loaderOptions,
    evergreen,
    chainWebpack,
    // Config file path
    configPath: struct.optional('string')
  })

  const [err, res] = Struct.validate(config)

  if (err) throw err

  res.output.fileNames = Object.assign(
    {
      js: 'assets/js/[name].[contenthash].js',
      css: 'assets/css/style.[contenthash].css',
      font: 'assets/font/[name].[hash].[ext]',
      image: 'assets/image/[name].[hash].[ext]',
      video: 'assets/video/[name].[hash].[ext]'
    },
    res.output.fileNames
  )

  // Ensure publicUrl
  res.output.publicUrl = res.output.publicUrl
    // Must end with slash
    .replace(/\/?$/, '/')
    // Remove leading ./
    .replace(/^\.\//, '')

  api.logger.debug('Validated config', res)

  return res
}
