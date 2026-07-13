// ─── Motion presets for Reanimated ──────────────────────────────────────
export const motion = {
  press: { damping: 20, stiffness: 400 },   // scale 0.97 on press
  enter: 250,                                 // ms for enter transitions
  esiSpring: { damping: 12, stiffness: 100 }, // bouncy for ESI badge hero
  list: { damping: 18, stiffness: 300 },      // list item inserts
} as const;
