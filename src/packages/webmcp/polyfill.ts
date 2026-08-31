import { NativeWebMcpTool, BrowserModelContext } from './types';

export class WebMcpPolyfillContainer implements BrowserModelContext {
  private tools: Map<string, NativeWebMcpTool> = new Map();
  private contextData: Record<string, any> = {};

  public registerTool(tool: NativeWebMcpTool): void {
    if (!tool || !tool.name) {
      return;
    }
    this.tools.set(tool.name, tool);
  }

  public unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  public provideContext(context: Record<string, any>): void {
    this.contextData = { ...this.contextData, ...context };
  }

  public clearContext(): void {
    this.contextData = {};
    this.tools.clear();
  }

  public listTools(): NativeWebMcpTool[] {
    return Array.from(this.tools.values());
  }

  public getTools(): NativeWebMcpTool[] {
    return this.listTools();
  }

  public getContext(): Record<string, any> {
    return { ...this.contextData };
  }
}

export function isNativeToolsPolicyAllowed(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  // If we are in an iframe (which is always the case in the AI Studio preview),
  // native "tools" feature is disallowed and querying it or accessing document.modelContext
  // will log a Permissions Policy disallowed error.
  try {
    if (window.self !== window.top) {
      return false;
    }
  } catch (e) {
    // Cross-origin exception means we are definitely in an iframe
    return false;
  }

  try {
    const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      return policy.allowsFeature('tools');
    }
  } catch (e) {
    return false;
  }

  return true;
}

export function initWebMcpPolyfill(): {
  modelContext: BrowserModelContext;
  isNative: boolean;
} {
  if (typeof document !== 'undefined' && isNativeToolsPolicyAllowed()) {
    try {
      if (typeof (document as any).modelContext !== 'undefined') {
        return {
          modelContext: (document as any).modelContext,
          isNative: true
        };
      }
    } catch (e) {
      console.warn("Native modelContext check threw an error, falling back:", e);
    }
  }

  const container = new WebMcpPolyfillContainer();

  if (typeof window === 'undefined') {
    return {
      modelContext: container,
      isNative: false
    };
  }

  let nativeContext: any = null;
  let isNative = false;

  if (isNativeToolsPolicyAllowed()) {
    try {
      if ('modelContext' in navigator) {
        const navCtx = (navigator as any).modelContext;
        if (navCtx && typeof navCtx.registerTool === 'function') {
          nativeContext = navCtx;
          isNative = true;
        }
      }
    } catch (e) {
      nativeContext = null;
      isNative = false;
    }

    if (!nativeContext) {
      try {
        if ('modelContext' in document) {
          const docCtx = (document as any).modelContext;
          if (docCtx && typeof docCtx.registerTool === 'function') {
            nativeContext = docCtx;
            isNative = true;
          }
        }
      } catch (e) {
        nativeContext = null;
        isNative = false;
      }
    }
  }

  const safeWrapper: BrowserModelContext = {
    registerTool: (tool: NativeWebMcpTool) => {
      container.registerTool(tool);
      if (isNative && nativeContext) {
        try {
          nativeContext.registerTool(tool);
        } catch (err) {
          
          isNative = false;
          nativeContext = null;
        }
      }
    },
    unregisterTool: (name: string) => {
      container.unregisterTool(name);
      if (isNative && nativeContext) {
        try {
          if (typeof nativeContext.unregisterTool === 'function') {
            nativeContext.unregisterTool(name);
          }
        } catch (err) {
          isNative = false;
          nativeContext = null;
        }
      }
    },
    provideContext: (context: Record<string, any>) => {
      container.provideContext(context);
      if (isNative && nativeContext) {
        try {
          if (typeof nativeContext.provideContext === 'function') {
            nativeContext.provideContext(context);
          }
        } catch (err) {
          isNative = false;
          nativeContext = null;
        }
      }
    },
    clearContext: () => {
      container.clearContext();
      if (isNative && nativeContext) {
        try {
          if (typeof nativeContext.clearContext === 'function') {
            nativeContext.clearContext();
          }
        } catch (err) {
          isNative = false;
          nativeContext = null;
        }
      }
    },
    listTools: () => {
      return container.listTools();
    },
    getTools: () => {
      return container.getTools();
    },
    getContext: () => {
      return container.getContext();
    }
  };

  try {
    (window as any).__FIGURE_FOUNDRY_WEBMCP__ = {
      container: safeWrapper,
      isNative,
      version: '1.0.0-webmcp-w3c'
    };
    (window as any).modelContext = safeWrapper;
  } catch (e) {}

  return { modelContext: safeWrapper, isNative };
}
