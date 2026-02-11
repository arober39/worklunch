import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STARTED_AT_KEY = '@worklunch_session_started_at';

/** Max session duration – after this, user must log in again on next app open. */
export const MAX_SESSION_AGE_MS = 60 * 1000; // 1 minute

export async function getSessionStartedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(SESSION_STARTED_AT_KEY);
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function setSessionStartedAt(): Promise<void> {
  await AsyncStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
}

export async function clearSessionStartedAt(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STARTED_AT_KEY);
}

/** Returns true if the current session has exceeded max age and should be ended. */
export async function isSessionExpired(): Promise<boolean> {
  const startedAt = await getSessionStartedAt();
  if (startedAt == null) return false;
  return Date.now() - startedAt > MAX_SESSION_AGE_MS;
}
