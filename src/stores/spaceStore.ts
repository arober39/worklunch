import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Space } from '@/types/database';

interface SpaceState {
  currentSpace: Space | null;
  setCurrentSpace: (space: Space | null) => void;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set) => ({
      currentSpace: null,
      setCurrentSpace: (space) => set({ currentSpace: space }),
    }),
    {
      name: 'worklunch-space',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
