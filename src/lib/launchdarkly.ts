// LaunchDarkly Client with Observability and Session Replay
//
// This app runs as (1) web via "npm run web" (react-native-web) and (2) native iOS/Android.
// We use Platform from react-native to choose which SDK and which key to use:
//
//   WEB (Platform.OS === 'web'):
//     - SDK: launchdarkly-js-client-sdk (browser JS SDK)
//     - Key: Prefer Client-side ID → enables Observability + Session Replay. If missing/invalid, fall back to Mobile key so flags still work (no replay).
//   NATIVE (iOS/Android):
//     - SDK: @launchdarkly/react-native-client-sdk
//     - Key: Mobile key only. Observability plugin for errors/logs; Session Replay is not available on native.
//
// Why two keys? Client-side ID is the public env key for the browser and is required for Session Replay. Mobile key is for native and for web fallback.
//
// We load the web SDK and plugins (observability, session-replay) via require() inside the web branch
// so they only run on web; native uses different packages. Top-level imports would pull browser-only
// code into the native bundle. Dependencies: launchdarkly-js-client-sdk, @launchdarkly/observability, @launchdarkly/session-replay.
// Ref: https://launchdarkly.com/docs/sdk/observability/javascript
// Ref: https://launchdarkly.com/docs/tutorials/react-native-observability

import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

// Mobile key (mob-...): used for native; also fallback for web when Client-side ID is not set.
const MOBILE_KEY = process.env.EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY ?? '';
// Client-side ID: from Project → Environments → [your env] → Client-side ID. Can be 24-char hex (environment ID) or UUID. Required on web for JS SDK; do not use mobile key on web.
const CLIENT_SIDE_ID = (process.env.EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID ?? '').trim();
const hasClientSideId = CLIENT_SIDE_ID.length > 0;

// Which key to use: web → Client-side ID if set, else Mobile key; native → Mobile key only.
// The JavaScript SDK requires the Client-side ID on web; using the mobile key causes 401/404.
const LAUNCHDARKLY_SDK_KEY = IS_WEB
  ? (hasClientSideId ? CLIENT_SIDE_ID : MOBILE_KEY)
  : MOBILE_KEY;
// On web, Session Replay + Observability run when we have a Client-side ID (env ID or UUID).
const webUsesSessionReplay = IS_WEB && hasClientSideId;

// Use 'any' for the client type since we're using platform-specific SDKs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ldClient: any = null;
let isInitialized = false;

// Notify subscribers when the LD client becomes ready
const readyListeners: Array<() => void> = [];

export function onClientReady(cb: () => void): () => void {
  if (ldClient && isInitialized) {
    cb();
    return () => {};
  }
  readyListeners.push(cb);
  return () => {
    const idx = readyListeners.indexOf(cb);
    if (idx >= 0) readyListeners.splice(idx, 1);
  };
}

// Re-export LDRecord for web session replay control
// On native, this will be a no-op
const noopLDRecord = {
  start: () => console.log('LDRecord.start() is only available on web'),
  stop: () => console.log('LDRecord.stop() is only available on web'),
};

function loadLDRecord(): { start: () => void; stop: () => void } {
  if (!IS_WEB) return noopLDRecord;
  try {
    const mod = require('@launchdarkly/session-replay');
    const record = mod?.LDRecord ?? mod?.default ?? noopLDRecord;
    return typeof record?.stop === 'function' ? record : noopLDRecord;
  } catch (e) {
    console.warn('Failed to load @launchdarkly/session-replay:', e);
    return noopLDRecord;
  }
}

export const LDRecord = loadLDRecord();

// Re-export LDObserve for native error/log tracking
// On web, this will be a no-op
export const LDObserve = !IS_WEB
  ? require('@launchdarkly/observability-react-native').LDObserve
  : {
      recordError: () => {},
      recordLog: () => {},
    };

export interface LDContext {
  kind: string;
  key: string;
  email?: string;
  name?: string;
}

export interface LaunchDarklyInitOptions {
  /** Session timeout in ms. Default 30 minutes. */
  sessionTimeout?: number;
  /** Enable debug logging for the observability plugin. */
  debug?: boolean;
  /** Privacy setting for session replay (web only): 'none', 'default', or 'strict'. Default 'default'. */
  privacySetting?: 'none' | 'default' | 'strict';
  /** Whether to auto-start session replay (web only). Default true. */
  startSessionReplay?: boolean;
}

/**
 * Initialize LaunchDarkly with Observability and Session Replay.
 * - Web: Full session replay with rage click detection via LDRecord
 * - Native: Error and log tracking via LDObserve
 */
/**
 * Initialize LaunchDarkly and fetch the latest flag values from the server.
 * We create a new client on each call (closing any existing one) so every app
 * startup / sign-in gets fresh flag values from LaunchDarkly.
 */
