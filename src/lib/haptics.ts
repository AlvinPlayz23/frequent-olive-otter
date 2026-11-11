import * as Haptics from 'expo-haptics';

const safe = (p: Promise<unknown>) => {
  p.catch(() => undefined);
};

/** A light tap, for presses that commit something small. */
export function tap() {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A medium tap, for a heavy object landing. */
export function thump() {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** A tick, for selection changing — chips, segments, tabs. */
export function select() {
  safe(Haptics.selectionAsync());
}

/** A success chime, for a saved piece. */
export function success() {
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A warning buzz, for something that failed. */
export function warn() {
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
