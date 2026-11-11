import { Easing } from 'react-native-reanimated';

/** Strong ease-out — the default for anything entering or responding. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Strong ease-in-out — for movement already on screen. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** Critically damped, no overshoot. */
export const SPRING_SETTLE = { duration: 400, dampingRatio: 1 } as const;

/** A touch of life, only after a finger carried momentum. */
export const SPRING_MOMENTUM = { duration: 380, dampingRatio: 0.82 } as const;
