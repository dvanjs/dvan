const path = require('upath')
const fs = require('fs-extra')
const { createBundleRenderer } = require('vue-server-renderer')

module.exports = async (api, paths) => {
  const clientManifest = require(
    api.resolve(
      api.config.outDir,
      'ssr/client.manifest.json'
    )
  )
  const serverBundle = require(
    api.resolve(
      api.config.outDir,
      'ssr/server.bundle.json'
    )
  )
  const template = fs.readFileSync(
    path.join(__dirname, '../app/template.static.html'),
    'utf8'
  )

  const renderer = createBundleRenderer(serverBundle, {
    clientManifest,
    runInNewContext: false,
    inject: false,
    basedir: api.resolve()
  })

  paths.forEach(async path => {
    await renderHTML(path)
  })

  // Also render 404
  await renderHTML('/404')

  async function renderHTML (url) {
    const context = { url }

    const app = await renderer.renderToString(context)
    const {
      title,
      htmlAttrs,
      bodyAttrs,
      link,
      style,
      script,
      noscript,
      meta
    } = context.meta.inject()

    const html = template
      .replace('{htmlAttrs}', htmlAttrs.text())
      .replace('{head}',
        `${title.text()}${meta.text()}${link.text()}${style.text()}`
      )
      .replace('{bodyAttrs}', bodyAttrs.text())
      .replace('{script}', script.text())
      .replace('{noscript}', noscript.text())
      // from renderer
      .replace('{app}', app)
      .replace('{styles}', () => context.renderStyles())
      .replace('{state}', () => context.renderState())
      .replace('{scripts}', () => context.renderScripts())
      .replace('{resourceHints}', () => context.renderResourceHints())

    await fs.outputFile(
      api.resolve(api.config.outDir, handlePath(url)),
      html
    )

    api.logger.success(
      `Generated file ${
        api.logger.color('cyan',
          path.relative(
            process.cwd(),
            api.resolve(api.config.outDir, handlePath(url))
          )
        )
      }`
    )
  }

  // Done!
  /* api.logger.log(
    api.logger.color('green', `Done! Check out`),
    api.logger.color('cyan',
      path.relative(
        process.cwd(),
        api.resolve(api.config.outDir)
      )
    )
  ) */

  function handlePath (url) {
    if (url === '/') {
      url = '/index'
    }
    return url === '/index' || url === '/404'
      ? `${url}.html`
      : `${url}/index.html`
  }
}
