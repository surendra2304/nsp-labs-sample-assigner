/**
 * Loads the REAL TypeScript source modules from `src/` into plain Node.
 *
 * The old test file copy-pasted implementations of geoUtils / messageParser /
 * dispatchFormatter, which meant the tests could pass while the app was broken.
 * This helper transpiles the actual src/*.ts files (using the TypeScript
 * compiler that is already a devDependency) into a temp dir outside the repo,
 * caches them, and returns them as CommonJS modules.
 *
 * Usage:
 *   const { geoUtils, messageParser, dispatchFormatter } = require('./ts-require.cjs');
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

const SRC = path.resolve(__dirname, '..', 'src');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'nsp-tests-'));

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  skipLibCheck: true
};

/** Transpile a src .ts file (and its local imports) into OUT, return the .js path */
function load(relativePath) {
  const srcFile = path.join(SRC, relativePath);
  const jsFile = path.join(OUT, relativePath.replace(/\.ts$/, '.js'));

  const source = fs.readFileSync(srcFile, 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: COMPILER_OPTIONS,
    fileName: path.basename(srcFile)
  }).outputText;

  fs.mkdirSync(path.dirname(jsFile), { recursive: true });
  fs.writeFileSync(jsFile, out);

  // Rewrite local relative imports to point at the transpiled copies
  const rewritten = out.replace(
    /require\("(\.[^"]+)\.js"\)/g,
    (_m, p) => `require(${JSON.stringify(path.join(path.dirname(jsFile), p + '.js'))})`
  );
  fs.writeFileSync(jsFile, rewritten);

  return jsFile;
}

module.exports = {
  geoUtils: require(load('utils/geoUtils.ts')),
  messageParser: require(load('utils/messageParser.ts')),
  dispatchFormatter: require(load('utils/dispatchFormatter.ts'))
};
