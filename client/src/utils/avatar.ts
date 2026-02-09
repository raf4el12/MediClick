import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

const DEFAULT_BG_COLORS = ['b6e3f4', 'c0aede', 'ffd5dc', 'd1d4f9'];

export const getDefaultAvatarDataUri = (seed: string): string =>
  createAvatar(adventurer, {
    seed,
    size: 128,
    backgroundColor: DEFAULT_BG_COLORS,
  }).toDataUri();
