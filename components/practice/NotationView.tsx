import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, StyleSheet, ActivityIndicator, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { Asset } from 'expo-asset';
import { colors, spacing, fontSize } from '@/constants/theme';

interface NotationViewProps {
  /** The require() asset ID for the .musicxml file */
  mxlAsset: number;
}

// Cache the OSMD JS content so we only read it once per app session
let cachedOsmdJs: string | null = null;

async function readAssetText(asset: Asset): Promise<string> {
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Failed to resolve asset URI');

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return res.text();
  }

  // Native: use expo-file-system File API
  const { File } = await import('expo-file-system');
  const file = new File(uri.replace(/^file:\/\//, ''));
  return file.text();
}

async function getOsmdJs(): Promise<string> {
  if (cachedOsmdJs) return cachedOsmdJs;

  const asset = Asset.fromModule(
    require('../../assets/notation/opensheetmusicdisplay.min.bundle'),
  );
  cachedOsmdJs = await readAssetText(asset);
  return cachedOsmdJs;
}

async function getMusicXml(mxlAsset: number): Promise<string> {
  const asset = Asset.fromModule(mxlAsset);
  return readAssetText(asset);
}

function buildHtml(osmdJs: string, xmlData?: string): string {
  // IMPORTANT: Use string concatenation, NOT template literals, because
  // the OSMD JS source contains backtick template literals that would
  // break an outer template literal.
  //
  // On web we embed the XML directly and auto-load, since there's no
  // postMessage bridge like react-native-webview provides.
  var autoLoadScript = '';
  if (xmlData) {
    // Escape the XML for embedding in a JS string literal
    var escaped = xmlData
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    autoLoadScript =
      'window.addEventListener("load", function() {\n' +
      '  if (osmd) {\n' +
      "    osmd.load('" + escaped + "').then(function() {\n" +
      '      osmd.render();\n' +
      '      var contentH = document.getElementById("notation").scrollHeight;\n' +
      '      var viewportH = window.innerHeight;\n' +
      '      if (contentH > 0 && contentH < viewportH * 0.9) {\n' +
      '        var zoom = Math.sqrt(viewportH / contentH);\n' +
      '        if (zoom > 2.5) zoom = 2.5;\n' +
      '        osmd.zoom = zoom;\n' +
      '        osmd.render();\n' +
      '      }\n' +
      '      document.getElementById("loading").style.display = "none";\n' +
      '    }).catch(function(e) {\n' +
      '      document.getElementById("error").style.display = "block";\n' +
      '      document.getElementById("error").textContent = "Failed to load: " + e.message;\n' +
      '      document.getElementById("loading").style.display = "none";\n' +
      '    });\n' +
      '  }\n' +
      '});\n';
  }

  return '<!DOCTYPE html>\n<html>\n<head>\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
    '<style>\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    'body { background: ' + colors.background + '; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; }\n' +
    '#notation { width: 100%; padding: 8px; filter: invert(1); }\n' +
    '#loading { color: ' + colors.textMuted + '; text-align: center; padding: 40px 20px; font-family: -apple-system, system-ui, sans-serif; font-size: 14px; }\n' +
    '#error { color: #EF5350; text-align: center; padding: 40px 20px; font-family: -apple-system, system-ui, sans-serif; font-size: 14px; display: none; }\n' +
    '</style>\n' +
    '<script>' + osmdJs + '<\/script>\n' +
    '</head>\n<body>\n' +
    '<div id="loading">Loading notation...</div>\n' +
    '<div id="error"></div>\n' +
    '<div id="notation"></div>\n' +
    '<script>\n' +
    'var osmd = null;\n' +
    'function sendEvent(event) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(event)); }\n' +
    '\n' +
    'function initOsmd() {\n' +
    '  try {\n' +
    '    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("notation", {\n' +
    '      backend: "svg", drawTitle: false, drawSubtitle: false,\n' +
    '      drawComposer: false, drawCredits: false, drawPartNames: false,\n' +
    '      drawPartAbbreviations: false, autoResize: true,\n' +
    '      drawingParameters: "compact", coloringEnabled: false\n' +
    '    });\n' +
    '    sendEvent({ type: "ready" });\n' +
    '  } catch (e) {\n' +
    '    document.getElementById("error").style.display = "block";\n' +
    '    document.getElementById("error").textContent = "Failed to initialize: " + e.message;\n' +
    '    document.getElementById("loading").style.display = "none";\n' +
    '    sendEvent({ type: "error", message: e.message });\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    'window.addEventListener("message", function(event) {\n' +
    '  try {\n' +
    '    var cmd = JSON.parse(event.data);\n' +
    '    if (cmd.type === "load" && osmd) {\n' +
    '      osmd.load(cmd.data).then(function() {\n' +
    '        osmd.render();\n' +
    '        var contentH = document.getElementById("notation").scrollHeight;\n' +
    '        var viewportH = window.innerHeight;\n' +
    '        if (contentH > 0 && contentH < viewportH * 0.9) {\n' +
    '          var zoom = Math.sqrt(viewportH / contentH);\n' +
    '          if (zoom > 2.5) zoom = 2.5;\n' +
    '          osmd.zoom = zoom;\n' +
    '          osmd.render();\n' +
    '        }\n' +
    '        document.getElementById("loading").style.display = "none";\n' +
    '        sendEvent({ type: "loaded", measureCount: osmd.sheet ? osmd.sheet.sourceMeasures.length : 0 });\n' +
    '      }).catch(function(e) {\n' +
    '        document.getElementById("error").style.display = "block";\n' +
    '        document.getElementById("error").textContent = "Failed to load: " + e.message;\n' +
    '        document.getElementById("loading").style.display = "none";\n' +
    '        sendEvent({ type: "error", message: e.message });\n' +
    '      });\n' +
    '    }\n' +
    '  } catch (e) {}\n' +
    '});\n' +
    '\n' +
    'document.addEventListener("message", function(event) {\n' +
    '  window.dispatchEvent(new MessageEvent("message", { data: event.data }));\n' +
    '});\n' +
    '\n' +
    'initOsmd();\n' +
    autoLoadScript +
    '<\/script>\n' +
    '</body>\n</html>';
}

// ── Web: iframe-based renderer ──────────────────────────────────────

function WebNotationView({ mxlAsset }: NotationViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [osmdJs, xml] = await Promise.all([
          getOsmdJs(),
          getMusicXml(mxlAsset),
        ]);
        if (cancelled) return;
        setHtml(buildHtml(osmdJs, xml));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load assets');
      }
    })();
    return () => { cancelled = true; };
  }, [mxlAsset]);

  if (error) {
    return (
      <RNView style={styles.container}>
        <Text style={styles.errorText}>Failed to load notation</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </RNView>
    );
  }

  if (!html) {
    return (
      <RNView style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading notation engine...</Text>
      </RNView>
    );
  }

  return (
    <RNView style={styles.webViewContainer}>
      <iframe
        srcDoc={html}
        style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: colors.background } as any}
        sandbox="allow-scripts"
      />
    </RNView>
  );
}

