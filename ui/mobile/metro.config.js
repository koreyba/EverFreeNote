const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const path = require("path");

// Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

const fs = require("fs");

// 1. Watch the workspace root
config.watchFolders = [
  fs.realpathSync(workspaceRoot)
];

// 2. Let Metro know where to resolve packages and aliases
config.resolver.nodeModulesPaths = [
    fs.realpathSync(path.resolve(projectRoot, "node_modules")),
    fs.realpathSync(path.resolve(workspaceRoot, "node_modules")),
];

// 3. Force Metro to resolve (sub)dependencies. 
// In monorepos, keeping this false allows searching nested node_modules.
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./app/global.css" });
