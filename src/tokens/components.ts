
export const components = {
  
  button: {
    base: 'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3ecf8e] cursor-pointer leading-normal',
    sizes: {
      xs: 'min-h-[28px] px-2.5 py-1 text-xs gap-1.5 leading-normal',
      sm: 'min-h-[34px] px-3 py-1.5 text-xs gap-1.5 leading-normal',
      md: 'min-h-[38px] px-3.5 py-2 text-sm gap-2 leading-normal',
      lg: 'min-h-[44px] px-4 py-2.5 text-sm gap-2 leading-normal',
      iconXs: 'h-7 w-7 min-h-[28px] min-w-[28px] p-0',
      iconSm: 'h-8 w-8 min-h-[32px] min-w-[32px] p-0',
      iconMd: 'h-9 w-9 min-h-[38px] min-w-[38px] p-0',
      iconLg: 'h-10 w-10 min-h-[44px] min-w-[44px] p-0',
      touch: 'min-h-[44px] px-4 py-2.5 text-sm gap-2 leading-normal',
    },
    variants: {
      
      primary: 'bg-[#3ecf8e] hover:bg-[#34b27b] active:bg-[#24b47e] text-black font-semibold shadow-none',
      
      secondary: 'bg-[#1f1f1f] text-[#EDEDED] hover:bg-[#282828] active:bg-[#222222] border border-[#2e2e2e] hover:border-[#3e3e3e]',
      
      outline: 'bg-transparent border border-[#2e2e2e] text-[#A1A1A1] hover:bg-[#1f1f1f] hover:text-[#EDEDED] hover:border-[#383838]',
      
      ghost: 'bg-transparent text-[#A1A1A1] hover:bg-[#1f1f1f] hover:text-[#EDEDED]',
      
      danger: 'bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/50 active:bg-rose-900',
      
      success: 'bg-[#3ecf8e] text-black hover:bg-[#34b27b] active:bg-[#24b47e] font-semibold',
      
      agent: 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/20 active:bg-[#3ecf8e]/25',
      brand: 'bg-[#3ecf8e] text-black hover:bg-[#34b27b] active:bg-[#24b47e] font-semibold',
    },
  },

  input: {
    base: 'w-full bg-[#121212] border border-[#2e2e2e] rounded-md px-3 py-1.5 text-sm text-[#EDEDED] placeholder:text-[#525252] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-colors disabled:opacity-50',
    sm: 'text-xs px-2.5 py-1 min-h-[32px]',
    md: 'text-sm px-3 py-1.5 min-h-[38px]',
    touch: 'text-base sm:text-sm px-3 py-2 min-h-[44px]',
    select: 'w-full bg-[#121212] border border-[#2e2e2e] rounded-md px-3 py-1.5 text-xs text-[#EDEDED] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-colors cursor-pointer',
  },

  badge: {
    base: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border select-none whitespace-nowrap',
    neutral: 'bg-[#1f1f1f] text-[#A1A1A1] border-[#2e2e2e]',
    accent: 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/25',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    info: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
    purple: 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/25',
    blue: 'bg-[#1f1f1f] text-[#EDEDED] border-[#2e2e2e]',
  },

  tabs: {
    list: 'inline-flex items-center gap-1 bg-[#121212] p-1 rounded-md border border-[#262626]',
    trigger: 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all select-none whitespace-nowrap text-[#8C8C8C] hover:text-[#EDEDED]',
    triggerActive: 'bg-[#1f1f1f] text-[#EDEDED] border border-[#2e2e2e] shadow-none font-medium',
    mobileBottomBar: 'fixed bottom-0 left-0 right-0 z-40 bg-[#171717]/95 backdrop-blur-lg border-t border-[#262626] flex items-center justify-around px-2 py-1.5 lg:hidden safe-area-bottom',
  },

  card: {
    base: 'bg-[#171717] border border-[#262626] rounded-lg overflow-hidden',
    interactive: 'bg-[#171717] border border-[#262626] rounded-lg overflow-hidden hover:border-[#383838] hover:bg-[#1a1a1a] active:scale-[0.99] transition-all cursor-pointer',
    header: 'px-4 py-3 border-b border-[#262626] flex items-center justify-between',
    body: 'p-4',
    footer: 'px-4 py-3 border-t border-[#262626] flex items-center justify-between',
  },

  modal: {
    overlay: 'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4',
    content: 'bg-[#171717] border border-[#2e2e2e] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden',
    drawerRight: 'fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-[#171717] border-l border-[#2e2e2e] shadow-2xl flex flex-col',
    drawerBottom: 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-[#171717] border-t border-[#2e2e2e] rounded-t-lg shadow-2xl flex flex-col safe-area-bottom',
  },
} as const;
