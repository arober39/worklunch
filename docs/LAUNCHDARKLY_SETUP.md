# LaunchDarkly setup (Session Replay on web)

## Why am I not seeing sessions? / 401 or 404 errors on web?

- **Web must use the Client-side ID.** The JavaScript SDK does **not** accept the mobile key. If `EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID` is missing, the app falls back to the mobile key and you get "Environment not found", 401, or 404.
- **Client-side ID** can be the **24-character environment ID** (e.g. `6983d9db163bdc0a27d18730` for dev) or a UUID. Get it from the environment’s **Client-side ID** in LaunchDarkly.
- **Mobile key** (`mob-...`) goes in `EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY` and is used for **native** (iOS/Android). For web, set the Client-side ID as well.

## Session Replay requires the Client-side ID

For **web**, the app uses the **JavaScript/browser** SDK. It must be initialized with the **Client-side ID** for your environment. Do not use the mobile key for web.

### Where to get the Client-side ID

1. In [LaunchDarkly](https://app.launchdarkly.com), open your **worklunch** project.
2. Go to **Project settings** (gear) or **Environments**.
3. Select the environment you use for web (e.g. **dev**, **Test**, or **Production**).
4. Find **Client-side ID**. It may be a **24-character hex** (environment ID) or a **UUID**—both are valid.

### Env vars in `.env`

You need **both** (from **worklunch** → your environment, e.g. **dev**):

```bash
# Mobile key (mob-...) – for native; also used if Client-side ID is missing on web (not recommended)
EXPO_PUBLIC_LAUNCHDARKLY_SDK_KEY=<mobile key>

# Client-side ID – required for web. Use the value from Environment → Client-side ID (24-char hex or UUID).
EXPO_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID=<e.g. for dev>
```

Restart the dev server after changing `.env`. Then run **web** (`npm run web`), sign in, and use the app. Sessions appear under **Session Replay** (or **Replay**) in the LaunchDarkly UI for that environment; they can take a minute to show up.

### Optional: Force “new feed layout” (filters at bottom) for testing

If the `new-feed-layout` flag is **on** in **Dev** but you still see Category/Sort at the **top** (e.g. you’re using the Production key), you can force the bottom layout locally:

```bash
EXPO_PUBLIC_NEW_FEED_LAYOUT_OVERRIDE=true
```

Add that to `.env`, restart the app, and the filters will render at the **bottom** of the Lunches for Swap list. Remove it when you’re done testing or when your app is using the Dev environment key.
