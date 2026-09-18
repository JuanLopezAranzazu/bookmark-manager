const PALETTE = [
  '#4F46E5', // indigo
  '#0F766E', // teal
  '#B45309', // amber oscuro
  '#9333EA', // violeta
  '#0369A1', // azul
  '#BE123C', // carmin
  '#15803D', // verde
  '#7C2D12', // ladrillo
];

/** Color estable: el mismo nombre de tag siempre recibe el mismo color. */
export function randomTagColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return PALETTE[hash % PALETTE.length] as string;
}
