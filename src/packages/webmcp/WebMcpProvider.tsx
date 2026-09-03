import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WebMcpToolDefinition, WebMcpCallLog, FigureState } from '../../types';
import { FigureDomainAction } from '../domain/reducer';
import { WebMcpServer } from './server';
import { getDatasetAwareTools, getPageAwareTools, BASE_WEBMCP_TOOLS } from './tools';
import { initWebMcpPolyfill, isNativeToolsPolicyAllowed } from './polyfill';
import { setupPostMessageTransport } from './transport';
import { WebMcpContextValue, WebMcpExecutionState, WebMcpAgent } from './types';

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
  const [toolVersion, setVersion] = useState(0);
  const nativeRegistrationRef = useRef<{
    context: any;
    names: Set<string>;
    controller?: AbortController;
  }>({ context: null, names: new Set() });

  // Keep a stable server instance across renders; it reads fresh state via getState().
  const dispatchRef = useRef(dispatchDomainAction);
  dispatchRef.current = dispatchDomainAction;
  const stateRef = useRef(currentState);
  stateRef.current = currentState;
  const server = useMemo(
    () => new WebMcpServer(
      (a) => dispatchRef.current(a),
      () => stateRef.current,
      undefined,
      () => ((stateRef.current as any).panels || []).map((panel: any) => panel.id)
    ),
    []
  );

  const registeredTools = useMemo(() => {
    const accessibleDatasetIds = Array.isArray(currentState.accessibleDatasetIds)
      ? currentState.accessibleDatasetIds
      : [];
    const accessibleDatasets = ((currentState as any).datasets || []).filter((dataset: any) =>
      accessibleDatasetIds.includes(dataset.id),
    );
    const schemaDatasetId = accessibleDatasets.find((dataset: any) => dataset.id === currentState.datasetId)?.id
      || accessibleDatasets[0]?.id;
    const datasetTools = schemaDatasetId
      ? getDatasetAwareTools(schemaDatasetId, currentState.currentRevision, accessibleDatasetIds)
      : BASE_WEBMCP_TOOLS;
    const pageTools = getPageAwareTools((currentState as any).activeView || 'figures');
    const customList = Array.from(customToolsRef.current.values()).map(
      (t: { definition: WebMcpToolDefinition; executeFn?: (args: any) => Promise<any> }) => t.definition
    );

    const toolMap = new Map<string, WebMcpToolDefinition>();
    datasetTools.forEach(t => toolMap.set(t.name, t));
    pageTools.forEach(t => toolMap.set(t.name, t));
    customList.forEach(t => toolMap.set(t.name, t));
    
    return Array.from(toolMap.values());
  }, [currentState.datasetId, currentState.currentRevision, currentState.accessibleDatasetIds, (currentState as any).activeView, (currentState as any).datasets, toolVersion]);

  const executeTool = useCallback(
    async (
      name: string,
      inputArgs: Record<string, any>,
      actor: 'agent' | 'human' = 'agent',
      agent?: WebMcpAgent
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
          
          res = await server.executeTool(name, inputArgs, actor, agent);
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
      const registration = {
        context: modelContext,
        names: new Set<string>(),
        controller: isNative ? new AbortController() : undefined,
      };
      nativeRegistrationRef.current = registration;

      registeredTools.forEach(tool => {
        registration.names.add(tool.name);
        try {
          const registrationResult = modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            annotations: tool.annotations,
            execute: async (args: any, agent?: WebMcpAgent) => {
              const res = await executeTool(tool.name, args, 'agent', agent);
              return res.result;
            }
          }, registration.controller ? { signal: registration.controller.signal } : undefined);
          Promise.resolve(registrationResult).catch(() => registration.names.delete(tool.name));
        } catch {
          registration.names.delete(tool.name);
        }
      });

      return () => {
        if (registration.controller) {
          registration.controller.abort();
        }
        registration.names.forEach((name) => {
          try {
            modelContext.unregisterTool?.(name);
          } catch {
            // A native registration may already have been removed by abort().
          }
        });
        if (nativeRegistrationRef.current === registration) {
          try {
            modelContext.clearContext?.();
          } catch {
            // Context teardown must not prevent tool cleanup.
          }
          nativeRegistrationRef.current = { context: null, names: new Set() };
        }
      };
    }
  }, [autoRegisterBrowser, registeredTools, executeTool]);

  useEffect(() => {
    const modelContext = nativeRegistrationRef.current.context;
    if (!modelContext?.provideContext) return;
    try {
      modelContext.provideContext({
        datasetId: stateRef.current.datasetId,
        currentRevision: stateRef.current.currentRevision,
        activeFigureId: (stateRef.current as any).activeFigureId || null,
        panels: (stateRef.current as any).panels || [],
        spec: stateRef.current.spec,
        activePreview: stateRef.current.activePreview,
      });
    } catch {
      // Context publication is best effort and never changes canonical state.
    }
  }, [currentState]);

  useEffect(() => {
    if (!enablePostMessageTransport) return;

    const cleanup = setupPostMessageTransport({
      listTools: () => registeredTools,
      executeTool: (name, args, actor) => executeTool(name, args, actor),
      getContext: () => ({
        datasetId: stateRef.current.datasetId,
        currentRevision: stateRef.current.currentRevision,
        activeFigureId: (stateRef.current as any).activeFigureId || null,
        panels: (stateRef.current as any).panels || [],
        spec: stateRef.current.spec,
        activePreview: stateRef.current.activePreview,
      })
    });

    return cleanup;
  }, [enablePostMessageTransport, registeredTools, executeTool]);

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
