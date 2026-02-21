import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Brief "back online" indicator
        setTimeout(() => setWasOffline(false), 3000);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}
