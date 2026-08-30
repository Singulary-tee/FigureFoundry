import React, { useEffect, useRef, DependencyList } from 'react';
import { useModelContext } from './useModelContext';
import { WebMcpToolDefinition } from '../../types';

export interface UseToolOptions extends WebMcpToolDefinition {
  execute?: (args: Record<string, any>) => Promise<any> | any;
  enabled?: boolean;
}

export function useTool(options: UseToolOptions, deps: DependencyList = []): void {
  const { registerTool, unregisterTool } = useModelContext();
  const executeRef = useRef(options.execute);
  executeRef.current = options.execute;

  const { name, title, description, annotations, inputSchema, outputSchema, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      unregisterTool(name);
      return;
    }

    const toolDef: WebMcpToolDefinition = {
      name,
      title,
      description,
      annotations,
      inputSchema,
      outputSchema
    };

    registerTool(toolDef, async (args: Record<string, any>) => {
      if (executeRef.current) {
        return await executeRef.current(args);
      }
      return { success: true };
    });

    return () => {
      unregisterTool(name);
    };
    
  }, [name, title, description, enabled, registerTool, unregisterTool, ...deps]);
}
