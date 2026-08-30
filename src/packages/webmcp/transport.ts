import { JsonRpcRequest, JsonRpcResponse, WebMcpToolDefinition } from './types';

export interface TransportHandlerOptions {
  listTools: () => WebMcpToolDefinition[];
  executeTool: (name: string, args: Record<string, any>, actor: 'agent' | 'human') => Promise<any>;
  getContext?: () => Record<string, any>;
}

export function setupPostMessageTransport(options: TransportHandlerOptions): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleMessage = async (event: MessageEvent) => {
    
    const data = event.data;
    if (!data || typeof data !== 'object' || data.jsonrpc !== '2.0' || !data.id || !data.method) {
      return;
    }

    const request = data as JsonRpcRequest;
    const { id, method, params } = request;

    const reply = (responsePayload: Partial<JsonRpcResponse>) => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        ...responsePayload
      };

      try {
        if (event.source && typeof (event.source as any).postMessage === 'function') {
          (event.source as any).postMessage(response, '*');
        } else {
          window.postMessage(response, '*');
        }
      } catch (err) {
        console.error('WebMCP Transport: Failed to postMessage reply', err);
      }
    };

    try {
      switch (method) {
        case 'ping': {
          reply({ result: { status: 'pong', protocol: 'WebMCP/1.0', timestamp: Date.now() } });
          break;
        }

        case 'tools/list': {
          const tools = options.listTools();
          reply({
            result: {
              tools: tools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
                outputSchema: t.outputSchema,
                annotations: t.annotations
              }))
            }
          });
          break;
        }

        case 'tools/call': {
          const toolName = params?.name;
          const toolArgs = params?.arguments || {};

          if (!toolName) {
            reply({
              error: {
                code: -32602,
                message: "Missing 'name' in params for tools/call"
              }
            });
            return;
          }

          const executionResult = await options.executeTool(toolName, toolArgs, 'agent');

          reply({
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof executionResult === 'string' ? executionResult : JSON.stringify(executionResult)
                }
              ],
              raw: executionResult,
              isError: executionResult?.error || executionResult?.status?.startsWith('rejected') ? true : false
            }
          });
          break;
        }

        case 'context/inspect': {
          const ctx = options.getContext ? options.getContext() : {};
          reply({ result: ctx });
          break;
        }

        default: {
          reply({
            error: {
              code: -32601,
              message: `Method '${method}' not found.`
            }
          });
          break;
        }
      }
    } catch (error: any) {
      reply({
        error: {
          code: -32603,
          message: error?.message || 'Internal WebMCP JSON-RPC execution error'
        }
      });
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
