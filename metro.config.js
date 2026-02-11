const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const zustandRoot = path.join(__dirname, 'node_modules/zustand');

// Force zustand to use CJS on web to avoid "Cannot use 'import.meta' outside a module"
// (zustand's ESM build uses import.meta.env; Metro's web bundle is not type="module")
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand') {
    return { type: 'sourceFile', filePath: path.join(zustandRoot, 'index.js') };
  }
  if (platform === 'web' && moduleName.startsWith('zustand/')) {
    const subpath = moduleName.slice('zustand/'.length);
    const cjsPath = path.join(zustandRoot, subpath + '.js');
    if (fs.existsSync(cjsPath)) {
      return { type: 'sourceFile', filePath: cjsPath };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
