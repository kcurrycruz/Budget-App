import { Platform } from 'react-native';

export function supportsWebPasskeys() {
  return Platform.OS === 'web'
    && globalThis.isSecureContext === true
    && typeof globalThis.PublicKeyCredential !== 'undefined';
}

export function webPasskeyLabel() {
  if (Platform.OS !== 'web') return 'passkey';
  const navigator = globalThis.navigator;
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator?.userAgent ?? '')
    || (navigator?.platform === 'MacIntel' && (navigator?.maxTouchPoints ?? 0) > 1);
  return appleMobile ? 'Face ID' : 'passkey';
}
