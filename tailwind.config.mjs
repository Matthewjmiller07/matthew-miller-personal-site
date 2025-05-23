/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import defaultTheme from 'tailwindcss/defaultTheme'; // Import defaultTheme
import colors from 'tailwindcss/colors'; // Import Tailwind's full color palette

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  darkMode: 'class', // Or 'media' for OS preference
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        'primary-light': colors.slate[800], // Darker for better contrast on light bg
        'primary-dark': colors.slate[200],  // Lighter for better contrast on dark bg
        'secondary-light': colors.slate[600],
        'secondary-dark': colors.slate[400],
        'bg-light': colors.slate[50],       // Off-white
        'bg-dark': colors.slate[900],       // Very dark blue/gray
        'accent': colors.cyan[600],
        'accent-hover': colors.cyan[700],
        'accent-dark': colors.cyan[400],
        'border-light': colors.slate[300], // Slightly darker border for light mode
        'border-dark': colors.slate[700],
        'card-bg-light': colors.white,
        'card-bg-dark': colors.slate[800], // Slightly lighter than main dark bg
        // Make sure all colors used directly are available
        slate: colors.slate,
        gray: colors.gray,
        cyan: colors.cyan,
        sky: colors.sky, // For selection color
        white: colors.white,
        black: colors.black,
        transparent: colors.transparent,
      },
      typography: ({ theme }) => ({
        DEFAULT: { // For light mode prose
          css: {
            '--tw-prose-body': theme('colors.slate[700]'),
            '--tw-prose-headings': theme('colors.slate[900]'),
            '--tw-prose-lead': theme('colors.slate[600]'),
            '--tw-prose-links': theme('colors.cyan[600]'),
            '--tw-prose-bold': theme('colors.slate[900]'),
            '--tw-prose-counters': theme('colors.slate[500]'),
            '--tw-prose-bullets': theme('colors.slate[400]'),
            '--tw-prose-hr': theme('colors.slate[300]'), // Lighter HR
            '--tw-prose-quotes': theme('colors.slate[900]'),
            '--tw-prose-quote-borders': theme('colors.cyan[300]'),
            '--tw-prose-captions': theme('colors.slate[500]'),
            '--tw-prose-code': theme('colors.cyan[700]'), // Code text
            '--tw-prose-pre-code': theme('colors.slate[200]'),
            '--tw-prose-pre-bg': theme('colors.slate[800]'), // Code block background
            '--tw-prose-th-borders': theme('colors.slate[400]'),
            '--tw-prose-td-borders': theme('colors.slate[300]'),
          },
        },
        invert: { // For dark mode prose (when .dark .prose-invert is used)
          css: {
            '--tw-prose-body': theme('colors.slate[300]'),
            '--tw-prose-headings': theme('colors.slate[100]'),
            '--tw-prose-lead': theme('colors.slate[400]'),
            '--tw-prose-links': theme('colors.cyan[400]'),
            '--tw-prose-bold': theme('colors.slate[100]'),
            '--tw-prose-counters': theme('colors.slate[400]'),
            '--tw-prose-bullets': theme('colors.slate[500]'), // Darker bullets for contrast
            '--tw-prose-hr': theme('colors.slate[700]'), // Lighter HR
            '--tw-prose-quotes': theme('colors.slate[100]'),
            '--tw-prose-quote-borders': theme('colors.cyan[700]'),
            '--tw-prose-captions': theme('colors.slate[400]'),
            '--tw-prose-code': theme('colors.cyan[300]'), // Code text
            '--tw-prose-pre-code': theme('colors.slate[200]'),
            '--tw-prose-pre-bg': theme('colors.slate[800]'), // Code block background consistent
            '--tw-prose-th-borders': theme('colors.slate[600]'),
            '--tw-prose-td-borders': theme('colors.slate[700]'),
          },
        },
      }),
    },
  },
  plugins: [
    typography(),
  ],
}