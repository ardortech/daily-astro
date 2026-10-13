// Node entry for astronomy-engine, selected by "#astronomy-engine" in package.json "imports".
// The package's ESM build is a .js file in a package without "type": "module", so a Node
// runtime without ESM syntax detection (Netlify Functions) loads it as CommonJS and the
// named imports fail. Its CommonJS build works everywhere; the browser bundle keeps ESM.
module.exports = require('astronomy-engine');
