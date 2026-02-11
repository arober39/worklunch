import { useState, useEffect } from 'react';
import { getLDClient, onClientReady } from '@/lib/launchdarkly';

// Feature flag keys
export const FLAGS = {
  JOIN_COMMUNITY_REDESIGN: 'join-community-redesign',
  NEW_FILTER_LOCATION: 'new-filter-location',
  INLINE_FORM_VALIDATION: 'inline-form-validation',
} as const;

export function useFeatureFlag(flagKey: string, defaultValue: boolean = false): boolean {
  const [flagValue, setFlagValue] = useState(defaultValue);
  const [clientReady, setClientReady] = useState(0);

  // Re-render when the LD client becomes available
  useEffect(() => {
    return onClientReady(() => setClientReady((n) => n + 1));
  }, []);

  const ldClient = getLDClient();

  // clientReady in deps ensures we re-read the flag after initialization
  // completes — ldClient is set before waitForInitialization() resolves, so
  // the object reference doesn't change, but flag data is only available after.
  useEffect(() => {
    if (!ldClient) {
      setFlagValue(defaultValue);
      return;
    }

    const value = ldClient.variation(flagKey, defaultValue) as boolean;
    setFlagValue(value);

    const listener = (key: string) => {
      if (key === flagKey) {
        const newValue = ldClient.variation(flagKey, defaultValue) as boolean;
        setFlagValue(newValue);
      }
    };

    ldClient.on('change', listener);

    return () => {
      ldClient.off('change', listener);
    };
  }, [ldClient, flagKey, defaultValue, clientReady]);

  return flagValue;
}

export function useStringFlag(flagKey: string, defaultValue: string = ''): string {
  const [flagValue, setFlagValue] = useState(defaultValue);
  const [clientReady, setClientReady] = useState(0);

  useEffect(() => {
    return onClientReady(() => setClientReady((n) => n + 1));
  }, []);

  const ldClient = getLDClient();

  useEffect(() => {
    if (!ldClient) {
      setFlagValue(defaultValue);
      return;
    }

    const value = ldClient.variation(flagKey, defaultValue) as string;
    setFlagValue(value);

    const listener = (key: string) => {
      if (key === flagKey) {
        const newValue = ldClient.variation(flagKey, defaultValue) as string;
        setFlagValue(newValue);
      }
    };

    ldClient.on('change', listener);

    return () => {
      ldClient.off('change', listener);
    };
  }, [ldClient, flagKey, defaultValue, clientReady]);

  return flagValue;
}
