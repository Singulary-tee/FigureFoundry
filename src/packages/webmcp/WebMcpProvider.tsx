import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WebMcpToolDefinition, WebMcpCallLog, FigureState } from '../../types';
import { FigureDomainAction } from '../domain/reducer';
import { WebMcpServer } from './server';
import { getDatasetAwareTools, BASE_WEBMCP_TOOLS } from './tools';
import { initWebMcpPolyfill, isNativeToolsPolicyAllowed } from './polyfill';
import { setupPostMessageTransport } from './transport';
import { WebMcpContextValue, WebMcpExecutionState } from './types';

export const WebMcpContext = createContext<WebMcpContextValue | null>(null);

export interface WebMcpProviderProps {
  children: React.ReactNode;
  currentState: FigureState;
  dispatchDomainAction: (action: FigureDomainAction) => any;
  autoRegisterBrowser?: boolean;
  enablePostMessageTransport?: boolean;
  onCallLog?: (log: WebMcpCallLog) => void;
}

export const WebMcpProvider: React.FC<WebMcpProviderProps> = ({
  children,
  currentState,
  dispatchDomainAction,
  autoRegisterBrowser = true,
  enablePostMessageTransport = true,
  onCallLog
}) => {
  const [callLogs, setCallLogs] = useState<WebMcpCallLog[]>([]);
  const [executionState, setExecutionState] = useState<WebMcpExecutionState>({
    isExecuting: false,
    activeToolName: null,
    invokingActor: null,
    lastExecutedAt: null
  });

  const customToolsRef = useRef<Map<string, { definition: WebMcpToolDefinition; executeFn?: (args: any) => Promise<any> }>>(new Map());
  const [, setVersion] = useState(0);

  // Keep a stable server instance across renders; it reads fresh state via getState().
  const dispatchRef = useRef(dispatchDomainAction);
  dispatchRef.current = dispatchDomainAction;
  const stateRef = useRef(currentState);
  stateRef.current = currentState;
  const server = useMemo(
    () => new WebMcpServer((a) => dispatchRef.current(a), () => stateRef.current),
    []
  );

  const registeredTools = useMemo(() => {
    const datasetTools = getDatasetAwareTools(currentState.datasetId, currentState.currentRevision);
    const customList = Array.from(customToolsRef.current.values()).map(
      (t: { definition: WebMcpToolDefinition; executeFn?: (args: any) => Promise<any> }) => t.definition
    );

    const toolMap = new Map<string, WebMcpToolDefinition>();
    datasetTools.forEach(t => toolMap.set(t.name, t));
    customList.forEach(t => toolMap.set(t.name, t));
    
    return Array.from(toolMap.values());
  }, [currentState.datasetId, currentState.currentRevision]);

  const executeTool = useCallback(
    async (
      name: string,
      inputArgs: Record<string, any>,
      actor: 'agent' | 'human' = 'agent'
    ): Promise<{ result: any; log: WebMcpCallLog }> => {
      setExecutionState({
        isExecuting: true,
        activeToolName: name,
        invokingActor: actor,
        lastExecutedAt: Date.now()
      });

      try {
        
        const customEntry = customToolsRef.current.get(name);
        let res: { result: any; log: WebMcpCallLog };

        if (customEntry?.executeFn) {
          const startTime = performance.now();
          let status: 'success' | 'error' | 'rejected' = 'success';
          let customResult: any;

          try {
            customResult = await customEntry.executeFn(inputArgs);
          } catch (err: any) {
            status = 'error';
            customResult = { error: err.message || 'Custom tool error' };
          }

          const durationMs = Math.round(performance.now() - startTime);
          const payloadBytes = new Blob([JSON.stringify(customResult)]).size;

          const log: WebMcpCallLog = {
            id: 'log_' + Math.random().toString(36).substring(2, 9),
            toolName: name,
            timestamp: Date.now(),
            inputArgs,
            result: customResult,
            durationMs,
            payloadBytes,
            status
          };

          res = { result: customResult, log };
        } else {
          
          res = await server.executeTool(name, inputArgs, actor);
        }

        setCallLogs(prev => [res.log, ...prev]);
        if (onCallLog) {
          onCallLog(res.log);
        }
        return res;
      } finally {
        setExecutionState(prev => ({
          ...prev,
          isExecuting: false,
          activeToolName: null
        }));
      }
    },
    [server, onCallLog]
  );

  const registerTool = useCallback(
    (tool: WebMcpToolDefinition, executeFn?: (args: Record<string, any>) => Promise<any>) => {
      customToolsRef.current.set(tool.name, { definition: tool, executeFn });
      setVersion(v => v + 1);
    },
    []
  );

  const unregisterTool = useCallback((name: string) => {
    customToolsRef.current.delete(name);
    setVersion(v => v + 1);
  }, []);

  const clearLogs = useCallback(() => {
    setCallLogs([]);
  }, []);

  const [isNativeSupported, setIsNativeSupported] = useState(false);

  useEffect(() => {
    if (!autoRegisterBrowser) return;

    let modelContext: any = null;
    let isNative = false;

    // Feature detect native document.modelContext first as per Defect 5 requirement.
    // Native must always win when both are available.
    try {
      if (typeof document !== 'undefined' && isNativeToolsPolicyAllowed() && typeof (document as any).modelContext !== 'undefined') {
        modelContext = (document as any).modelContext;
        isNative = true;
      }
    } catch (e) {
      console.warn("Native modelContext detection threw an error, falling back:", e);
      modelContext = null;
      isNative = false;
    }

    if (!modelContext) {
      // Fallback path to polyfill.ts if the native API is absent or blocked.
      const poly = initWebMcpPolyfill();
      modelContext = poly.modelContext;
      isNative = poly.isNative;
    }
    setIsNativeSupported(isNative);

    if (modelContext?.registerTool) {
      
      registeredTools.forEach(tool => {
        try {
          modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            annotations: tool.annotations,
            execute: async (args: any) => {
              const res = await executeTool(tool.name, args, 'agent');
              return {
                content: [{ type: 'text', text: JSON.stringify(res.result) }]
              };
            }
          });
        } catch (e) {}
      });

      try {
        if (modelContext.provideContext) {
          modelContext.provideContext({
            datasetId: currentState.datasetId,
            currentRevision: currentState.currentRevision,
            spec: currentState.spec,
            activePreview: currentState.activePreview
          });
        }
      } catch (e) {}
    }
  }, [autoRegisterBrowser, registeredTools, currentState, executeTool]);

  useEffect(() => {
    if (!enablePostMessageTransport) return;

    const cleanup = setupPostMessageTransport({
      listTools: () => registeredTools,
      executeTool: (name, args, actor) => executeTool(name, args, actor),
      getContext: () => ({
        datasetId: currentState.datasetId,
        currentRevision: currentState.currentRevision,
        spec: currentState.spec,
        activePreview: currentState.activePreview
      })
    });

    return cleanup;
  }, [enablePostMessageTransport, registeredTools, executeTool, currentState]);

  const value: WebMcpContextValue = useMemo(
    () => ({
      registeredTools,
      callLogs,
      executionState,
      registerTool,
      unregisterTool,
      executeTool,
      clearLogs,
      isNativeSupported,
      currentState
    }),
    [
      registeredTools,
      callLogs,
      executionState,
      registerTool,
      unregisterTool,
      executeTool,
      clearLogs,
      isNativeSupported,
      currentState
    ]
  );

  return <WebMcpContext.Provider value={value}>{children}</WebMcpContext.Provider>;
};
