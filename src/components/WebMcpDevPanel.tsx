import React, { useState, useMemo } from 'react';
import { useModelContext } from '../packages/webmcp/useModelContext';
import { WebMcpToolDefinition, WebMcpCallLog } from '../types';
import {
  X,
  Bot,
  Terminal,
  Code2,
  Send,
  Play,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  ShieldAlert,
  HelpCircle,
  FileCode2,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface WebMcpDevPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentTimelineEntry {
  id: string;
  type: 'user' | 'agent_thought' | 'tool_call' | 'tool_result' | 'system';
  content?: string;
  toolName?: string;
  args?: any;
  result?: any;
  status?: string;
  durationMs?: number;
  timestamp: number;
}

/**
 * WebMcpDevPanel — LOCAL TESTING HARNESS ONLY.
 *
 * This panel calls Gemini directly and invokes tool executors in-process.
 * It does NOT register tools through the browser's native document.modelContext
 * API and is not a demonstration of WebMCP. It exists only to verify tool
 * logic (validation, schemas, domain commands) quickly during development,
 * including from mobile, before testing the real native path separately.
 *
 * The actual WebMCP integration is exercised through document.modelContext.
 * registerTool() in WebMcpProvider.tsx and verified against a real
 * WebMCP-capable browser session, not through this panel.
 */
export const WebMcpDevPanel: React.FC<WebMcpDevPanelProps> = ({ isOpen, onClose }) => {
  const { registeredTools, callLogs, executeTool, clearLogs, currentState } = useModelContext();

  const [activeTab, setActiveTab] = useState<'simulator' | 'schemas' | 'executor'>('simulator');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [timeline, setTimeline] = useState<AgentTimelineEntry[]>([
    {
      id: 'init',
      type: 'system',
      content: 'Local tool-logic simulator (not native WebMCP) initialized. Environment Gemini key is active. Tools synced with current dataset state.',
      timestamp: Date.now()
    }
  ]);

  // Schema Tab state
  const [schemaSearch, setSchemaSearch] = useState('');
  const [selectedToolSchema, setSelectedToolSchema] = useState<WebMcpToolDefinition | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Manual Executor state
  const [selectedExecToolName, setSelectedExecToolName] = useState<string>('inspect_dataset_fields');
  const [execArgsJson, setExecArgsJson] = useState<string>('{}');
  const [execActor, setExecActor] = useState<'agent' | 'human'>('agent');
  const [execResult, setExecResult] = useState<any>(null);
  const [execError, setExecError] = useState<string | null>(null);

  // Filter tools for Schema tab
  const filteredTools = useMemo(() => {
    if (!schemaSearch.trim()) return registeredTools;
    const q = schemaSearch.toLowerCase();
    return registeredTools.filter(
      t => t.name.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
  }, [registeredTools, schemaSearch]);

  const activeExecToolDef = useMemo(() => {
    return registeredTools.find(t => t.name === selectedExecToolName) || registeredTools[0];
  }, [registeredTools, selectedExecToolName]);

  // Interactive simulation states
  const [activeSession, setActiveSession] = useState<{
    history: any[];
    pendingCalls: any[] | null;
    turnCount: number;
  } | null>(null);
  const [autoExecute, setAutoExecute] = useState<boolean>(false);

  // Handle Preset Prompts
  const handleRunPresetPrompt = (promptText: string) => {
    setAgentPrompt(promptText);
    runAgentSimulation(promptText);
  };

  // Agent Simulation Core Flow with Interactive Step Gate
  const runAgentSimulation = async (textToRun?: string) => {
    const prompt = textToRun || agentPrompt;
    if (!prompt.trim() || isAgentRunning) return;

    setIsAgentRunning(true);
    setAgentPrompt('');
    setActiveSession(null); // Clear any active session

    const userEntryId = 'user_' + Date.now();
    setTimeline(prev => [
      ...prev,
      {
        id: userEntryId,
        type: 'user',
        content: prompt,
        timestamp: Date.now()
      }
    ]);

    const conversationHistory: any[] = [];
    await executeAgentTurn(prompt, conversationHistory, 1);
  };

  const executeAgentTurn = async (prompt: string | undefined, history: any[], turnCount: number) => {
    try {
      setIsAgentRunning(true);

      const response = await fetch('/api/webmcp/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          tools: registeredTools,
          history: history,
          context: {
            datasetId: currentState.datasetId,
            currentRevision: currentState.currentRevision
          }
        })
      });

      if (prompt) {
        history.push({ role: 'user', parts: [{ text: prompt }] });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned status ${response.status}`);
      }

      // Log thought if text returned
      if (data.text) {
        setTimeline(prev => [
          ...prev,
          {
            id: 'thought_' + Date.now() + '_' + turnCount,
            type: 'agent_thought',
            content: data.text,
            timestamp: Date.now()
          }
        ]);
      }

      // Add model response to history
      const nextHistory = [...history];
      if (data.candidateContent) {
        nextHistory.push(data.candidateContent);
      } else if (data.text || (data.functionCalls && data.functionCalls.length > 0)) {
        const modelParts: any[] = [];
        if (data.text) modelParts.push({ text: data.text });
        if (data.functionCalls) {
          data.functionCalls.forEach((fc: any) => {
            modelParts.push({ functionCall: { name: fc.name, args: fc.args } });
          });
        }
        nextHistory.push({ role: 'model', parts: modelParts });
      }

      if (data.functionCalls && data.functionCalls.length > 0) {
        if (autoExecute) {
          // Autonomous Auto-Execution
          await commitToolCalls(data.functionCalls, nextHistory, turnCount);
        } else {
          // Interactive Approval Gate (Default)
          setActiveSession({
            history: nextHistory,
            pendingCalls: data.functionCalls,
            turnCount
          });
          setIsAgentRunning(false);
        }
      } else {
        // Finished successfully without tool calls
        if (!data.text) {
          setTimeline(prev => [
            ...prev,
            {
              id: 'no_op_' + Date.now(),
              type: 'system',
              content: 'Agent finished execution session.',
              timestamp: Date.now()
            }
          ]);
        }
        setActiveSession(null);
        setIsAgentRunning(false);
      }
    } catch (err: any) {
      setTimeline(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          type: 'system',
          content: `Simulation Error: ${err.message || err}`,
          timestamp: Date.now()
        }
      ]);
      setActiveSession(null);
      setIsAgentRunning(false);
    }
  };

  const commitToolCalls = async (calls: any[], history: any[], turnCount: number) => {
    setIsAgentRunning(true);
    const toolResponseParts: any[] = [];

    try {
      for (const fc of calls) {
        const callId = 'call_' + Math.random().toString(36).substring(2, 7);

        setTimeline(prev => [
          ...prev,
          {
            id: callId,
            type: 'tool_call',
            toolName: fc.name,
            args: fc.args,
            timestamp: Date.now()
          }
        ]);

        const startTime = performance.now();
        const execution = await executeTool(fc.name, fc.args, 'agent');
        const durationMs = Math.round(performance.now() - startTime);

        setTimeline(prev => [
          ...prev,
          {
            id: 'res_' + callId,
            type: 'tool_result',
            toolName: fc.name,
            result: execution.result,
            status: execution.log.status,
            durationMs,
            timestamp: Date.now()
          }
        ]);

        toolResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: typeof execution.result === 'object' && execution.result !== null
              ? execution.result
              : { result: execution.result }
          }
        });
      }

      const nextHistory = [
        ...history,
        {
          role: 'user',
          parts: toolResponseParts
        }
      ];

      const MAX_TURNS = 8;
      if (turnCount < MAX_TURNS) {
        // Call backend for the next step of the agent's chain
        await executeAgentTurn(undefined, nextHistory, turnCount + 1);
      } else {
        setTimeline(prev => [
          ...prev,
          {
            id: 'max_turns_' + Date.now(),
            type: 'system',
            content: `Reached limit of ${MAX_TURNS} simulation turns.`,
            timestamp: Date.now()
          }
        ]);
        setActiveSession(null);
        setIsAgentRunning(false);
      }
    } catch (err: any) {
      setTimeline(prev => [
        ...prev,
        {
          id: 'err_tools_' + Date.now(),
          type: 'system',
          content: `Tool Execution Error: ${err.message || err}`,
          timestamp: Date.now()
        }
      ]);
      setActiveSession(null);
      setIsAgentRunning(false);
    }
  };

  const handleApprovePendingCalls = async () => {
    if (!activeSession || !activeSession.pendingCalls) return;
    const { history, pendingCalls, turnCount } = activeSession;
    setActiveSession(null);
    await commitToolCalls(pendingCalls, history, turnCount);
  };

  const handleDeclinePendingCalls = () => {
    setTimeline(prev => [
      ...prev,
      {
        id: 'decline_' + Date.now(),
        type: 'system',
        content: 'Human user declined agent proposed tool calls. Session ended.',
        timestamp: Date.now()
      }
    ]);
    setActiveSession(null);
  };

  // Populate sample parameters for Manual Executor
  const handleFillSampleParams = (toolName: string) => {
    setSelectedExecToolName(toolName);
    setExecError(null);
    setExecResult(null);

    switch (toolName) {
      case 'inspect_dataset_fields':
      case 'inspect_figure_state':
        setExecArgsJson('{}');
        break;

      case 'propose_figure_revision': {
        const fields = currentState.spec?.encoding?.x?.field
          ? [currentState.spec.encoding.x.field, currentState.spec.encoding.y?.field || '']
          : ['bill_length_mm', 'bill_depth_mm'];
        setExecArgsJson(
          JSON.stringify(
            {
              targetPanelId: (currentState as any).selectedPanelId || 'panel-a',
              figureIntent: 'relationship',
              mark: 'point',
              encoding: {
                x: { field: fields[0] || 'x_field', type: 'quantitative' },
                y: { field: fields[1] || 'y_field', type: 'quantitative' },
                color: { field: 'species', type: 'categorical' }
              },
              showsRawObservations: true,
              uncertaintyEncoding: null
            },
            null,
            2
          )
        );
        break;
      }

      case 'apply_figure_revision':
        setExecArgsJson(
          JSON.stringify(
            {
              previewId: currentState.activePreview?.previewId || 'prev_sample_123',
              basedOnRevision: currentState.currentRevision,
              targetPanelId: currentState.activePreview?.panelId || (currentState as any).selectedPanelId || 'panel-a'
            },
            null,
            2
          )
        );
        break;

      case 'validate_figure_revision':
        setExecArgsJson(
          JSON.stringify(
            {
              figureIntent: 'distribution',
              mark: 'bar',
              encoding: {
                x: { field: 'body_mass_g', type: 'quantitative' },
                y: { field: 'count', type: 'quantitative' }
              },
              showsRawObservations: false,
              uncertaintyEncoding: null
            },
            null,
            2
          )
        );
        break;

      case 'perform_statistical_test':
        setExecArgsJson(
          JSON.stringify(
            {
              testType: 't-test',
              valueField: 'bill_length_mm',
              groupField: 'sex',
              group1Val: 'male',
              group2Val: 'female'
            },
            null,
            2
          )
        );
        break;

      case 'set_publication_style':
        setExecArgsJson(
          JSON.stringify(
            {
              themePreset: 'nature',
              customTitle: 'Morphological Measurements in Adelie Penguins',
              customSubtitle: 'Nature Scientific Reports Style'
            },
            null,
            2
          )
        );
        break;

      case 'export_publication_figure':
        setExecArgsJson(
          JSON.stringify(
            {
              format: 'full-bundle'
            },
            null,
            2
          )
        );
        break;

      default:
        setExecArgsJson('{}');
        break;
    }
  };

  // Manual execution handler
  const handleExecuteManual = async () => {
    setExecError(null);
    setExecResult(null);

    let parsedArgs: Record<string, any> = {};
    try {
      parsedArgs = JSON.parse(execArgsJson || '{}');
    } catch (e: any) {
      setExecError(`Invalid JSON parameters: ${e.message}`);
      return;
    }

    try {
      const res = await executeTool(selectedExecToolName, parsedArgs, execActor, {
        requestUserInteraction: async (callback) => callback(),
      });
      setExecResult(res.result);
    } catch (e: any) {
      setExecError(`Execution failed: ${e.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden text-[#EDEDED] font-sans">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between bg-[#1f1f1f]/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e]">
              <Cpu className="w-5 h-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                  WebMCP Browser Agent Simulator
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 shrink-0">
                  DEV GATED
                </span>
              </div>
              <p className="text-xs text-[#8C8C8C] truncate">
                Simulate general AI browser agents (e.g. OpenAI Operator, Gemini Chrome Agent) interacting with page WebMCP tools
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8C8C8C] hover:text-white hover:bg-[#262626] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-4 py-2 border-b border-[#262626] bg-[#121212] flex items-center justify-between shrink-0 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all min-h-[40px] cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 shadow-xs'
                  : 'text-[#8C8C8C] hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Agent Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('schemas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all min-h-[40px] cursor-pointer ${
                activeTab === 'schemas'
                  ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 shadow-xs'
                  : 'text-[#8C8C8C] hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>LLM Schemas ({registeredTools.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('executor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all min-h-[40px] cursor-pointer ${
                activeTab === 'executor'
                  ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 shadow-xs'
                  : 'text-[#8C8C8C] hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Manual Execution & Logs ({callLogs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8C8C8C] shrink-0">
            <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2e2e2e]">
              <span className="text-[10px] text-[#737373] px-1 font-sans font-medium hidden sm:inline">Model:</span>
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.6-flash')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedModel === 'gemini-3.6-flash'
                    ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold border border-[#3ecf8e]/40'
                    : 'text-[#999] hover:text-white hover:bg-[#282828]'
                }`}
                title="Gemini 3.6 Flash"
              >
                Flash 3.6
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.5-flash')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedModel === 'gemini-3.5-flash'
                    ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold border border-[#3ecf8e]/40'
                    : 'text-[#999] hover:text-white hover:bg-[#282828]'
                }`}
                title="Gemini 3.5 Flash"
              >
                Flash 3.5
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold border border-[#3ecf8e]/40'
                    : 'text-[#999] hover:text-white hover:bg-[#282828]'
                }`}
                title="Gemini 3.1 Flash Lite"
              >
                Flash Lite 3.5
              </button>
            </div>
            <span className="hidden md:inline">Rev {currentState.currentRevision}</span>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-hidden relative min-h-0 bg-[#141414]">
          
          {/* TAB 1: AI Agent Simulator */}
          {activeTab === 'simulator' && (
            <div className="h-full flex flex-col p-3 sm:p-4 gap-3 overflow-hidden">
              
              {/* Presets Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#222] pb-2 shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-medium text-[#737373] shrink-0">
                    Quick Prompts:
                  </span>
                  <button
                    onClick={() => handleRunPresetPrompt('Inspect dataset fields and summarize available quantitative vs categorical columns.')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] hover:border-[#383838] text-[#EDEDED] shrink-0 min-h-[34px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Inspect Fields
                  </button>

                  <button
                    onClick={() => handleRunPresetPrompt('Propose a scatter plot relationship figure for bill_length_mm vs bill_depth_mm colored by species.')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] hover:border-[#383838] text-[#3ecf8e] shrink-0 min-h-[34px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Propose Revision
                  </button>

                  <button
                    onClick={() => handleRunPresetPrompt('Run a Welch two-sample t-test comparing bill_length_mm across male vs female groups.')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] hover:border-[#383838] text-amber-300 shrink-0 min-h-[34px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Run Statistical Test
                  </button>

                  <button
                    onClick={() => handleRunPresetPrompt('Apply the Nature journal publication theme style with custom title.')}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md text-xs bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] hover:border-[#383838] text-sky-300 shrink-0 min-h-[34px] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Set Nature Style
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] self-start sm:self-auto shrink-0 select-none">
                  <input
                    type="checkbox"
                    id="auto-execute-toggle"
                    checked={autoExecute}
                    onChange={e => setAutoExecute(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#3ecf8e] rounded border-[#383838] bg-black text-[#3ecf8e] cursor-pointer"
                  />
                  <label htmlFor="auto-execute-toggle" className="text-[11px] text-[#A1A1A1] font-semibold cursor-pointer">
                    Auto-Chain Turns
                  </label>
                </div>
              </div>

              {/* Timeline Output Feed */}
              <div className="flex-1 overflow-y-auto bg-[#171717] border border-[#262626] rounded-lg p-3 sm:p-4 space-y-3 min-h-0 font-sans text-xs">
                {timeline.map(entry => {
                  if (entry.type === 'system') {
                    return (
                      <div key={entry.id} className="p-2.5 rounded-md bg-[#1f1f1f] border border-[#2e2e2e] text-[#8C8C8C] flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#3ecf8e] shrink-0" />
                        <span>{entry.content}</span>
                      </div>
                    );
                  }

                  if (entry.type === 'user') {
                    return (
                      <div key={entry.id} className="flex flex-col gap-1 items-end">
                        <div className="bg-[#1f1f1f] border border-[#2e2e2e] text-white px-3.5 py-2.5 rounded-lg max-w-[85%] font-medium">
                          {entry.content}
                        </div>
                        <span className="text-[10px] text-[#737373]">Human User</span>
                      </div>
                    );
                  }

                  if (entry.type === 'agent_thought') {
                    return (
                      <div key={entry.id} className="flex flex-col gap-1 items-start">
                        <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#EDEDED] px-3.5 py-2.5 rounded-lg max-w-[88%] leading-relaxed">
                          <div className="flex items-center gap-1.5 font-semibold text-[#3ecf8e] mb-1">
                            <Bot className="w-4 h-4 shrink-0" />
                            <span>WebMCP Agent Reasoning</span>
                          </div>
                          <p className="whitespace-pre-wrap font-sans text-xs text-[#EDEDED]">{entry.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (entry.type === 'tool_call') {
                    return (
                      <div key={entry.id} className="flex flex-col gap-1 items-start w-full">
                        <div className="bg-[#121212] border border-[#383838] rounded-lg p-3 w-full font-mono text-xs">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626]">
                            <div className="flex items-center gap-2 text-[#3ecf8e] font-semibold">
                              <Play className="w-3.5 h-3.5 text-[#3ecf8e]" />
                              <span>Executing Tool Call: <span className="text-white">{entry.toolName}</span></span>
                            </div>
                            <span className="text-[10px] text-[#737373]">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-[#171717] p-2 rounded border border-[#262626] text-[#A1A1A1] overflow-x-auto max-h-36">
                            <pre>{JSON.stringify(entry.args, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (entry.type === 'tool_result') {
                    const isSuccess = entry.status === 'success';
                    return (
                      <div key={entry.id} className="flex flex-col gap-1 items-start w-full pl-3 border-l-2 border-[#3ecf8e]/40">
                        <div className="bg-[#181818] border border-[#2a2a2a] rounded-lg p-3 w-full font-mono text-xs">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#262626]">
                            <div className="flex items-center gap-2">
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-[#3ecf8e]" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                              )}
                              <span className="font-semibold text-white">
                                Tool Result: <span className="text-[#3ecf8e]">{entry.toolName}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#737373]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {entry.durationMs}ms
                              </span>
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${isSuccess ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]' : 'bg-rose-500/10 text-rose-300'}`}>
                                {entry.status?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="bg-[#121212] p-2 rounded border border-[#222] text-[#EDEDED] overflow-x-auto max-h-48">
                            <pre>{JSON.stringify(entry.result, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

                {isAgentRunning && (
                  <div className="p-3 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center gap-3 text-[#3ecf8e] animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Gemini Agent is evaluating WebMCP tool declarations and generating content...</span>
                  </div>
                )}
              </div>

              {activeSession && activeSession.pendingCalls && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3 text-amber-300 animate-fadeIn shrink-0">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white tracking-tight">
                        Agent is Requesting Permission to Run Tool{activeSession.pendingCalls.length > 1 ? 's' : ''}
                      </h4>
                      <p className="text-xs text-amber-400/90 mt-0.5">
                        Every agent tool execution requires researcher authorization. Please review the proposed actions below:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {activeSession.pendingCalls.map((fc: any, idx: number) => (
                      <div key={idx} className="bg-black/45 border border-amber-500/20 rounded-lg p-2.5 font-mono text-xs text-[#EDEDED]">
                        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold font-sans">PROPOSED</span>
                          <span>{fc.name}</span>
                        </div>
                        <pre className="text-[11px] text-[#A1A1A1] mt-1.5 bg-[#121212]/50 p-1.5 rounded overflow-x-auto max-h-24">
                          {JSON.stringify(fc.args, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleApprovePendingCalls}
                      className="flex-1 min-h-[38px] px-4 py-2 rounded-lg bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#34b27b] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>Approve & Execute</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclinePendingCalls}
                      className="min-h-[38px] px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#383838] border border-[#3e3e3e] text-white font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4 text-[#888]" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Prompt Input Form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  runAgentSimulation();
                }}
                className="flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={e => setAgentPrompt(e.target.value)}
                  placeholder="Ask the WebMCP Agent to inspect, propose, validate, or export figures..."
                  disabled={isAgentRunning}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-[#525252] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] min-h-[44px] transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAgentRunning || !agentPrompt.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[#3ecf8e] hover:bg-[#34b27b] text-black font-semibold text-xs sm:text-sm flex items-center gap-2 shrink-0 min-h-[44px] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span className="hidden sm:inline">Simulate Agent</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Live Tool Schemas */}
          {activeTab === 'schemas' && (
            <div className="h-full flex flex-col md:flex-row p-3 sm:p-4 gap-3 overflow-hidden">
              
              {/* Tool List Column */}
              <div className="w-full md:w-1/3 flex flex-col gap-2 shrink-0 overflow-hidden">
                <input
                  type="text"
                  value={schemaSearch}
                  onChange={e => setSchemaSearch(e.target.value)}
                  placeholder="Filter WebMCP tools..."
                  className="bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#525252] focus:outline-none min-h-[40px]"
                />

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                  {filteredTools.map(tool => {
                    const isSelected = selectedToolSchema?.name === tool.name;
                    return (
                      <button
                        key={tool.name}
                        onClick={() => setSelectedToolSchema(tool)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]/40 text-white font-medium'
                            : 'bg-[#171717] hover:bg-[#1f1f1f] border-[#262626] text-[#A1A1A1]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono font-semibold text-xs text-white mb-1">
                          <span className={isSelected ? 'text-[#3ecf8e]' : ''}>{tool.name}</span>
                          {tool.annotations?.requiresHumanApproval && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Approval
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-[11px] text-[#737373]">{tool.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tool Details & Schema View Column */}
              <div className="flex-1 bg-[#171717] border border-[#262626] rounded-lg p-3 sm:p-4 overflow-y-auto flex flex-col gap-3 min-h-0 font-sans">
                {selectedToolSchema ? (
                  <>
                    <div className="flex items-start justify-between border-b border-[#262626] pb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white font-mono">{selectedToolSchema.name}</h3>
                          {selectedToolSchema.annotations?.readOnlyHint && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#1f1f1f] text-[#8C8C8C] border border-[#2e2e2e]">
                              Read-Only
                            </span>
                          )}
                          {selectedToolSchema.annotations?.requiresHumanApproval && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/25">
                              Human Authorization Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8C8C8C] mt-1">{selectedToolSchema.description}</p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedToolSchema, null, 2))}
                        className="px-3 py-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] text-xs font-medium text-[#EDEDED] flex items-center gap-1.5 shrink-0 min-h-[36px] transition-colors cursor-pointer"
                      >
                        {copiedSchema ? <Check className="w-3.5 h-3.5 text-[#3ecf8e]" /> : <Copy className="w-3.5 h-3.5 text-[#8C8C8C]" />}
                        <span>{copiedSchema ? 'Copied' : 'Copy Schema'}</span>
                      </button>
                    </div>

                    {/* Input Schema Display */}
                    <div>
                      <h4 className="text-xs font-semibold text-[#3ecf8e] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <FileCode2 className="w-4 h-4" /> Input Schema (Parameters provided to LLM)
                      </h4>
                      <div className="bg-[#121212] p-3 rounded-lg border border-[#262626] font-mono text-xs overflow-x-auto text-[#EDEDED]">
                        <pre>{JSON.stringify(selectedToolSchema.inputSchema, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Output Schema Display */}
                    {selectedToolSchema.outputSchema && (
                      <div>
                        <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                          <FileCode2 className="w-4 h-4" /> Output Schema (Response Structure)
                        </h4>
                        <div className="bg-[#121212] p-3 rounded-lg border border-[#262626] font-mono text-xs overflow-x-auto text-[#EDEDED]">
                          <pre>{JSON.stringify(selectedToolSchema.outputSchema, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#737373] gap-2">
                    <Code2 className="w-8 h-8 text-[#3e3e3e]" />
                    <p className="text-xs">Select a WebMCP tool on the left to inspect its dynamic schema and LLM declarations.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Manual Execution & Call Logs */}
          {activeTab === 'executor' && (
            <div className="h-full flex flex-col md:flex-row p-3 sm:p-4 gap-3 overflow-hidden">
              
              {/* Left Column: Manual Execution Form */}
              <div className="w-full md:w-1/2 flex flex-col gap-3 shrink-0 overflow-y-auto pr-1">
                <div className="bg-[#171717] border border-[#262626] rounded-lg p-3 sm:p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-[#3ecf8e]" /> Manual WebMCP Tool Execution
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-[#8C8C8C] mb-1">Select Tool</label>
                    <select
                      value={selectedExecToolName}
                      onChange={e => handleFillSampleParams(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#3ecf8e] min-h-[40px] cursor-pointer"
                    >
                      {registeredTools.map(t => (
                        <option key={t.name} value={t.name}>
                          {t.name} — {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#8C8C8C]">Actor Context</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExecActor('agent')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          execActor === 'agent'
                            ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30'
                            : 'bg-[#1f1f1f] text-[#8C8C8C]'
                        }`}
                      >
                        agent
                      </button>
                      <button
                        type="button"
                        onClick={() => setExecActor('human')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          execActor === 'human'
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                            : 'bg-[#1f1f1f] text-[#8C8C8C]'
                        }`}
                      >
                        human
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[#8C8C8C]">JSON Arguments</label>
                      <button
                        type="button"
                        onClick={() => handleFillSampleParams(selectedExecToolName)}
                        className="text-[11px] text-[#3ecf8e] hover:underline font-mono cursor-pointer"
                      >
                        Reset Sample JSON
                      </button>
                    </div>
                    <textarea
                      value={execArgsJson}
                      onChange={e => setExecArgsJson(e.target.value)}
                      rows={8}
                      className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
                    />
                  </div>

                  <button
                    onClick={handleExecuteManual}
                    className="w-full py-2.5 rounded-lg bg-[#3ecf8e] hover:bg-[#34b27b] text-black font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[44px] transition-all cursor-pointer shadow-xs"
                  >
                    <Play className="w-4 h-4 text-black fill-black" />
                    <span>Execute Tool ({selectedExecToolName})</span>
                  </button>

                  {execError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {execError}
                    </div>
                  )}
                </div>

                {execResult && (
                  <div className="bg-[#171717] border border-[#262626] rounded-lg p-3 sm:p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-[#3ecf8e] font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Execution Return Result
                    </h4>
                    <div className="bg-[#121212] p-3 rounded-lg border border-[#222] font-mono text-xs overflow-x-auto text-[#EDEDED] max-h-60">
                      <pre>{JSON.stringify(execResult, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Execution Telemetry Logs */}
              <div className="flex-1 bg-[#171717] border border-[#262626] rounded-lg p-3 sm:p-4 overflow-hidden flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2 shrink-0">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#8C8C8C]" /> WebMCP Protocol Audit Logs ({callLogs.length})
                  </h3>
                  <button
                    onClick={clearLogs}
                    className="px-2.5 py-1 rounded-md bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] text-xs text-[#8C8C8C] hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer min-h-[32px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {callLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#737373] gap-2">
                      <HardDrive className="w-8 h-8 text-[#3e3e3e]" />
                      <p className="text-xs">No WebMCP tool calls recorded in this session yet.</p>
                    </div>
                  ) : (
                    callLogs.map(log => {
                      const isSuccess = log.status === 'success';
                      return (
                        <div key={log.id} className="bg-[#121212] border border-[#262626] rounded-lg p-3 text-xs font-mono">
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#222]">
                            <span className="font-semibold text-[#3ecf8e]">{log.toolName}</span>
                            <div className="flex items-center gap-2 text-[10px] text-[#737373]">
                              <span>{log.durationMs}ms</span>
                              <span>•</span>
                              <span>{log.payloadBytes} B</span>
                              <span className={`px-1.5 py-0.2 rounded font-semibold ${isSuccess ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]' : 'bg-rose-500/10 text-rose-300'}`}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-[#8C8C8C] truncate mb-1">
                            Args: {JSON.stringify(log.inputArgs)}
                          </div>
                          <div className="bg-[#171717] p-2 rounded text-[#A1A1A1] overflow-x-auto max-h-24">
                            <pre>{JSON.stringify(log.result, null, 2)}</pre>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
