import { createTheme, type MantineColorsTuple } from '@mantine/core';

const ink: MantineColorsTuple = [
  '#eef0ff',
  '#dcdff7',
  '#b6bce8',
  '#8d96db',
  '#6b76d0',
  '#5562ca',
  '#4957c8',
  '#3947b1',
  '#323f9e',
  '#26358b',
];

export const theme = createTheme({
  primaryColor: 'ink',
  primaryShade: { light: 6, dark: 4 },
  colors: { ink },
  fontFamily: "'Inter Tight', system-ui, sans-serif",
  defaultRadius: 'md',
  headings: {
    fontFamily: "'Bricolage Grotesque', 'Inter Tight', sans-serif",
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.15' },
      h2: { fontSize: '1.5rem', lineHeight: '1.25' },
      h3: { fontSize: '1.125rem', lineHeight: '1.3' },
    },
  },
  components: {
    Button: { defaultProps: { fw: 500 } },
  },
});
