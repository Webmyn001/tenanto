/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — deep teal. Reads professional + trustworthy, echoes
        // NYSC khaki/green tones without literally lifting them.
        brand: {
          50:  '#f0fbfa',
          100: '#d9f3f0',
          200: '#b3e6e1',
          300: '#7fd0c8',
          400: '#4ab5ab',
          500: '#249a8e',
          600: '#127c72',
          700: '#0f635c',
          800: '#0d4f4a',
          900: '#0b3f3b',
        },
        // Accent — warm amber for CTAs, highlights, "earn" indicators
        accent: {
          50:  '#fff8eb',
          100: '#ffeec7',
          200: '#ffdb89',
          300: '#ffc14b',
          400: '#ffa820',
          500: '#f88a07',
          600: '#dc6802',
          700: '#b64906',
          800: '#943a0c',
          900: '#7a310e',
        },
        // Soft cream surface — replaces cold gray for a warmer, home-like base
        cream: {
          50:  '#fdfbf7',
          100: '#f9f4ea',
          200: '#f1e7d0',
        },
        // Per-role identity colors — used for badges and dashboard accents
        role: {
          student:  '#2563eb', // blue — academic, focused
          corper:   '#15803d', // green — uniform-adjacent
          landlord: '#7c3aed', // violet — distinct from tenant roles
          admin:    '#dc2626', // red — authority signal
        },
        // Slate text — softer than pure black
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgb(15 23 42 / 0.04), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        lift: '0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.05)',
        ring: '0 0 0 4px rgb(18 124 114 / 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [],
};
