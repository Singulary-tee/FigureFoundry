
export const spacing = {
  
  touchTarget: 'min-h-[44px] min-w-[44px]',
  touchTargetSmall: 'min-h-[36px] min-w-[36px]',

  container: {
    screen: 'p-3 sm:p-4 md:p-6',
    card: 'p-3 sm:p-4',
    cardCompact: 'p-2 sm:p-3',
    section: 'py-4 sm:py-6',
    modal: 'p-4 sm:p-6',
    drawer: 'p-4 sm:p-5',
    toolbar: 'px-3 py-2 sm:px-4 sm:py-2.5',
  },

  gap: {
    tight: 'gap-1.5',
    default: 'gap-2 sm:gap-3',
    relaxed: 'gap-3 sm:gap-4',
    loose: 'gap-4 sm:gap-6',
  },

  radius: {
    none: 'rounded-none',
    sm: 'rounded-md',
    default: 'rounded-lg',
    md: 'rounded-xl',
    full: 'rounded-full',
  },

  shadow: {
    subtle: 'shadow-sm shadow-black/40',
    card: 'shadow-md shadow-black/60',
    overlay: 'shadow-2xl shadow-black/80',
    glowEmerald: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    glowPurple: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
  },
} as const;