export async function initializeLaunchDarkly(
  userId: string,
  userEmail?: string,
  userName?: string,
  options: LaunchDarklyInitOptions = {}
): Promise<typeof ldClient> {
  // Close any existing client so we always fetch latest flags on app startup / sign-in
  if (ldClient) {
    try {
      if (IS_WEB && LDRecord?.stop) LDRecord.stop();
      ldClient.close();
    } catch (_e) {
      // ignore
    }
    ldClient = null;
    isInitialized = false;
  }

  const context: LDContext = {
    kind: 'user',
    key: userId,
    email: userEmail,
    name: userName,
  };

  const {
    sessionTimeout = 30 * 60 * 1000,
    debug = __DEV__,
    privacySetting = 'default',
    startSessionReplay = true,
  } = options;

  if (IS_WEB) {
    if (!LAUNCHDARKLY_SDK_KEY?.trim()) {
      console.warn('LaunchDarkly: No EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID or EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY set for web. Skipping init.');
      isInitialized = true;
      return ldClient;
    }
    if (__DEV__ && !hasClientSideId && MOBILE_KEY.length > 0) {
      console.warn(
        'LaunchDarkly: No EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID set. Using mobile key for web; JS SDK may return 401/404. Set Client-side ID (from Project → Environments → your env) for web and Session Replay. See docs/LAUNCHDARKLY_SETUP.md.'
      );
    }
    // Web (npm run web): JS SDK. Add Observability + Session Replay only when Client-side ID is set (UUID).
    const { initialize } = require('launchdarkly-js-client-sdk');
    const plugins: unknown[] = [];
    if (webUsesSessionReplay) {
      try {
        const WebObservability = require('@launchdarkly/observability').default;
        const SessionReplay = require('@launchdarkly/session-replay').default;
        plugins.push(
          new WebObservability({ manualStart: false }),
          new SessionReplay({ manualStart: false, privacySetting: privacySetting }),
        );
      } catch (e) {
        console.warn('LaunchDarkly: Could not load observability/session-replay plugins:', e);
      }
    }

    ldClient = initialize(LAUNCHDARKLY_SDK_KEY, context, {
      plugins,
    });

    // Recommended: use a short timeout so the app doesn't hang if LaunchDarkly is unreachable (see https://launchdarkly.com/docs/sdk/client-side/javascript).
    try {
      await ldClient.waitForInitialization(5);
    } catch (err) {
      if (__DEV__) console.warn('LaunchDarkly: initialization failed or timed out', err);
    }

    if (startSessionReplay && webUsesSessionReplay && LDRecord?.start) {
      try {
        LDRecord.start({ forceNew: false, silent: false });
        if (__DEV__) console.log('LaunchDarkly: session replay started (web)');
      } catch (e) {
        console.warn('LaunchDarkly: Session replay start failed:', e);
      }
    }
  } else {
    // Native: Use React Native SDK with Observability for error/log tracking
    const {
      AutoEnvAttributes,
      ReactNativeLDClient,
    } = require('@launchdarkly/react-native-client-sdk');
    const { Observability } = require('@launchdarkly/observability-react-native');

    const observabilityPlugin = new Observability({
      serviceName: 'worklunch',
      serviceVersion: '1.0.0',
      sessionTimeout: sessionTimeout,
      contextFriendlyName: (ctx: LDContext) => {
        if (ctx.kind === 'user' && ctx.email) return ctx.email;
        if (ctx.kind === 'user' && ctx.key) return ctx.key;
        return undefined;
      },
      debug: debug,
    });

    ldClient = new ReactNativeLDClient(
      MOBILE_KEY,
      AutoEnvAttributes.Enabled,
      {
        debug: debug,
        plugins: [observabilityPlugin],
      }
    );

    await ldClient.identify(context);
    if (__DEV__) console.log('LaunchDarkly: initialized (native) with mobile key');
  }

  isInitialized = true;
  // Fire listeners but keep them subscribed — initializeLaunchDarkly can be
  // called more than once (getSession + SIGNED_IN race) and later calls need
  // to re-notify the same hooks.  Cleanup happens via the unsubscribe function
  // returned by onClientReady (called from useEffect teardown).
  readyListeners.forEach((cb) => cb());
  return ldClient;
}

export function getLDClient(): typeof ldClient {
  return ldClient;
}

export async function updateLDContext(
  userId: string,
  userEmail?: string,
  userName?: string
): Promise<void> {
  if (!ldClient) return;

  const context: LDContext = {
    kind: 'user',
    key: userId,
    email: userEmail,
    name: userName,
  };

  await ldClient.identify(context);
}

export function closeLDClient(): void {
  if (ldClient) {
    try {
      if (IS_WEB && LDRecord?.stop) {
        LDRecord.stop();
      }
      ldClient.close();
    } catch (e) {
      console.warn('Error closing LaunchDarkly client:', e);
    }
    ldClient = null;
  }
  isInitialized = false;
}
