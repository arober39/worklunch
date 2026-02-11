# Detection to Resolution: Real-World Debugging with Rage Clicks and Session Replay

*Part 3 of 3: Rage Click Detection with LaunchDarkly*

## Overview

In Part 1, we set up rage click detection using LaunchDarkly's Session Replay. In Part 2, we connected those frustration signals to Guarded Releases for automated rollback protection.

Now it's time to put it all together. In this final installment, we'll walk through real-world debugging scenarios using our WorkLunch app—a cross-platform application built with React Native and Expo where coworkers can swap lunches. These scenarios demonstrate how the integrated system of feature flags, session replay, and guarded releases transforms the way you diagnose and fix production issues.

> **Note:** Session Replay with rage click detection requires the LaunchDarkly JavaScript SDK. When running the WorkLunch app, use `npm run web` to test these scenarios with full session replay functionality.

> **Want to follow along?** The complete source code for the WorkLunch app used in this blog series is available on GitHub: [github.com/your-username/worklunch](https://github.com/your-username/worklunch)

## The Debugging Workflow: An Observability Loop

Before diving into scenarios, let's understand the complete workflow we've built:

```
┌─────────────────────────────────────────────────────────────────┐
│                    The Observability Loop                       │
│                                                                 │
│   1. DETECT          2. ALERT           3. INVESTIGATE          │
│   ┌─────────┐       ┌─────────┐        ┌─────────┐             │
│   │  Rage   │──────▶│ Guarded │───────▶│ Session │             │
│   │ Clicks  │       │ Release │        │ Replay  │             │
│   └─────────┘       └─────────┘        └─────────┘             │
│                                              │                  │
│   5. VERIFY          4. FIX                  │                  │
│   ┌─────────┐       ┌─────────┐              │                  │
│   │Re-deploy│◀──────│  Root   │◀─────────────┘                  │
│   │with Flag│       │ Cause   │                                 │
│   └─────────┘       └─────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

This workflow enables you to:

- **Detect** frustration signals automatically as they happen
- **Alert** when thresholds are breached during rollouts
- **Investigate** with full session context, not just error logs
- **Fix** with confidence knowing the exact user experience
- **Verify** the fix works by monitoring the new rollout

## How Feature Flags Pinpoint the Problem

One of the most powerful aspects of this setup is that LaunchDarkly tracks which flag variation each user is seeing. Every session is tagged with the user's flag state:

```
Session: user_abc123
├── join-community-redesign: true      ← User saw new join flow
├── inline-form-validation: false      ← User saw old form validation
├── new-filter-location: true ← User saw new filter placement
└── has_rage_clicks: true              ← User was frustrated
```

When Guarded Releases detects a spike in rage clicks, it automatically correlates the frustration with specific flag variations:

| Variation | Users | Rage Clicks | Rate |
|-----------|-------|-------------|------|
| `join-community-redesign: false` (control) | 9,000 | 45 | 0.5% |
| `join-community-redesign: true` (treatment) | 1,000 | 50 | **5.0%** |

The alert tells you exactly which feature caused the problem: *"Rage clicks increased 10x for users on `join-community-redesign: true`"*

No digging through logs. No guessing. You know immediately which feature to investigate.

---

## Scenario 1: The Silent Button Failure

### The Setup

Your team ships a redesigned "Join Community" flow in the WorkLunch app behind a feature flag (`join-community-redesign`). The new flow streamlines the UI and removes some confirmation dialogs. The deployment goes smoothly—no errors in the logs.

But 30 minutes into the rollout at 10% of users, your Guarded Release triggers an alert: **rage clicks increased 10x for users on the new variation**.

> **To reproduce this scenario:** In the WorkLunch app, communities with "Corp" in the name require admin approval before users can join. When a user tries to join one of these communities, the API returns `{ status: 'pending_approval' }` instead of immediately adding them. This is the edge case the new code fails to handle.

### The Feature Flag Implementation

```typescript
// app/spaces/join.tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export default function JoinSpaceScreen() {
  const [joinCode, setJoinCode] = useState('');
  const [department, setDepartment] = useState('');
  const [floor, setFloor] = useState('');
  const [deskNumber, setDeskNumber] = useState('');

  const joinSpace = useJoinSpace();
  const { setCurrentSpace } = useSpaceStore();

  // Feature flag controls which join flow to use
  const useNewJoinFlow = useFeatureFlag('join-community-redesign', false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      const result = await joinSpace.mutateAsync({
        joinCode: joinCode.trim(),
        department: department.trim() || null,
        floor: floor.trim() || null,
        deskNumber: deskNumber.trim() || null,
      });

      if (useNewJoinFlow) {
        // NEW CODE - streamlined flow (has a bug!)
        setCurrentSpace(result.space);
        Alert.alert('Welcome!', `You've joined ${result.space.name}`, [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else {
        // OLD CODE - handles all states correctly
        if (result.status === 'pending_approval') {
          Alert.alert(
            'Request Submitted',
            'Your request to join has been sent to the community admin for approval.',
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
        } else {
          setCurrentSpace(result.space);
          Alert.alert('Welcome!', `You've joined ${result.space.name}`, [
            { text: 'OK', onPress: () => router.replace('/') },
          ]);
        }
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ... form inputs ... */}

        <Button
          title="Join Company/Office"
          onPress={handleJoin}
          loading={joinSpace.isPending}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### Investigation Steps

**Step 1: Filter for affected sessions**

In the LaunchDarkly Sessions tab, apply this filter:

```
has_rage_clicks=true AND join-community-redesign=true
```

This shows you only frustrated users who were seeing the new join flow.

**Step 2: Watch the session replay**

You find a session where a user clicks the "Join Company/Office" button 8 times in rapid succession. The session replay reveals:

- The button visually responds (hover state, click animation)
- The loading spinner appears briefly
- No success message or error displays
- The user stays on the same screen
- The user eventually goes back and tries entering a different code

**Step 3: Correlate with network requests**

In the session timeline, you spot it: the API call to Supabase returns a 200 OK, but the response payload contains `{ "status": "pending_approval" }`. The new streamlined flow assumes all successful responses mean the user joined immediately—it doesn't handle the `pending_approval` state that occurs when communities require admin approval.

### The Root Cause

The old code handled three states:
1. Success → Show welcome, navigate home
2. Pending approval → Show "request submitted" message
3. Error → Show error alert

The new "streamlined" code only handled two:
1. Success → Show welcome, navigate home
2. Error → Show error alert

When `pending_approval` came back, nothing happened. The button finished loading, but no feedback was shown.

### The Fix

```typescript
// After: Handle all membership states in the new flow
if (useNewJoinFlow) {
  if (result.status === 'pending_approval') {
    // This case was missing!
    Alert.alert(
      'Request Submitted',
      `Your request to join ${result.space.name} has been sent to the admin.`,
      [{ text: 'OK', onPress: () => router.replace('/') }]
    );
  } else {
    setCurrentSpace(result.space);
    Alert.alert('Welcome!', `You've joined ${result.space.name}`, [
      { text: 'OK', onPress: () => router.replace('/') },
    ]);
  }
}
```

### Resolution

1. **Roll back** the feature flag to `false` for all users (instant, no deployment needed)
2. **Fix** the root cause in code
3. **Deploy** the fix
4. **Re-enable** the guarded rollout at 10%, then 50%, then 100%
5. **Monitor** rage clicks to confirm they return to baseline

**Time to resolution: 35 minutes** (compared to potentially days of user complaints and support tickets without this system)

---

## Scenario 2: The Infinite Scroll Frustration (Buried Filters)

### The Setup

Your team ships a feature flag (`new-filter-location`) that **moves the existing Category and Sort controls** on the "Lunches for Swap" feed. There's no other design change—same feed, same controls. When the flag is **off**, the controls stay in their **original place at the top** of the feed, where users expect them. When the flag is **on**, the controls are moved to the **bottom** of the feed as the `ListFooterComponent` of the FlatList.

Your Guarded Release alerts on a custom metric: **rage scrolls increased by 60%** for users on the new variation.

### The Feature Flag Implementation

```typescript
// app/index.tsx — flag only controls where the same filter bar is rendered
import { useFeatureFlag, FLAGS } from '@/hooks/useFeatureFlags';

const useFiltersAtBottom = useFeatureFlag(FLAGS.NEW_FILTER_LOCATION, false);

return (
  <>
    {/* Flag OFF: filters at top (original position) */}
    {!useFiltersAtBottom && (
      <View>
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterButton} onPress={openCategoryFilter}>
            <Text style={styles.filterButtonText}>Category: {categoryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={openSortMenu}>
            <Text style={styles.filterButtonText}>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
          </TouchableOpacity>
        </View>
        {/* ... dropdown menus ... */}
      </View>
    )}
    <FlatList
      data={filteredPosts}
      renderItem={({ item }) => (
        <PostCard post={item} onPress={() => router.push(`/posts/${item.id}`)} />
      )}
      keyExtractor={(item) => item.id}
      ListFooterComponent={
        useFiltersAtBottom ? (
          /* Flag ON: same filter bar, moved to bottom — users expect it at top */
          <View>
            <View style={styles.filterBar}>
              <TouchableOpacity style={styles.filterButton} onPress={openCategoryFilter}>
                <Text style={styles.filterButtonText}>Category: {categoryLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton} onPress={openSortMenu}>
                <Text style={styles.filterButtonText}>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
              </TouchableOpacity>
            </View>
            {/* ... dropdown menus ... */}
          </View>
        ) : null
      }
    />
  </>
);
```

When the flag is **off**, the filter bar stays at the top. When the flag is **on**, the same filter bar is rendered at the **bottom** of the list. Users expect it at the top, so they scroll up and down looking for it and never think to scroll past every post to find it.

### Investigation Steps

**Step 1: Filter by frustration signal and flag variation**

```
has_rage_scrolls=true AND new-filter-location=true
```

**Step 2: Identify the pattern**

In session replay, users scroll down the feed, then back up, then down again. They rarely tap items; they keep moving the list. The pattern suggests they're **looking for something** rather than browsing items.

**Step 3: Correlate with what's on screen**

Replay shows the issue: **Category** and **Sort** are not at the top where users expect them. With the flag on, the controls were moved to the `ListFooterComponent`—below every post in the feed. Users scroll down, then back up, then down again looking for the filter bar. They never think to scroll past all the posts because filter controls conventionally live above the content they filter.

### The Root Cause

The feature flag moves the existing filter bar from the top to the bottom of the list (`ListFooterComponent` when the flag is on). Same controls, different position. Users have learned that Category and Sort live at the top of a feed; when they don't see them there, they rage scroll looking for them instead of scrolling to the very end of the list.

```typescript
// Flag ON: same filter bar rendered as ListFooterComponent — breaks user expectation
ListFooterComponent={
  useFiltersAtBottom ? (
    <View style={styles.filterBar}>...</View>
  ) : null
}
```

### The Fix

**Option A – Roll back the flag:** Set `new-filter-location` to `false`. Filters return to the top (original position); rage scrolls drop.

**Option B – Fix the experiment:** Don't move the filters to the bottom. Keep the filter bar at the top regardless of the flag, or remove the flag and leave filters in their original place.

```typescript
// Fix: always show filter bar at top (original place)
{/* Filters always above the list */}
<View style={styles.filterBar}>
  <TouchableOpacity style={styles.filterButton} onPress={openCategoryFilter}>
    <Text style={styles.filterButtonText}>Category: {categoryLabel}</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.filterButton} onPress={openSortMenu}>
    <Text style={styles.filterButtonText}>Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
  </TouchableOpacity>
</View>
<FlatList ... ListFooterComponent={null} />
```

### Resolution

1. **Roll back** `new-filter-location` to `false` so filters are at the top again.
2. **Fix** by keeping the filter bar at the top (don't move it to the bottom).
3. **Deploy** and re-enable the flag with monitoring if you still want to test layout changes.

---

## Scenario 3: Form Validation Frustration (Create Community)

### The Setup

Your team ships a new feature flag for the new Create Community button redesign (`inline-form-validation`). The redesign was intended to **simply change the button color**: the original Create Community button is baby blue; when the flag is **on**, the new design turns it purple. When the flag is **off**, the existing code runs and shows a verification card after a successful create (community name, join code, "Back to community list"). The problem: the new feature, when the flag is on, **breaks the code that allows the success card to be shown**. So the new design was supposed to be a color change only, but it ended up removing the logic that handles the Create Community button success. After a successful create, the verification card never appears—the button shows loading, then stops. No confirmation, no join code, no next step. Users think the button didn't work and rage click it.

You've attached a **Guarded Release** to this flag with **rage click metrics** defined. During rollout, the guarded release triggers an alert: **rage clicks increased for users on `inline-form-validation: true`**. Conversions on the Create Community flow have dropped, but there are no errors in the logs. The alert—and the flag variation it's tied to—is what sends you to Session Replay to find the right sessions and identify the root cause.

### Investigation Steps

**Step 1: Use the guarded release alert to find the right sessions**

The guarded release showed an increase in rage clicks spiked for users on `inline-form-validation: true`. If you open the **Sessions** tab and filter for sessions that had rage clicks and were on the new variation, you'll be able to find all relevant sessions:

```
has_rage_clicks=true AND inline-form-validation=true
```

**Step 2: Watch the session replay**

After opening one of the filtered sessions, you see:

1. User fills out the Create Community form (name, address, city, state, zip).
2. User taps "Create Company/Office".
3. The button shows a loading state.
4. The request completes successfully (community is created).
5. **Nothing else happens**
6. User taps again. And again. They may think the app didn’t work or that they need to resubmit.

**Step 3: Identify the root cause from the replay**

The Create Community button never shows success feedback after a successful create—no verification card, no navigation. Users have no way to know the community was created unless they leave the screen and go back to the community list.

### The Root Cause

The Create Community request was succeeding—the API returned 200 and the community was created. The new feature was intended to simply change the button color (baby blue → purple), but it **broke the code that allows the success card to be shown**. The success-card logic only runs when the flag is off, so when the new feature is on, that code is never run.

When the flag is **off**, the existing code runs and shows the success card:
1. Success → Set `createdSpace` → Show verification card (name, join code, "Back to community list")
2. User taps Back → Return to community list

When the flag is **on**, the new feature's path runs—and it **breaks** the success flow:
1. Success → Nothing. The `if (!useInlineValidation)` block is the only place that calls `setCreatedSpace`; when the flag is on, that block is skipped, so the code that shows the success card never runs.
2. The user stays on the form with no confirmation. The button appears to do nothing after loading.

```typescript
// New feature (flag ON) breaks success UI: only the old path runs setCreatedSpace
if (!useInlineValidation) {
  setCreatedSpace({ name: space.name, join_code: space.join_code });
}
// When useInlineValidation is true, the success card code is never reached
```

Users saw the Create Community button load, then silence. The new feature broke the success card flow. Fixing it means restoring that flow when the flag is on—add the success handling to the new feature's path so the success card is shown again.

### The Fix

**Option A – Roll back the flag (immediate relief):** Set `inline-form-validation` to **off** in LaunchDarkly. Users are no longer on the new feature; they get the existing, working code path and see the verification card after Create Community. No code change—the bug is in the new feature, so removing the new feature fixes the issue for users.

**Option B – Fix the new feature so it no longer breaks the success card (keep the feature):** The new feature (flag on) breaks the code that shows the success card. Fix it by adding the success handling to the flag-on path—when the flag is on, also call `setCreatedSpace` after a successful create so the success card is shown again.

**Before (bug):** The new feature breaks the success card: only the old path (flag off) runs `setCreatedSpace`, so when the flag is on the success card never appears.

```typescript
// New feature (flag ON) breaks success card: only old path runs setCreatedSpace
if (!useInlineValidation) {
  setCreatedSpace({ name: space.name, join_code: space.join_code });
}
// When useInlineValidation is true, success card code is never run
```

**After (fix):** Restore the success card when the new feature is on by adding the same success handling to the flag-on path.

```typescript
// Fix: new feature was missing success UI — add it to the flag-on path
await queryClient.refetchQueries({ queryKey: ['spaces'] });
if (!useInlineValidation) {
  setCreatedSpace({ name: space.name, join_code: space.join_code });
} else {
  setCreatedSpace({ name: space.name, join_code: space.join_code });
}
```

**How this fixes it:** The new feature was breaking the success card: when the flag is on, the code that shows the card never ran. The fix is to add that logic to the new feature's path (the `else` branch) so the success card is shown when the flag is on too. The new feature no longer breaks the success flow—users get the verification card and "Back to community list," and the rage clicks stop.

### Resolution

With the root cause identified from Session Replay, you update the code and resolve the rollout:

1. **Roll back** `inline-form-validation` to `false` so users get the verification card and can return to the list (instant, no deployment needed).
2. **Fix** the flag-on success path so it shows the verification card (or redirects) after create.
3. **Deploy** and re-enable the flag with the guarded rollout (rage click metrics) still attached, then monitor to confirm rage clicks return to baseline.

---

## Building Your Debugging Playbook

Based on these scenarios, here's a systematic approach to rage click debugging:

### Step 1: Triage with Filters

| What to look for | Search query |
|------------------|--------------|
| All frustrated users | `has_rage_clicks=true` |
| Specific feature issues | `has_rage_clicks=true AND feature-flag-name=true` |
| Specific page issues | `has_rage_clicks=true AND visited-url contains "/spaces/join"` |
| Mobile-specific | `has_rage_clicks=true AND device_type="Mobile"` |
| Scroll frustration | `has_rage_scrolls=true AND feature-flag-name=true` |

### Step 2: Identify the Pattern

When reviewing session replays, look for:

- **Visual feedback gaps**: Did the UI acknowledge the click?
- **Loading states**: Is there a spinner? Does it ever resolve?
- **Error visibility**: If there's an error, can the user see it from their scroll position?
- **State management issues**: Do elements keep resetting or re-loading?
- **Timing problems**: Does the click happen before the element is ready?

### Step 3: Correlate with Technical Data

Session replay shows you the user's experience. Pair it with:

- **Network tab**: API response codes and payloads
- **Console errors**: JavaScript exceptions
- **Feature flag state**: Which variation was the user seeing?
- **Timing**: When in the session did frustration peak?

### Step 4: Fix and Verify

1. **Roll back** using your feature flag (instant, no deployment needed)
2. **Fix** the root cause in code
3. **Re-deploy** with the guarded rollout active
4. **Monitor** rage click metrics to confirm the fix worked

---

## Other Frustration Signals to Monitor

Beyond rage clicks, consider tracking these signals in your Guarded Releases:

| Signal | What It Looks Like | Common Causes |
|--------|-------------------|---------------|
| Rage Scrolls | Frantic scrolling up and down without pausing | Missing navigation, buried content, confusing information architecture |
| Form Abandons | User fills out part of a form then leaves without submitting | Unclear validation errors, too many required fields, technical submission failures |
| Dead Clicks | Single clicks on elements that don't respond at all | Elements styled to look clickable but lacking event handlers or functionality |

---

## Key Metrics to Track

Beyond raw rage clicks, consider monitoring these derived metrics in your Guarded Releases:

| Metric | What it indicates |
|--------|-------------------|
| Rage clicks per session | Overall frustration level |
| Rage clicks per page | Which pages need UX work |
| Time to first rage click | How quickly users hit problems |
| Rage clicks → bounce rate | Frustration leading to abandonment |
| Rage clicks by flag variation | Feature-specific issues |

---

## Conclusion

The combination of rage click detection, session replay, and guarded releases creates something powerful: **observability that starts with the human experience**.

Traditional monitoring asks: *"Is the system healthy?"*

This approach asks: *"Are users successful?"*

When you can detect frustration in real-time, watch exactly what users experienced, correlate it with specific feature flags, and roll back problematic features instantly, you fundamentally change how fast you can ship with confidence.

### Series Recap

| Blog | Objective |
|------|-----------|
| Part 1 | Detect user frustration with rage clicks and session replay |
| Part 2 | Protect releases and user experience with automated monitoring and rollback |
| Part 3 | Debug production issues with full user context using session replay, feature flags, and rollbacks |

The next time your users are frustrated, you'll know *exactly* what went wrong, *which feature* caused it, and *why*. And the best part? You'll fix it before most users even notice.

---

## Additional Resources

**Full Source Code**

The complete WorkLunch app code used in this blog series is available on GitHub. Clone it, run it locally, and experiment with the feature flags and debugging scenarios yourself:

[github.com/your-username/worklunch](https://github.com/your-username/worklunch)

**Session Replay Setup (Web)**

To enable session replay with rage click detection, initialize the LaunchDarkly JavaScript SDK with the Observability and Session Replay plugins:

```typescript
import { initialize } from 'launchdarkly-js-client-sdk';
import Observability from '@launchdarkly/observability';
import SessionReplay, { LDRecord } from '@launchdarkly/session-replay';

const ldClient = initialize(clientSideId, userContext, {
  plugins: [
    new Observability({ manualStart: false }),
    new SessionReplay({
      manualStart: false,
      privacySetting: 'default', // 'none', 'default', or 'strict'
    }),
  ],
});

await ldClient.waitForInitialization();

// Start recording - rage clicks are detected automatically
LDRecord.start({ forceNew: false, silent: false });
```

Sessions with rage clicks will be automatically tagged with `has_rage_clicks=true` and can be filtered in the LaunchDarkly Sessions UI.

**Documentation**

- [Session Replay Documentation](https://docs.launchdarkly.com/home/session-replay)
- [Guarded Releases Documentation](https://docs.launchdarkly.com/home/releases/guarded)
- [Observability SDK Reference](https://docs.launchdarkly.com/sdk/features/observability)

**Blog Series**

- Part 1: Detecting User Frustration
- Part 2: Connecting to Guarded Releases
