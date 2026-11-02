/** Colores del sistema de diseño de Stitch (docs/diseno/stitch/rescatapp_oaxaca/DESIGN.md).
 *  Se definen como variables CSS (ver src/index.css) para poder cambiar entre modo claro y oscuro. */
const claves = ["surface", "surface-dim", "surface-bright", "surface-container-lowest", "surface-container-low", "surface-container", "surface-container-high", "surface-container-highest", "on-surface", "on-surface-variant", "inverse-surface", "inverse-on-surface", "outline", "outline-variant", "surface-tint", "primary", "on-primary", "primary-container", "on-primary-container", "inverse-primary", "secondary", "on-secondary", "secondary-container", "on-secondary-container", "tertiary", "on-tertiary", "tertiary-container", "on-tertiary-container", "error", "on-error", "error-container", "on-error-container", "primary-fixed", "primary-fixed-dim", "on-primary-fixed", "on-primary-fixed-variant", "secondary-fixed", "secondary-fixed-dim", "on-secondary-fixed", "on-secondary-fixed-variant", "tertiary-fixed", "tertiary-fixed-dim", "on-tertiary-fixed", "on-tertiary-fixed-variant", "background", "on-background", "surface-variant"];
const colors = Object.fromEntries(claves.map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]));

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pop: { '0%': { opacity: 0, transform: 'scale(.94)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        campana: { '0%,100%': { transform: 'rotate(0)' }, '20%': { transform: 'rotate(14deg)' }, '40%': { transform: 'rotate(-12deg)' }, '60%': { transform: 'rotate(8deg)' }, '80%': { transform: 'rotate(-6deg)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s ease-out both',
        'fade-in': 'fade-in .3s ease-out both',
        pop: 'pop .25s ease-out both',
        campana: 'campana .8s ease-in-out',
      },
    },
  },
  plugins: [],
};
