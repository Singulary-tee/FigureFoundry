import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';

let commitSha = process.env.VITE_COMMIT_SHA || process.env.COMMIT_SHA || '';
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    commitSha = '4e743f8';
  }
}

export default defineConfig(() => {
  return {
    define: {
      __BUILD_COMMIT__: JSON.stringify(commitSha || '4e743f8'),
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'webmcp-agent-middleware',
        configureServer(server) {
          server.middlewares.use('/api/webmcp/agent', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}');
                const { prompt, tools, context, history, model } = payload;
                const selectedModelName = model || 'gemini-3.6-flash';
                const apiKey = process.env.GEMINI_API_KEY;

                if (!apiKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      error: 'GEMINI_API_KEY environment variable is missing.'
                    })
                  );
                  return;
                }

                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: {
                    headers: {
                      'User-Agent': 'aistudio-build',
                    }
                  }
                });

                function sanitizeSchema(schema: any): any {
                  if (!schema || typeof schema !== 'object') return schema;
                  const cleaned: any = Array.isArray(schema) ? [] : {};
                  
                  for (const [key, val] of Object.entries(schema)) {
                    if (key === 'enum' && Array.isArray(val)) {
                      cleaned[key] = val.map(v => String(v));
                    } else if (key === 'type') {
                      if (Array.isArray(val)) {
                        const valid = val.find(t => t !== 'null') || 'string';
                        cleaned[key] = String(valid).toUpperCase();
                      } else if (typeof val === 'string') {
                        cleaned[key] = val.toUpperCase();
                      } else {
                        cleaned[key] = 'STRING';
                      }
                    } else if (key === 'properties' && val && typeof val === 'object') {
                      const props: any = {};
                      for (const [pName, pSchema] of Object.entries(val)) {
                        props[pName] = sanitizeSchema(pSchema);
                      }
                      cleaned[key] = props;
                    } else if (key === 'items' && val && typeof val === 'object') {
                      cleaned[key] = sanitizeSchema(val);
                    } else if (typeof val === 'object' && val !== null) {
                      cleaned[key] = sanitizeSchema(val);
                    } else {
                      cleaned[key] = val;
                    }
                  }

                  if (!cleaned.type && cleaned.properties) {
                    cleaned.type = 'OBJECT';
                  }

                  return cleaned;
                }

                const functionDeclarations = (tools || []).map((t: any) => ({
                  name: t.name,
                  description: t.description,
                  parameters: sanitizeSchema(t.inputSchema || { type: 'OBJECT', properties: {} })
                }));

                const systemInstruction = `You are an autonomous AI browser agent operating within a web browser environment (such as OpenAI Operator or Gemini in Chrome). Your purpose is to assist the user by autonomously interacting with web applications on their behalf.

Key Principles of Operation:
1. WebMCP & Tool Discovery: Web pages declare in-page capabilities as structured tools via WebMCP (Web Model Context Protocol). You discover and execute these tools based on their registered names, descriptions, and JSON schemas.
2. Neutral Site-Agnostic Perspective: You are a general browser agent visiting a web page, NOT a custom chatbot built specifically for this website. Do not claim to be a site-specific embedded assistant unless explicitly instructed by the user. Rely on the page-provided tool declarations to accomplish user goals.
3. Autonomous Action & Reasoning: Evaluate user requests, analyze available tool schemas on the active page, determine required parameter values, and invoke tools cleanly to perform page operations.
4. Transparent & Objective Communication: State your intentions, findings, and tool choices clearly and concisely without promotional embellishment.`;

                const contents: any[] = [];
                if (history && Array.isArray(history)) {
                  history.forEach((h: any) => {
                    contents.push(h);
                  });
                }
                if (prompt && typeof prompt === 'string' && prompt.trim()) {
                  contents.push({ role: 'user', parts: [{ text: prompt }] });
                }

                const response = await ai.models.generateContent({
                  model: selectedModelName,
                  contents,
                  config: {
                    systemInstruction,
                    tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
                  }
                });

                const text = response.text || '';
                const functionCalls = response.functionCalls || [];
                const candidateContent = response.candidates?.[0]?.content;

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    text,
                    functionCalls: functionCalls.map((fc: any) => ({
                      name: fc.name,
                      args: fc.args,
                      id: fc.id
                    })),
                    candidateContent
                  })
                );
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Gemini API execution error' }));
              }
            });
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
