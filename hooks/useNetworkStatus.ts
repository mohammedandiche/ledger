import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // isInternetReachable can be null on initial check — treat null as online
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
