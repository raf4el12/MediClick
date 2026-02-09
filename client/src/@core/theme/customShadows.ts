const customShadows = (mode: string) => {
  const opacity = mode === 'dark' ? 0.2 : 0.16;

  return {
    xs: `0 2px 4px rgba(0, 0, 0, ${opacity})`,
    sm: `0 4px 8px rgba(0, 0, 0, ${opacity})`,
    md: `0 6px 16px rgba(0, 0, 0, ${opacity})`,
    lg: `0 8px 24px rgba(0, 0, 0, ${opacity})`,
    xl: `0 12px 32px rgba(0, 0, 0, ${opacity + 0.04})`,
  };
};

export default customShadows;
