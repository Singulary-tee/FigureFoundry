import { WebMcpToolDefinition, WebMcpCallLog, WebMcpToolAnnotations, FigureState } from '../../types';

export type { WebMcpToolDefinition, WebMcpCallLog, WebMcpToolAnnotations };

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/list' | 'tools/call' | 'context/inspect' | 'ping';
  params?: {
    name?: string;
    arguments?: Record<string, any>;
    [key: string]: any;
  };
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface NativeWebMcpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  annotations?: WebMcpToolAnnotations;
  execute?: (params: Record<string, any>) => Promise<any> | any;
}

export interface BrowserModelContext {
  registerTool: (tool: NativeWebMcpTool) => void | Promise<void>;
  unregisterTool?: (name: string) => void | Promise<void>;
  provideContext?: (context: Record<string, any>) => void | Promise<void>;
  clearContext?: () => void | Promise<void>;
  listTools?: () => NativeWebMcpTool[];
  getTools?: () => NativeWebMcpTool[];
  getContext?: () => Record<string, any>;
}

export interface WebMcpExecutionState {
  isExecuting: boolean;
  activeToolName: string | null;
  invokingActor: 'agent' | 'human' | null;
  lastExecutedAt: number | null;
}

export interface WebMcpContextValue {
  registeredTools: WebMcpToolDefinition[];
  callLogs: WebMcpCallLog[];
  executionState: WebMcpExecutionState;
  registerTool: (tool: WebMcpToolDefinition, executeFn?: (args: Record<string, any>) => Promise<any>) => void;
  unregisterTool: (name: string) => void;
  executeTool: (name: string, inputArgs: Record<string, any>, actor?: 'agent' | 'human') => Promise<{ result: any; log: WebMcpCallLog }>;
  clearLogs: () => void;
  isNativeSupported: boolean;
  currentState: FigureState;
}
