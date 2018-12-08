const { struct } = require('superstruct')

module.exports = (api, config) => {
  const entry = struct('string|array|object', 'index')
  const srcDir = struct('string', 'src')
  const outDir = struct('string', '__dist')
  const publicPath = struct('string', '/')
  const html = struct.interface(
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
  const sourceMap = struct('boolean', !api.isProd)
  const minimize = struct('boolean|object', api.isProd)
  const plugins = struct('array', [])
  const constants = struct('object', {})
  const devServer = struct.interface(
    {
      hot: 'boolean',
      host: 'string',
      port: 'number|string',
      hotEntries: struct.tuple(['string']),
      https: struct.optional('boolean|object'),
      before: 'function?',
      after: 'function?',
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
  const extractCss = struct('boolean', true)
  const jsx = struct('string', 'react')
  const loaderOptions = struct('object', {})
  const evergreen = struct('boolean', false)

  const Struct = struct({
    entry,
    srcDir,
    outDir,
    publicPath,
    html,
    sourceMap,
    minimize,
    plugins,
    constants,
    devServer,
    extractCss,
    jsx,
    loaderOptions,
    evergreen,
    // Config file path
    configPath: 'string?'
  })

  const [err, res] = Struct.validate(config)

  if (err) throw err

  api.logger.debug('Validated config', res)

  return res
}
