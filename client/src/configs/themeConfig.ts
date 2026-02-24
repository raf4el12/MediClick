const themeConfig = {
  templateName: 'MediClick',
  settingsCookieName: 'mediclick-settings',
  homePageUrl: '/',
  mode: 'light' as 'light' | 'dark' | 'system',
  skin: 'default' as 'default' | 'shadow',
  semiDark: true,
  layout: 'vertical' as 'vertical' | 'collapsed',
  layoutPadding: 24,
  compactContentWidth: 1440,
  navbar: {
    type: 'fixed' as 'fixed' | 'static',
    contentWidth: 'compact' as 'compact' | 'wide',
    floating: true,
    blur: true,
  },
  contentWidth: 'compact' as 'compact' | 'wide',
  footer: {
    type: 'static' as 'fixed' | 'static',
    contentWidth: 'compact' as 'compact' | 'wide',
  },
  disableRipple: false,
};

export default themeConfig;
