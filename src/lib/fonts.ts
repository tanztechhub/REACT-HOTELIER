// Curated allow-list, not free text: keeps visual quality consistent and
// avoids building <link> stylesheet URLs from arbitrary user input. Keys
// must stay in sync with NODE's businessProfileRouter theme schema.
export type FontOption = {
  key: string
  label: string
  family: string
  googleFontsUrl: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'jost',
    label: 'Jost (Default)',
    family: '"Jost", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,100..900;1,100..900&display=swap',
  },
  {
    key: 'inter',
    label: 'Inter',
    family: '"Inter", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    key: 'poppins',
    label: 'Poppins',
    family: '"Poppins", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  },
  {
    key: 'manrope',
    label: 'Manrope',
    family: '"Manrope", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
  },
  {
    key: 'dm-sans',
    label: 'DM Sans',
    family: '"DM Sans", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  },
  {
    key: 'space-grotesk',
    label: 'Space Grotesk',
    family: '"Space Grotesk", sans-serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  {
    key: 'playfair-display',
    label: 'Playfair Display (Elegant)',
    family: '"Playfair Display", serif',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
  },
  {
    key: 'space-mono',
    label: 'Space Mono (Terminal)',
    family: '"Space Mono", monospace',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
  },
]
