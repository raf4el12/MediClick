'use client';

import { useState, useEffect, useCallback } from 'react';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import { useSettings } from '@/@core/hooks/useSettings';
import primaryColorConfig from '@/configs/primaryColorConfig';
import SkinDefault from '@/@core/svg/SkinDefault';
import SkinBordered from '@/@core/svg/SkinBordered';
import ContentCompact from '@/@core/svg/ContentCompact';
import ContentWide from '@/@core/svg/ContentWide';
import styles from './styles.module.css';

const Customizer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, resetSettings, isSettingsChanged } = useSettings();

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(max-width: 600px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      updateSettings({ [field]: value });
    },
    [updateSettings],
  );

  const handleContentWidthChange = useCallback(
    (width: 'compact' | 'wide') => {
      updateSettings({
        navbarContentWidth: width,
        contentWidth: width,
        footerContentWidth: width,
      });
    },
    [updateSettings],
  );

  const customizerClasses = [
    styles.customizer,
    mounted && isOpen ? styles.show : '',
    mounted && isMobile ? styles.smallScreen : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`${styles.backdrop} ${isOpen && isMobile ? styles.show : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={customizerClasses}>
        {/* Toggler button */}
        <div className={styles.toggler} onClick={() => setIsOpen(!isOpen)}>
          <i className="ri-settings-5-line" style={{ fontSize: 22 }} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h6 className={styles.customizerTitle}>Personalizar Tema</h6>
            <p className={styles.customizerSubtitle}>Vista previa en tiempo real</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              onClick={resetSettings}
              style={{ position: 'relative', display: 'flex', cursor: 'pointer' }}
            >
              <i
                className="ri-refresh-line"
                style={{ fontSize: 20, opacity: 0.7 }}
              />
              <div
                className={`${styles.dotStyles} ${mounted && isSettingsChanged ? styles.show : ''}`}
              />
            </div>
            <i
              className="ri-close-line"
              style={{ fontSize: 22, cursor: 'pointer', opacity: 0.7 }}
              onClick={() => setIsOpen(false)}
            />
          </div>
        </div>

        {/* Body */}
        <div className={styles.customizerBody}>
          {/* ── Theming Section ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Chip
              label="Apariencia"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: '0.75rem' }}
            />

            {/* Primary Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Color Primario</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {primaryColorConfig.map((item) => (
                  <div
                    key={item.name}
                    className={`${styles.primaryColorWrapper} ${settings.primaryColor === item.main ? styles.active : ''
                      }`}
                    onClick={() => handleChange('primaryColor', item.main)}
                  >
                    <div
                      className={styles.primaryColor}
                      style={{ backgroundColor: item.main }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Modo</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {(['light', 'dark', 'system'] as const).map((mode) => {
                  const icons = { light: 'ri-sun-line', dark: 'ri-moon-clear-line', system: 'ri-computer-line' };
                  const labels = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' };

                  return (
                    <div key={mode} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <div
                        className={`${styles.itemWrapper} ${styles.modeWrapper} ${settings.mode === mode ? styles.active : ''
                          }`}
                        onClick={() => handleChange('mode', mode)}
                      >
                        <i className={icons[mode]} style={{ fontSize: 30 }} />
                      </div>
                      <p className={styles.itemLabel} onClick={() => handleChange('mode', mode)}>
                        {labels[mode]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Skin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Skin</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div
                    className={`${styles.itemWrapper} ${settings.skin === 'default' ? styles.active : ''}`}
                    onClick={() => handleChange('skin', 'default')}
                  >
                    <SkinDefault />
                  </div>
                  <p className={styles.itemLabel} onClick={() => handleChange('skin', 'default')}>
                    Default
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div
                    className={`${styles.itemWrapper} ${settings.skin === 'shadow' ? styles.active : ''}`}
                    onClick={() => handleChange('skin', 'shadow')}
                  >
                    <SkinBordered />
                  </div>
                  <p className={styles.itemLabel} onClick={() => handleChange('skin', 'shadow')}>
                    Shadow
                  </p>
                </div>
              </div>
            </div>

            {/* Semi Dark */}
            {settings.mode !== 'dark' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="customizer-semi-dark"
                  className={styles.sectionTitle}
                  style={{ cursor: 'pointer' }}
                >
                  Semi Dark
                </label>
                <Switch
                  id="customizer-semi-dark"
                  checked={settings.semiDark === true}
                  onChange={() => handleChange('semiDark', !settings.semiDark)}
                />
              </div>
            )}
          </div>

          <hr className={styles.hr} />

          {/* ── Layout Section ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Chip
              label="Layout"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: '0.75rem' }}
            />

            {/* Content Width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Ancho de Contenido</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div
                    className={`${styles.itemWrapper} ${settings.contentWidth === 'compact' ? styles.active : ''}`}
                    onClick={() => handleContentWidthChange('compact')}
                  >
                    <ContentCompact />
                  </div>
                  <p className={styles.itemLabel} onClick={() => handleContentWidthChange('compact')}>
                    Compacto
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div
                    className={`${styles.itemWrapper} ${settings.contentWidth === 'wide' ? styles.active : ''}`}
                    onClick={() => handleContentWidthChange('wide')}
                  >
                    <ContentWide />
                  </div>
                  <p className={styles.itemLabel} onClick={() => handleContentWidthChange('wide')}>
                    Ancho
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Customizer;
