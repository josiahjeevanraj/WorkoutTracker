// Warm-ups aren't numbered: "Warm-up, Warm-up, Set 1, Set 2, Set 3"
export const setLabel = (sets, si) => {
  if (sets[si]?.warmup) return 'Warm-up';
  return `Set ${sets.slice(0, si + 1).filter(s => !s.warmup).length}`;
};

// e.g. "3 sets", "3 sets · 2 warm-up"
export const setCountText = sets => {
  const warmups = sets.filter(s => s.warmup).length;
  const working = sets.length - warmups;
  return `${working} set${working !== 1 ? 's' : ''}${warmups ? ` · ${warmups} warm-up` : ''}`;
};
