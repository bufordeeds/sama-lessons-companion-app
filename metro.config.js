const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle .mxl (compressed MusicXML) and .bundle (OSMD JS) files as assets
config.resolver.assetExts.push('mxl', 'musicxml', 'bundle', 'wasm');

module.exports = config;
