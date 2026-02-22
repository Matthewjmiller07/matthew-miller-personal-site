/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';

// Debug logging
console.log('🔍 Tailwind Config Loading...');
console.log('slate[700]:', colors.slate[700]);
console.log('slate[800]:', colors.slate[800]);

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      /* ------------------------------
       *  Font families
       * ------------------------------*/
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },

      /* ------------------------------
       *  Semantic colour tokens
       * ------------------------------*/
      colors: {
        // Surfaces
        'surface-light': colors.slate[50],   // #f8fafc
        'surface-dark': colors.slate[900],  // #0f172a

        // Primary text
        'text-light': colors.slate[900],
        'text-dark': colors.slate[200],

        // Secondary text - MUCH darker for better contrast
        'muted-light': colors.slate[800],    // #1e293b - very dark
        'muted-dark': colors.slate[300],     // #cbd5e1 - light for dark mode

        // Accent / interactive
        accent: colors.cyan[600],
        'accent-hover': colors.cyan[700],
        'accent-light': colors.cyan[500],

        // Borders
        'border-light': colors.slate[300],
        'border-dark': colors.slate[700],

        // Cards / elevated surfaces
        'card-light': colors.white,
        'card-dark': colors.slate[800],

        // Full palettes for arbitrary utilities
        slate: colors.slate,
        cyan: colors.cyan,
        sky: colors.sky,
        white: colors.white,
        black: colors.black,
        transparent: colors.transparent,
      },

      /* ------------------------------
       *  Typography plugin overrides
       * ------------------------------*/
      typography: ({ theme }) => {
        // More debug logging
        console.log('💡 Typography theme muted-light:', theme('colors.muted-light'));
        console.log('💡 Typography theme muted-dark:', theme('colors.muted-dark'));
        
        return {
          DEFAULT: {
            css: {
              '--tw-prose-body': theme('colors.text-light'),
              '--tw-prose-headings': theme('colors.text-light'),
              '--tw-prose-lead': theme('colors.text-light'),
              '--tw-prose-links': theme('colors.accent'),
              '--tw-prose-bold': theme('colors.text-light'),
              '--tw-prose-counters': theme('colors.muted-light'),
              '--tw-prose-bullets': theme('colors.muted-light'),
              '--tw-prose-hr': theme('colors.border-light'),
              '--tw-prose-quotes': theme('colors.text-light'),
              '--tw-prose-quote-borders': theme('colors.accent-light'),
              '--tw-prose-captions': theme('colors.muted-light'),
              '--tw-prose-code': theme('colors.accent-hover'),
              '--tw-prose-pre-code': theme('colors.text-light'),
              '--tw-prose-pre-bg': theme('colors.slate[800]'),
              '--tw-prose-th-borders': theme('colors.border-light'),
              '--tw-prose-td-borders': theme('colors.border-light'),
            },
          },
          invert: {
            css: {
              '--tw-prose-body': theme('colors.text-dark'),
              '--tw-prose-headings': theme('colors.white'),
              '--tw-prose-lead': theme('colors.text-dark'),
              '--tw-prose-links': theme('colors.accent-light'),
              '--tw-prose-bold': theme('colors.white'),
              '--tw-prose-counters': theme('colors.muted-dark'),
              '--tw-prose-bullets': theme('colors.muted-dark'),
              '--tw-prose-hr': theme('colors.border-dark'),
              '--tw-prose-quotes': theme('colors.white'),
              '--tw-prose-quote-borders': theme('colors.accent'),
              '--tw-prose-captions': theme('colors.muted-dark'),
              '--tw-prose-code': theme('colors.accent'),
              '--tw-prose-pre-code': theme('colors.text-dark'),
              '--tw-prose-pre-bg': theme('colors.slate[800]'),
              '--tw-prose-th-borders': theme('colors.border-dark'),
              '--tw-prose-td-borders': theme('colors.border-dark'),
            },
          },
        };
      },
    },
  },
  plugins: [typography()],
};