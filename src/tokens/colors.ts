
export const colors = {
  
  brand: {
    primary: '#3ecf8e',
    primaryHover: '#34b27b',
    primaryDark: '#24b47e',
    tint: 'rgba(62, 207, 142, 0.1)',
    tintStrong: 'rgba(62, 207, 142, 0.2)',
    border: 'rgba(62, 207, 142, 0.3)',
    glow: 'rgba(62, 207, 142, 0.4)',
  },

  canvas: {
    base: 'bg-[#121212] text-[#EDEDED]',
    subtle: 'bg-[#171717]',
    surface: 'bg-[#171717]',
    card: 'bg-[#171717] border border-[#262626]',
    cardHover: 'hover:border-[#333333] hover:bg-[#1c1c1c] transition-colors',
    cardInteractive: 'bg-[#171717] border border-[#262626] hover:border-[#3e3e3e] active:scale-[0.99] transition-all',
    overlay: 'bg-black/70 backdrop-blur-md',
    toolbar: 'bg-[#171717]/95 backdrop-blur-md border-b border-[#262626]',
    panel: 'bg-[#171717] border-[#262626]',
    control: 'bg-[#1f1f1f] border border-[#2e2e2e]',
    controlHover: 'hover:bg-[#262626] hover:border-[#383838]',
    popover: 'bg-[#171717] border border-[#2e2e2e] text-[#EDEDED] shadow-2xl',
    muted: 'bg-[#1c1c1c]',
    highlight: 'bg-[#262626] text-[#EDEDED]',
  },

  text: {
    primary: 'text-[#EDEDED]',
    secondary: 'text-[#A1A1A1]',
    tertiary: 'text-[#737373]',
    muted: 'text-[#525252]',
    inverse: 'text-black',
    accent: 'text-[#3ecf8e]',
    accentHover: 'hover:text-[#34b27b]',
    brand: 'text-[#3ecf8e]',
    code: 'text-[#EDEDED] font-mono',
  },

  border: {
    subtle: 'border-[#222222]',
    default: 'border-[#262626]',
    control: 'border-[#2e2e2e]',
    strong: 'border-[#383838]',
    active: 'border-[#3ecf8e]',
    focus: 'focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]',
    accent: 'border-[#3ecf8e]/40',
    warning: 'border-amber-500/40',
    danger: 'border-rose-500/40',
  },

  intent: {
    success: {
      bg: 'bg-[#3ecf8e]/10',
      border: 'border-[#3ecf8e]/30',
      text: 'text-[#3ecf8e]',
      badge: 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20',
      dot: 'bg-[#3ecf8e]',
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
      dot: 'bg-amber-400',
    },
    danger: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
      dot: 'bg-rose-400',
    },
    info: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      text: 'text-sky-400',
      badge: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
      dot: 'bg-sky-400',
    },
    agent: {
      bg: 'bg-[#3ecf8e]/10',
      border: 'border-[#3ecf8e]/30',
      text: 'text-[#3ecf8e]',
      badge: 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/25',
      dot: 'bg-[#3ecf8e]',
    },
    human: {
      bg: 'bg-[#1f1f1f]',
      border: 'border-[#2e2e2e]',
      text: 'text-[#EDEDED]',
      badge: 'bg-[#1f1f1f] text-[#EDEDED] border border-[#2e2e2e]',
      dot: 'bg-[#EDEDED]',
    },
  },
} as const;
