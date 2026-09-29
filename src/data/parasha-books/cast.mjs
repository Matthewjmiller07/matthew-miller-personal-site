// The default cast of the Parasha Books. Swap names here if roles change —
// the illustrations follow the reference sheet, the names only live in the text.
export const defaultCast = {
  big: { name: 'Aviya', look: 'big sister, long wavy light-brown hair, pink bow' },
  mid: { name: 'Tzofia', look: 'little sister, dark curly ringlets, big pink bow' },
  baby: { name: 'Lielle', look: 'the baby, dark wispy hair, big dark eyes' },
};

export const castNames = (cast) => [cast.big, cast.mid, cast.baby].filter(Boolean).map((c) => c.name);
