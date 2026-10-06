/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          50: '#1a1a1a',
          100: '#242424',
          200: '#2a2a2a',
          300: '#333333',
        },
        charcoal: {
          900: '#ffffff',
          800: '#f9fafb',
          700: '#f3f4f6',
          600: '#e5e7eb',
          500: '#d1d5db',
          400: '#9ca3af',
          300: '#6b7280',
          200: '#4b5563',
          100: '#374151',
          50: '#1f2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 3px rgba(255,255,255,0.05)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255,255,255,0.1)',
        'elevated': '0 10px 40px -10px rgba(45, 212, 191, 0.3), 0 0 3px rgba(45, 212, 191, 0.4)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'brand-gradient': 'linear-gradient(135deg, #2dd4bf 0%, #3b82f6 100%)',
      }
    },
  },
  plugins: [],
};
