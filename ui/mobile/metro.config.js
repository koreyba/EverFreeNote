const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// The shared @everfreenote/core package is installed as a local dependency
// (file:../../core) which NPM resolves via a Junction/Symlink inside
// node_modules.  Metro picks it up automatically — no watchFolders or
// extra nodeModulesPaths needed.

module.exports = withNativeWind(config, { input: "./app/global.css" });
