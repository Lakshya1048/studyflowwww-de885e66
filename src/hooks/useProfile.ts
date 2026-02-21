import { useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface Profile {
  display_name: string | null;
  daily_goal_minutes: number;
}

const DEFAULT_PROFILE: Profile = {
  display_name: null,
  daily_goal_minutes: 60,
};

export function useProfile() {
  const [stored, setStored] = useLocalStorage<Profile>('studyflow-profile', DEFAULT_PROFILE);
  const [profile, setProfile] = useState<Profile>(stored);

  const updateProfile = useCallback(
    (updates: Partial<Profile>) => {
      const next = { ...profile, ...updates };
      setProfile(next);
      setStored(next);
    },
    [profile, setStored],
  );

  return { profile, updateProfile };
}
