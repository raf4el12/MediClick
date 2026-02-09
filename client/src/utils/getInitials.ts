export const getInitials = (name: string): string =>
  name
    .split(/\s/)
    .reduce((initials, word) => initials + word.slice(0, 1), '')
    .toUpperCase();
