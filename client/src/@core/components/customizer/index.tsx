'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useSettings } from '@/@core/hooks/useSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { actorFor } from '@configs/navigation';
import primaryColorConfig from '@/configs/primaryColorConfig';
import SkinDefault from '@/@core/svg/SkinDefault';
import SkinBordered from '@/@core/svg/SkinBordered';
import ContentCompact from '@/@core/svg/ContentCompact';
import ContentWide from '@/@core/svg/ContentWide';
import styles from './styles.module.css';

const Customizer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, resetSettings, isSettingsChanged } = useSettings();

  const { roleName } = usePermissions();
  const isPatient = actorFor(roleName) === 'PATIENT';
  const isMobile = useMediaQuery('(max-width:600px)');
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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
        <button
          type="button"
          className={styles.toggler}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir personalización"
          aria-expanded={isOpen}
        >
          <i className="ri-settings-5-line" style={{ fontSize: 22 }} />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h6 className={styles.customizerTitle}>Personalizar Tema</h6>
            <p className={styles.customizerSubtitle}>Vista previa en tiempo real</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={resetSettings}
              aria-label="Restablecer ajustes"
              style={{ position: 'relative' }}
            >
              <i className="ri-refresh-line" style={{ fontSize: 20, opacity: 0.7 }} />
              <span className={`${styles.dotStyles} ${isSettingsChanged ? styles.show : ''}`} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar personalización"
            >
              <i className="ri-close-line" style={{ fontSize: 22, opacity: 0.7 }} />
            </button>
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
                  <button
                    type="button"
                    key={item.name}
                    className={`${styles.primaryColorWrapper} ${settings.primaryColor === item.main ? styles.active : ''
                      }`}
                    onClick={() => handleChange('primaryColor', item.main)}
                    aria-label={`Color primario ${item.name}`}
                    aria-pressed={settings.primaryColor === item.main}
                  >
                    <span
                      className={styles.primaryColor}
                      style={{ backgroundColor: item.main }}
                    />
                  </button>
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
                      <button
                        type="button"
                        className={`${styles.itemWrapper} ${styles.modeWrapper} ${settings.mode === mode ? styles.active : ''
                          }`}
                        onClick={() => handleChange('mode', mode)}
                        aria-label={`Modo ${labels[mode]}`}
                        aria-pressed={settings.mode === mode}
                      >
                        <i className={icons[mode]} style={{ fontSize: 30 }} />
                      </button>
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
                  <button
                    type="button"
                    className={`${styles.itemWrapper} ${settings.skin === 'default' ? styles.active : ''}`}
                    onClick={() => handleChange('skin', 'default')}
                    aria-label="Skin por defecto"
                    aria-pressed={settings.skin === 'default'}
                  >
                    <SkinDefault />
                  </button>
                  <p className={styles.itemLabel} onClick={() => handleChange('skin', 'default')}>
                    Por defecto
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <button
                    type="button"
                    className={`${styles.itemWrapper} ${settings.skin === 'bordered' ? styles.active : ''}`}
                    onClick={() => handleChange('skin', 'bordered')}
                    aria-label="Skin con bordes"
                    aria-pressed={settings.skin === 'bordered'}
                  >
                    <SkinBordered />
                  </button>
                  <p className={styles.itemLabel} onClick={() => handleChange('skin', 'bordered')}>
                    Con bordes
                  </p>
                </div>
              </div>
            </div>

            {/* Semi Dark */}
            {!isPatient && settings.mode !== 'dark' && (
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

            {/* Menú lateral: el paciente usa menú horizontal y barra inferior */}
            {!isPatient && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className={styles.sectionTitle}>Menú</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {([
                    { value: 'vertical', label: 'Expandido', icon: 'ri-layout-left-line' },
                    { value: 'collapsed', label: 'Colapsado', icon: 'ri-layout-left-2-line' },
                  ] as const).map((opt) => (
                    <div
                      key={opt.value}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                    >
                      <button
                        type="button"
                        className={`${styles.itemWrapper} ${styles.modeWrapper} ${settings.layout === opt.value ? styles.active : ''}`}
                        onClick={() => handleChange('layout', opt.value)}
                        aria-label={`Menú ${opt.label.toLowerCase()}`}
                        aria-pressed={settings.layout === opt.value}
                      >
                        <i className={opt.icon} style={{ fontSize: 30 }} />
                      </button>
                      <p className={styles.itemLabel} onClick={() => handleChange('layout', opt.value)}>
                        {opt.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Ancho de Contenido</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <button
                    type="button"
                    className={`${styles.itemWrapper} ${settings.contentWidth === 'compact' ? styles.active : ''}`}
                    onClick={() => handleContentWidthChange('compact')}
                    aria-label="Ancho de contenido compacto"
                    aria-pressed={settings.contentWidth === 'compact'}
                  >
                    <ContentCompact />
                  </button>
                  <p className={styles.itemLabel} onClick={() => handleContentWidthChange('compact')}>
                    Compacto
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <button
                    type="button"
                    className={`${styles.itemWrapper} ${settings.contentWidth === 'wide' ? styles.active : ''}`}
                    onClick={() => handleContentWidthChange('wide')}
                    aria-label="Ancho de contenido ancho"
                    aria-pressed={settings.contentWidth === 'wide'}
                  >
                    <ContentWide />
                  </button>
                  <p className={styles.itemLabel} onClick={() => handleContentWidthChange('wide')}>
                    Ancho
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className={styles.hr} />

          {/* ── Accesibilidad Section (WCAG 2.1 AA) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Chip
              label="Accesibilidad"
              size="small"
              color="primary"
              variant="outlined"
              icon={<i className="ri-accessibility-line" style={{ fontSize: 14 }} />}
              sx={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: '0.75rem' }}
            />

            {/* Tamaño de texto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Tamaño de Texto</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {([
                  { value: 'normal', label: 'Normal', size: 14 },
                  { value: 'large', label: 'Grande', size: 18 },
                  { value: 'xlarge', label: 'Muy Grande', size: 22 },
                ] as const).map((opt) => (
                  <div
                    key={opt.value}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                  >
                    <button
                      type="button"
                      className={`${styles.itemWrapper} ${styles.modeWrapper} ${(settings.fontSize ?? 'normal') === opt.value ? styles.active : ''}`}
                      onClick={() => handleChange('fontSize', opt.value)}
                      aria-pressed={(settings.fontSize ?? 'normal') === opt.value}
                      aria-label={`Tamaño de texto ${opt.label}`}
                    >
                      <span style={{ fontSize: opt.size, fontWeight: 700 }}>Aa</span>
                    </button>
                    <p className={styles.itemLabel} onClick={() => handleChange('fontSize', opt.value)}>
                      {opt.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alto contraste */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                htmlFor="customizer-high-contrast"
                className={styles.sectionTitle}
                style={{ cursor: 'pointer' }}
              >
                Alto Contraste
              </label>
              <Switch
                id="customizer-high-contrast"
                checked={settings.highContrast ?? false}
                onChange={() => handleChange('highContrast', !(settings.highContrast ?? false))}
              />
            </div>

            {/* Áreas táctiles grandes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                htmlFor="customizer-large-targets"
                className={styles.sectionTitle}
                style={{ cursor: 'pointer' }}
              >
                Botones Grandes
              </label>
              <Switch
                id="customizer-large-targets"
                checked={settings.largeTargets ?? false}
                onChange={() => handleChange('largeTargets', !(settings.largeTargets ?? false))}
              />
            </div>

            {/* Reducir animaciones */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                htmlFor="customizer-reduce-motion"
                className={styles.sectionTitle}
                style={{ cursor: 'pointer' }}
              >
                Reducir Animaciones
              </label>
              <Switch
                id="customizer-reduce-motion"
                checked={settings.reduceMotion ?? false}
                onChange={() => handleChange('reduceMotion', !(settings.reduceMotion ?? false))}
              />
            </div>

            {/* Modo daltonismo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className={styles.sectionTitle}>Daltonismo</p>
              <p style={{ fontSize: '0.72rem', opacity: 0.7, margin: 0, lineHeight: 1.4 }}>
                Ajusta los colores de la aplicación para personas con dificultad para distinguir ciertos tonos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { value: 'none', label: 'Ninguno', desc: 'Sin ajuste' },
                  { value: 'deuteranopia', label: 'Deuteranopía', desc: 'Ciego al verde (~6% hombres)' },
                  { value: 'protanopia', label: 'Protanopía', desc: 'Ciego al rojo' },
                  { value: 'tritanopia', label: 'Tritanopía', desc: 'Ciego al azul' },
                  { value: 'achromatopsia', label: 'Escala de grises', desc: 'Sin color' },
                ] as const).map((opt) => {
                  const isActive = (settings.colorBlindMode ?? 'none') === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => handleChange('colorBlindMode', opt.value)}
                      aria-pressed={isActive}
                      style={{
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'start',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{opt.label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Customizer;