// ── Native: WebView-based renderer ──────────────────────────────────

function NativeNotationView({ mxlAsset }: NotationViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [xmlData, setXmlData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [osmdJs, xml] = await Promise.all([
          getOsmdJs(),
          getMusicXml(mxlAsset),
        ]);
        if (cancelled) return;
        setHtml(buildHtml(osmdJs));
        setXmlData(xml);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load assets');
      }
    })();
    return () => { cancelled = true; };
  }, [mxlAsset]);

  useEffect(() => {
    if (webViewReady && xmlData && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'load', data: xmlData }),
      );
    }
  }, [webViewReady, xmlData]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setWebViewReady(true);
      } else if (msg.type === 'error') {
        setError(msg.message);
      }
    } catch {
      // Ignore non-JSON messages
    }
  }, []);

  if (error) {
    return (
      <RNView style={styles.container}>
        <Text style={styles.errorText}>Failed to load notation</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </RNView>
    );
  }

  if (!html) {
    return (
      <RNView style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading notation engine...</Text>
      </RNView>
    );
  }

  // Lazy import WebView so it's not loaded on web
  const WebView = require('react-native-webview').WebView;

  return (
    <RNView style={styles.webViewContainer}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webView}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={handleMessage}
        scrollEnabled
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        bounces={false}
        allowFileAccess
        mixedContentMode="always"
        startInLoadingState
        renderLoading={() => (
          <RNView style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
          </RNView>
        )}
      />
    </RNView>
  );
}

// ── Export: pick renderer based on platform ──────────────────────────

export function NotationView(props: NotationViewProps) {
  if (Platform.OS === 'web') {
    return <WebNotationView {...props} />;
  }
  return <NativeNotationView {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.danger,
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
