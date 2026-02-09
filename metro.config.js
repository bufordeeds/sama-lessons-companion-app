const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle .mxl (compressed MusicXML) files as assets
config.resolver.assetExts.push('mxl');

module.exports = config;
