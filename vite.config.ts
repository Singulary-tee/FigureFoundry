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
                  if (Array.isArray(schema)) {
                    return schema.map(item => sanitizeSchema(item));
                  }

                  const cleaned: any = {};

                  if (schema.type) {
                    if (Array.isArray(schema.type)) {
                      const valid = schema.type.find((t: any) => t !== 'null') || 'string';
                      cleaned.type = String(valid).toUpperCase();
                      cleaned.nullable = true;
                    } else if (typeof schema.type === 'string') {
                      cleaned.type = schema.type.toUpperCase();
                    } else {
                      cleaned.type = 'STRING';
                    }
                  }

                  if (schema.nullable === true) {
                    cleaned.nullable = true;
                  }

                  if (typeof schema.description === 'string') {
                    cleaned.description = schema.description;
                  }

                  if (typeof schema.title === 'string') {
                    cleaned.title = schema.title;
                  }

                  if (typeof schema.format === 'string') {
                    cleaned.format = schema.format;
                  }

                  if (Array.isArray(schema.enum)) {
                    cleaned.enum = schema.enum.map((v: any) => String(v));
                  }

                  if (schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)) {
                    const props: Record<string, any> = {};
                    for (const [pName, pSchema] of Object.entries(schema.properties)) {
                      props[pName] = sanitizeSchema(pSchema);
                    }
                    cleaned.properties = props;
                  }

                  if (Array.isArray(schema.required)) {
                    cleaned.required = schema.required.filter((r: any) => typeof r === 'string');
                  }

                  if (schema.items && typeof schema.items === 'object') {
                    cleaned.items = sanitizeSchema(schema.items);
                  }

                  if (typeof schema.minimum === 'number') {
                    cleaned.minimum = schema.minimum;
                  } else if (typeof schema.exclusiveMinimum === 'number') {
                    cleaned.minimum = schema.exclusiveMinimum;
                  }

                  if (typeof schema.maximum === 'number') {
                    cleaned.maximum = schema.maximum;
                  } else if (typeof schema.exclusiveMaximum === 'number') {
                    cleaned.maximum = schema.exclusiveMaximum;
                  }

                  if (typeof schema.minItems === 'number' || typeof schema.minItems === 'string') {
                    cleaned.minItems = String(schema.minItems);
                  }
                  if (typeof schema.maxItems === 'number' || typeof schema.maxItems === 'string') {
                    cleaned.maxItems = String(schema.maxItems);
                  }

                  if (typeof schema.minLength === 'number' || typeof schema.minLength === 'string') {
                    cleaned.minLength = String(schema.minLength);
                  }
                  if (typeof schema.maxLength === 'number' || typeof schema.maxLength === 'string') {
                    cleaned.maxLength = String(schema.maxLength);
                  }

                  if (typeof schema.pattern === 'string') {
                    cleaned.pattern = schema.pattern;
                  }

                  if (Array.isArray(schema.anyOf)) {
                    cleaned.anyOf = schema.anyOf.map((sub: any) => sanitizeSchema(sub));
                  }

                  if (schema.default !== undefined) {
                    cleaned.default = schema.default;
                  }
                  if (schema.example !== undefined) {
                    cleaned.example = schema.example;
                  }

                  if (!cleaned.type) {
                    if (cleaned.properties) {
                      cleaned.type = 'OBJECT';
                    } else if (cleaned.items) {
                      cleaned.type = 'ARRAY';
                    } else {
                      cleaned.type = 'STRING';
                    }
                  }

                  return cleaned;
                }

                const functionDeclarations = (tools || []).map((t: any) => {
                  const parameters = sanitizeSchema(t.inputSchema || { type: 'OBJECT', properties: {} });
                  if (!parameters.type) {
                    parameters.type = 'OBJECT';
                  }
                  return {
                    name: t.name,
                    description: t.description,
                    parameters
                  };
                });

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
