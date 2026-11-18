// Where things are, in plain numbers: shared by the R3F worlds and the plain three.js build.

// The shul (Shiurim 3 and 6)
export const HALF_X = 18;
export const HALF_Z = 24;
// Bench rows: [x, z] centers, each 5.5 wide.
export const BENCHES = [];
for (const z of [-16, -12, -8, 8, 12, 16]) for (const x of [-12, -4.5, 4.5, 12]) BENCHES.push([x, z]);
export const BIMAH = { x: 0, z: 0, half: 2.6 };

// The street corner (Shiur 4)
export const STREET = { halfX: 22, halfZ: 18 };
export const STAND = { x: 0, z: -2 }; // the table's centre; customers stand on +z, you behind on -z
export const ARM_STAGE = { x: 0, y: 0, z: -60 }; // off-screen close-up stage for the arm

// The ward (Shiur 5) (same footprint as the shul). Beds along both walls; patients stand at the
// foot of their bed, facing the aisle.
export const BEDS = [];
for (const z of [-15, -8, -1, 6, 13]) for (const side of [-1, 1]) BEDS.push({ x: side * 14.2, z, side });
export const BODY_STAGE = { x: 0, y: 0, z: -70 }; // off-screen close-up stage for the patient's arms
export const NURSES = { x: 0, z: -19 };
