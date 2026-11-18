// Shiur 5's rules, with no rendering: shared by the R3F level and the plain three.js build.

export const ARM_CHOICES = [
  { id: 'left', t: 'His LEFT arm' },
  { id: 'right', t: 'His RIGHT arm' },
  { id: 'none', t: 'No shel yad: only the shel rosh' },
];
export const BRACHA_CHOICES = [
  { id: 'yes', t: 'With a bracha: “lehaniach tefillin”' },
  { id: 'no', t: 'Without a bracha (have it in mind with the shel rosh’s brachot)' },
];

// The close-up figure: the patient faces you, so his left arm is on your right (+x).
export const ARM_GEOM = { shoulderX: 1.12, shoulderY: 3.15, upper: 1.35, fore: 1.2, hand: 0.36, bayitY: 2.25, knotR: 0.46 };
export const armX = (side) => (side === 'left' ? 1 : -1) * ARM_GEOM.shoulderX;

/** Is [arm, bracha] one of the patient's accepted answers? Adds a reason when it plainly can't be. */
export function judgeWard(c, arm, bracha) {
  const ok = c.accept.some(([a, b]) => a === arm && (a === 'none' || b === bracha));
  if (ok) return { ok: true };
  const state = arm === 'left' ? c.body.L : arm === 'right' ? c.body.R : null;
  if (state === 'gone') return { ok: false, reason: 'That arm isn’t there at all.' };
  return { ok: false };
}

// The knot circles the arm; its leg points away from the arm's centre. Inward (toward the torso and
// the heart) is -x for his left arm and +x for his right.
export const knotTarget = (side) => (side === 'left' ? (3 * Math.PI) / 2 : Math.PI / 2);
export function knotError(angle, side) {
  let d = angle - knotTarget(side);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d);
}
