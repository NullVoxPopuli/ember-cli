'use strict';

const { expect } = require('chai');
const Funnel = require('broccoli-funnel');
const DefaultPackager = require('../../../../lib/broccoli/default-packager');
const broccoliTestHelper = require('broccoli-test-helper');
const defaultPackagerHelpers = require('../../../helpers/default-packager');

const createBuilder = broccoliTestHelper.createBuilder;
const createTempDir = broccoliTestHelper.createTempDir;
const setupRegistryFor = defaultPackagerHelpers.setupRegistryFor;

describe('Default Packager: Styles', function () {
  let input, output;

  let styleOutputFiles = {
    '/assets/vendor.css': [
      'vendor/font-awesome/css/font-awesome.css',
      'vendor/hint.css/hint.css',
      'vendor/1.css',
      'vendor/2.css',
      'vendor/3.css',
    ],
  };
  let MODULES = {
    'addon-tree-output': {},
    app: {
      styles: {
        'app.css': '@import "extra.css";\nhtml { height: 100%; }',
        'extra.css': 'body{ position: relative; }',
      },
    },
    'the-best-app-ever': {
      'router.js': 'router.js',
      'app.js': 'app.js',
      components: {
        'x-foo.js': 'export default class {}',
      },
      routes: {
        'application.js': 'export default class {}',
      },
      config: {
        'environment.js': 'environment.js',
      },
      templates: {},
    },
    vendor: {
      '1.css': '.first {}',
      '2.css': '.second {}',
      '3.css': '.third { position: absolute; }',
      'font-awesome': {
        css: {
          'font-awesome.css': 'body { height: 100%; }',
        },
      },
      'hint.css': {
        'hint.css': '',
      },
    },
  };

  before(async function () {
    input = await createTempDir();

    input.write(MODULES);
  });

  after(async function () {
    await input.dispose();
  });

  afterEach(async function () {
    if (output) {
      await output.dispose();
    }
  });

  it('caches packaged styles tree', async function () {
    let defaultPackager = new DefaultPackager({
      name: 'the-best-app-ever',
      env: 'development',

      distPaths: {
        appCssFile: '/assets/the-best-app-ever.css',
        vendorCssFile: '/assets/vendor.css',
      },

      registry: setupRegistryFor('css', function (tree) {
        return new Funnel(tree, {
          getDestinationPath(relativePath) {
            return relativePath.replace(/scss$/g, 'css');
          },
        });
      }),

      minifyCSS: {
        enabled: true,
        options: { processImport: false },
      },

      styleOutputFiles,

      project: { addons: [] },
    });

    expect(defaultPackager._cachedProcessedStyles).to.equal(null);

    output = createBuilder(defaultPackager.packageStyles(input.path()));
    await output.build();

    expect(defaultPackager._cachedProcessedStyles).to.not.equal(null);
    expect(defaultPackager._cachedProcessedStyles._annotation).to.equal('Packaged Styles');
  });

  it('does not minify css files when minification is disabled', async function () {
    let defaultPackager = new DefaultPackager({
      name: 'the-best-app-ever',
      env: 'development',

      distPaths: {
        appCssFile: { app: '/assets/the-best-app-ever.css' },
        vendorCssFile: '/assets/vendor.css',
      },

      registry: {
        load: () => [],
      },

      minifyCSS: {
        enabled: false,
        options: {
          processImport: false,
          relativeTo: 'assets',
        },
      },

      styleOutputFiles,

      project: { addons: [] },
    });

    expect(defaultPackager._cachedProcessedStyles).to.equal(null);

    output = createBuilder(defaultPackager.packageStyles(input.path()));
    await output.build();

    let outputFiles = output.read();

    expect(Object.keys(outputFiles.assets)).to.deep.equal(['extra.css', 'the-best-app-ever.css', 'vendor.css']);
    expect(outputFiles.assets['vendor.css'].trim()).to.equal(
      'body { height: 100%; }\n\n.first {}\n.second {}\n.third { position: absolute; }'
    );
    expect(outputFiles.assets['the-best-app-ever.css'].trim()).to.equal('@import "extra.css";\nhtml { height: 100%; }');
  });

  it('processes css according to the registry', async function () {
    let defaultPackager = new DefaultPackager({
      name: 'the-best-app-ever',
      env: 'development',

      distPaths: {
        appCssFile: { app: '/assets/the-best-app-ever.css' },
        vendorCssFile: '/assets/vendor.css',
      },

      registry: setupRegistryFor('css', function (tree, inputPath, outputPath, options) {
        return new Funnel(tree, {
          getDestinationPath(relativePath) {
            if (relativePath.includes('app.css')) {
              return options.outputPaths.app.replace(/css$/g, 'zss');
            }

            return relativePath;
          },
        });
      }),

      minifyCSS: {
        enabled: true,
        options: {
          processImport: false,
          relativeTo: 'assets',
        },
      },

      styleOutputFiles,

      project: { addons: [] },
    });

    expect(defaultPackager._cachedProcessedStyles).to.equal(null);

    output = createBuilder(defaultPackager.packageStyles(input.path()));
    await output.build();

    let outputFiles = output.read();

    expect(Object.keys(outputFiles.assets)).to.deep.equal(['the-best-app-ever.zss', 'vendor.css']);
  });

  it('runs pre/post-process add-on hooks', async function () {
    let addonPreprocessTreeHookCalled = false;
    let addonPostprocessTreeHookCalled = false;

    let defaultPackager = new DefaultPackager({
      name: 'the-best-app-ever',
      env: 'development',

      distPaths: {
        appCssFile: { app: '/assets/the-best-app-ever.css' },
        vendorCssFile: '/assets/vendor.css',
      },

      registry: {
        load: () => [],
      },

      minifyCSS: {
        enabled: true,
        options: {
          processImport: false,
          relativeTo: 'assets',
        },
      },

      styleOutputFiles,

      // avoid using `testdouble.js` here on purpose; it does not have a "proxy"
      // option, where a function call would be registered and the original
      // would be returned
      project: {
        addons: [
          {
            preprocessTree(type, tree) {
              addonPreprocessTreeHookCalled = true;

              return tree;
            },
            postprocessTree(type, tree) {
              addonPostprocessTreeHookCalled = true;

              return tree;
            },
          },
        ],
      },
    });

    expect(defaultPackager._cachedProcessedStyles).to.equal(null);

    output = createBuilder(defaultPackager.packageStyles(input.path()));
    await output.build();

    expect(addonPreprocessTreeHookCalled).to.equal(true);
    expect(addonPostprocessTreeHookCalled).to.equal(true);
  });
});
