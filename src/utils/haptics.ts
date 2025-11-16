// Haptic feedback utilities for mobile devices

export type HapticStyle = 'light' | 'medium' | 'heavy';

/**
 * Triggers haptic feedback on supported devices
 * Works on iOS and Android with vibration API
 */
export const triggerHaptic = (style: HapticStyle = 'medium') => {
  try {
    // Standard vibration API (works on most mobile browsers)
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number[]> = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[style]);
    }
    
    // iOS Taptic Engine (if available via webkit)
    if ('Taptic' in window) {
      try {
        (window as any).Taptic.impact(style);
      } catch (e) {
        // Taptic not available, already used vibrate fallback
      }
    }
  } catch (error) {
    // Haptic feedback not supported, fail silently
    console.debug('Haptic feedback not supported:', error);
  }
};

/**
 * Triggers a success haptic pattern
 */
export const triggerSuccessHaptic = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch (error) {
    console.debug('Success haptic not supported:', error);
  }
};

/**
 * Triggers an error haptic pattern
 */
export const triggerErrorHaptic = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30, 50, 30]);
    }
  } catch (error) {
    console.debug('Error haptic not supported:', error);
  }
};
