import { chromium } from 'playwright';

// End-to-end WebMCP agent simulation via the app's postMessage JSON-RPC transport.
// Walks the full agent lifecycle: inspect -> propose -> apply (with native confirm gate).

const BASE = process.env.BASE_URL || 'http://localhost:3100';
let rpcId = 1;

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  // Prepare a promise-based rpc client inside the page
  await page.evaluate(() => {
    window.__rpcWaiters = new Map();
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (d && typeof d === 'object' && d.jsonrpc === '2.0' && d.id && !d.method && window.__rpcWaiters.has(d.id)) {
        window.__rpcWaiters.get(d.id)(d);
        window.__rpcWaiters.delete(d.id);
      }
    });
    window.__rpc = (method, params) =>
      new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1e9);
        window.__rpcWaiters.set(id, resolve);
        window.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      });
  });

  const rpc = (method, params) =>
    page.evaluate(([m, p]) => window.__rpc(m, p), [method, params]);

  // Simulate the browser-native confirmation gate (what the host browser shows the human)
  await page.evaluate(() => {
    // requestUserInteraction polyfill: auto-accept after a tick, as the host would
    window.requestUserInteraction = (details) =>
      new Promise((resolve) =>
        setTimeout(() => resolve({ action: 'accepted', interactionId: 'sim-' + Date.now() }), 200)
      );
  });

  // 1. ping
  const ping = await rpc('ping');
  console.log('PING:', JSON.stringify(ping.result ?? ping.error));

  // 2. tools/list
  const tools = await rpc('tools/list');
  const names = tools.result?.tools?.map((t) => t.name) ?? [];
  console.log('TOOLS:', JSON.stringify(names));

  // tools/call responses wrap the tool output in { content, raw }
  const unwrap = (r) => (r.result?.raw?.result ?? r.result?.raw ?? r.result) ?? r.error;

  // 3. inspect_dataset_fields
  const fields = unwrap(await rpc('tools/call', { name: 'inspect_dataset_fields', arguments: {} }));
  console.log('FIELDS rowCount:', fields?.rowCount, '| fields:', fields?.fields?.map((f) => f.name).join(', '));

  // 4. inspect_figure_workspace
  const ws = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  console.log('WORKSPACE:', JSON.stringify({ editable: ws?.agentEditablePanelId, dataset: ws?.datasetId, rev: ws?.revision, intent: ws?.figureIntent }));

  // 5. propose_figure_revision (target the agent-editable panel)
  const proposal = unwrap(await rpc('tools/call', {
    name: 'propose_figure_revision',
    arguments: {
      targetPanelId: ws?.agentEditablePanelId,
      basedOnRevision: ws?.revision,
      spec: {
        title: 'Species flipper length comparison',
        figureIntent: 'comparison',
        mark: 'bar',
        encoding: {
          x: { field: 'species', type: 'categorical', axisTitle: 'Species' },
          y: { field: 'flipper_length_mm', type: 'quantitative', aggregate: 'mean', axisTitle: 'Mean Flipper Length (mm)' },
          color: { field: 'species', type: 'categorical', legendTitle: 'Species' },
        },
      },
    },
  }));
  console.log('PROPOSAL:', JSON.stringify({ previewId: proposal?.previewId, valid: proposal?.validation?.valid, issues: proposal?.validation?.issues?.map((i) => i.severity + ':' + i.message) }));

  // 6. apply_figure_revision
  const applied = unwrap(await rpc('tools/call', {
    name: 'apply_figure_revision',
    arguments: {
      targetPanelId: ws?.agentEditablePanelId,
      previewId: proposal?.previewId,
      basedOnRevision: ws?.revision,
    },
  }));
  console.log('APPLY:', JSON.stringify({ status: applied?.status, newRev: applied?.newRevision, msg: applied?.message?.slice(0, 120) }));

  await page.waitForTimeout(1500);
  await page.evaluate(() => window.dispatchEvent(new Event('noop')));
  // screenshot the editor to see the applied panel
  await page.getByRole('button', { name: /Launch Editor|Open Figure Editor/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/shots/08-after-apply.png' });

  // 7. wrong-target rejection check
  const bad = await rpc('tools/call', {
    name: 'apply_figure_revision',
    arguments: { targetPanelId: 'panel-a', previewId: 'x', basedOnRevision: 0 },
  });
  console.log('WRONG-TARGET:', JSON.stringify(bad.result?.status ?? bad.error));

  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' -', e.slice(0, 200))); }
  else console.log('NO page errors');
};

run().catch((e) => { console.error(e); process.exit(1); });
