const DEFAULT_BG_COLORS = ['b6e3f4', 'c0aede', 'ffd5dc', 'd1d4f9'];

export const getDefaultAvatarDataUri = async (seed: string): Promise<string> => {
  const { createAvatar } = await import('@dicebear/core');
  const { adventurer } = await import('@dicebear/collection');

  return createAvatar(adventurer, {
    seed,
    size: 128,
    backgroundColor: DEFAULT_BG_COLORS,
  }).toDataUri();
};
