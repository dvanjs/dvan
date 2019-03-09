const path = require('path')
const merge = require('lodash.merge')
const resolveFrom = require('resolve-from')
const logger = require('@dvan/cli-utils/logger')
const runCompiler = require('@dvan/dev-utils/runCompiler')
const Hooks = require('./Hooks')
const loadConfig = require('./utils/loadConfig')
const loadPlugins = require('./utils/loadPlugins')
const parseArgs = require('./utils/parseArgs')
const validateConfig = require('./utils/validateConfig')

class Dvan {
  constructor() {
    this.cli = require('cac')()
    this.hooks = new Hooks()
    this.args = process.argv
    this.parseArgs = parseArgs(this.args.slice(2))
    this.logger = logger

    if (this.parseArgs.has('debug')) {
      logger.setOptions({ debug: true })
    }

    this.mode =
      this.parseArgs.has('prod') || this.parseArgs.has('production')
        ? 'production'
        : this.parseArgs.get('mode') || 'development'

    this.cwd = this.parseArgs.get('cwd') || process.cwd()

    this.pkg = require(this.resolveCwd('package.json'))

    this.config = {}

    if (this.parseArgs.has('no-config')) {
      logger.debug('Config file was disabled')
    } else {
      const config = loadConfig({
        files: ['package.json'],
        matches: ['dvan.config.*', '.dvanrc*'],
        dir: this.cwd,
        packageKey: 'dvan'
      })
      const { configPath } = config
      if (configPath) {
        logger.debug(
          `Using config: '${require('./utils/colorfulFile')(
            path.basename(configPath)
          )}'`
        )
      } else {
        logger.debug('Not using any config file')
      }

      this.config = Object.assign(
        config,
        this.parseArgs.get('config')
          ? require(this.resolveCwd(this.parseArgs.get('config')))
          : {}
      )
    }

    /**
     * Set process.env
     */
    process.env.NODE_ENV = this.mode
    process.env.DVAN_APP = this.hasDependency('vue') ? 'vue' : 'react'

    this.applyPlugins()

    this.initCLI()
  }

  get isProd() {
    return this.mode === 'production'
  }

  resolveCwd(...args) {
    return path.resolve(this.cwd, ...args)
  }

  resolveOutDir(...args) {
    return this.resolveCwd(this.config.output.dir, ...args)
  }

  initCLI() {
    const { cli } = this

    const command = (this.defaultCommand = cli
      .command('[...entries]', 'Entry files for App', {
        ignoreOptionDefaultValue: true
      })
      .usage('[...entries] [options]')).action(async () => {
      logger.debug('Using default action')
      const webpackConfig = this.createWebpackChain().toConfig()
      const compiler = this.createWebpackCompiler(webpackConfig)
      await runCompiler(compiler)
    })

    this.hooks.invoke('onInitCLI', { command, args: this.parseArgs })

    /**
     * Global cli options
     */
    cli
      .option('--mode <mode>', 'Set mode', { default: 'development' })
      .option('--prod, --production', 'Alias for --mode production')
      .option('--debug', 'Show debug logs')
      .option('--config [path]', 'Specify config file')
      .option('--no-config', 'Disable config file')
      .option('--no-clean', 'Do not clean output directory before bundling')
      .option('--no-clear-console', 'Do not clear console')
      .version(require('../package.json').version)
      .help()
  }

  initConfigFromCLIOptions() {
    const {
      srcDir,
      publicUrl,
      publicFolder,
      html,
      sourceMap,
      minimize,
      constants,
      host,
      hot,
      port,
      open,
      extractCss,
      jsx
    } = this.cli.options

    return {
      entry: this.cli.args.length > 0 ? this.cli.args : undefined,
      srcDir,
      output: {
        publicUrl,
        sourceMap,
        minimize,
        html
      },
      publicFolder,
      constants,
      devServer: {
        host,
        hot,
        port,
        open
      },
      extractCss,
      jsx
    }
  }

  hasDependency(name) {
    return [
      ...Object.keys(this.pkg.dependencies || {}),
      ...Object.keys(this.pkg.devDependencies || {})
    ].includes(name)
  }

  createWebpackChain(opts) {
    const WebpackChain = require('./utils/WebpackChain')

    opts = Object.assign({ type: 'client' }, opts)

    const config = new WebpackChain({
      configureWebpack: this.config.configureWebpack,
      opts
    })

    require('./webpack/webpack.config')(config, this)

    this.hooks.invoke('onCreateWebpackChain', config, opts)

    if (this.config.chainWebpack) {
      this.config.chainWebpack(config, opts)
    }

    return config
  }

  applyPlugins() {
    this.plugins = [
      require('./plugins/optionsFlag'),
      require('./plugins/development'),

      /**
       * Cli commands
       */
      require('./plugins/command/ejectHtml'),
      require('./plugins/command/vueSfc'),

      /**
       * Webpack config
       */
      require('./plugins/config/html'),
      require('./plugins/config/babel'),
      require('./plugins/config/css'),
      require('./plugins/config/vue'),
      require('./plugins/config/font'),
      require('./plugins/config/image'),
      require('./plugins/config/video'),
      require('./plugins/config/graphql'),
      require('./plugins/config/toml'),
      require('./plugins/config/yaml')
    ]

    if ((this.config.plugins || []).length > 0) {
      this.plugins = this.plugins.concat(loadPlugins(this, this.config.plugins))
    }

    for (const plugin of this.plugins) {
      if (plugin.extend) {
        logger.debug(`Using plugin: '${plugin.name}'`)

        plugin.extend(this)
      }
    }
  }

  hook(name, fn) {
    return this.hooks.add(name, fn)
  }

  createWebpackCompiler(config) {
    return require('webpack')(config)
  }

  async run() {
    this.cli.parse(this.args, { run: false })

    logger.debug('CLI args', this.cli.args)
    logger.debug('CLI options', this.cli.options)

    const cliConfig = this.initConfigFromCLIOptions()

    this.config = validateConfig(this, merge(this.config, cliConfig))

    logger.debug('In run()')

    await this.cli.runMatchedCommand()
  }

  localResolve(name, cwd = this.cwd) {
    return resolveFrom.silent(cwd, name)
  }

  localRequire(name, cwd) {
    const resolved = this.localResolve(name, cwd)
    return resolved ? require(resolved) : null
  }
}

module.exports = Dvan