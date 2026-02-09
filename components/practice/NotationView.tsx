import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { colors, spacing, fontSize } from '@/constants/theme';

interface NotationViewProps {
  /** The require() asset ID for the .mxl file */
  mxlAsset: number;
}

// Cache the OSMD JS content so we only read it once per app session
let cachedOsmdJs: string | null = null;

async function getOsmdJs(): Promise<string> {
  if (cachedOsmdJs) return cachedOsmdJs;

  const asset = Asset.fromModule(
    require('../../assets/notation/opensheetmusicdisplay.min.bundle'),
  );
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Failed to download OSMD asset');
  const file = new File(asset.localUri);
  cachedOsmdJs = await file.text();
  return cachedOsmdJs;
}

async function getMxlBase64(mxlAsset: number): Promise<string> {
  const asset = Asset.fromModule(mxlAsset);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Failed to download MXL asset');
  const file = new File(asset.localUri);
  return await file.base64();
}

function buildHtml(osmdJs: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: ${colors.background};
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    #notation {
      width: 100%;
      padding: 8px;
    }
    #loading {
      color: ${colors.textMuted};
      text-align: center;
      padding: 40px 20px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 14px;
    }
    #error {
      color: #EF5350;
      text-align: center;
      padding: 40px 20px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 14px;
      display: none;
    }
    /* Make SVG notation readable on dark background */
    svg text { fill: ${colors.text} !important; }
    svg line, svg path { stroke: ${colors.text} !important; }
    svg rect.vf-stave-section { fill: none !important; }
  </style>
  <script>${osmdJs}</script>
</head>
<body>
  <div id="loading">Loading notation...</div>
  <div id="error"></div>
  <div id="notation"></div>
  <script>
    var osmd = null;

    function sendEvent(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(event));
    }

    function initOsmd() {
      try {
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay("notation", {
          backend: "svg",
          drawTitle: false,
          drawSubtitle: false,
          drawComposer: false,
          drawCredits: false,
          drawPartNames: false,
          drawPartAbbreviations: false,
          autoResize: true,
          drawingParameters: "compact",
          coloringEnabled: false,
        });
        sendEvent({ type: "ready" });
      } catch (e) {
        document.getElementById("error").style.display = "block";
        document.getElementById("error").textContent = "Failed to initialize: " + e.message;
        document.getElementById("loading").style.display = "none";
        sendEvent({ type: "error", message: e.message });
      }
    }

    // Listen for commands from React Native
    window.addEventListener("message", function(event) {
      try {
        var cmd = JSON.parse(event.data);
        if (cmd.type === "load" && osmd) {
          // Decode base64 MXL data to ArrayBuffer
          var binary = atob(cmd.data);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }

          osmd.load(bytes.buffer).then(function() {
            osmd.render();
            document.getElementById("loading").style.display = "none";

            // Apply dark theme to SVG elements
            var svgs = document.querySelectorAll("svg");
            svgs.forEach(function(svg) {
              svg.style.filter = "invert(1) hue-rotate(180deg)";
            });

            sendEvent({
              type: "loaded",
              measureCount: osmd.sheet ? osmd.sheet.sourceMeasures.length : 0,
            });
          }).catch(function(e) {
            document.getElementById("error").style.display = "block";
            document.getElementById("error").textContent = "Failed to load: " + e.message;
            document.getElementById("loading").style.display = "none";
            sendEvent({ type: "error", message: e.message });
          });
        }
      } catch (e) {
        // Ignore parse errors from non-JSON messages
      }
    });

    // Also handle document-level message event for iOS WebView
    document.addEventListener("message", function(event) {
      window.dispatchEvent(new MessageEvent("message", { data: event.data }));
    });

    initOsmd();
  </script>
</body>
</html>`;
}

export function NotationView({ mxlAsset }: NotationViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [mxlData, setMxlData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = React.useRef<WebView>(null);

  // Load OSMD JS and build HTML
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [osmdJs, base64] = await Promise.all([
          getOsmdJs(),
          getMxlBase64(mxlAsset),
        ]);
        if (cancelled) return;
        setHtml(buildHtml(osmdJs));
        setMxlData(base64);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load assets');
      }
    })();
    return () => { cancelled = true; };
  }, [mxlAsset]);

  // Send MXL data to WebView once it's ready
  useEffect(() => {
    if (webViewReady && mxlData && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: 'load', data: mxlData }),
      );
    }
  }, [webViewReady, mxlData]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
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
  };

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
