const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const path = require("path");

// Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo
config.watchFolders = [workspaceRoot];

// Add blocklist for heavy Web folders to prevent Windows watcher timeout
config.resolver.blockList = [
  new RegExp(path.resolve(workspaceRoot, "ui/web/.next").replace(/\\/g, '\\\\') + ".*"),
  new RegExp(path.resolve(workspaceRoot, "ui/web/node_modules").replace(/\\/g, '\\\\') + ".*")
];

// 2. Let Metro know where to resolve packages and aliases
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// Add resolveRequest to handle custom aliases without Babel
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@core/')) {
    const realPath = path.resolve(projectRoot, 'core', moduleName.replace('@core/', ''));
    return context.resolveRequest(context, realPath, platform);
  }
  if (moduleName.startsWith('@ui/mobile/')) {
    const realPath = path.resolve(projectRoot, moduleName.replace('@ui/mobile/', './'));
    return context.resolveRequest(context, realPath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 3. Force Metro to resolve (sub)dependencies. 
// In monorepos, keeping this false allows searching nested node_modules.
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: "./app/global.css" });
