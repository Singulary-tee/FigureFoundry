
export const typography = {
  fontFamily: {
    sans: 'font-sans antialiased tracking-tight',
    mono: 'font-mono text-xs antialiased tracking-normal',
  },

  heading: {
    h1: 'text-xl md:text-2xl font-semibold tracking-tight text-zinc-100 leading-snug',
    h2: 'text-lg md:text-xl font-semibold tracking-tight text-zinc-100 leading-snug',
    h3: 'text-sm md:text-base font-medium tracking-tight text-zinc-200 leading-normal',
    h4: 'text-xs md:text-sm font-medium tracking-tight text-zinc-300 leading-normal',
  },

  body: {
    base: 'text-sm leading-relaxed text-zinc-300',
    small: 'text-xs leading-normal text-zinc-400',
    xs: 'text-[11px] leading-normal text-zinc-500',
    lead: 'text-base md:text-lg leading-relaxed text-zinc-300 font-normal',
  },

  label: {
    primary: 'text-xs font-medium text-zinc-200 select-none leading-normal',
    secondary: 'text-[11px] font-medium text-zinc-400 select-none leading-normal',
    caps: 'text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none leading-normal',
    mono: 'font-mono text-[11px] text-zinc-300 leading-normal',
  },
} as const;
