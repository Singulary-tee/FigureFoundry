import { chromium } from 'playwright';

// End-to-end WebMCP agent simulation via the app's postMessage JSON-RPC transport.
// Verifies all four tools + the browser-native confirmation gate (accept AND decline)
// + the single-target security invariant (wrong target / unknown preview rejected).

const BASE = process.env.BASE_URL || 'http://localhost:3100';

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  await page.evaluate(() => {
    window.__w = new Map();
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (d && typeof d === 'object' && d.jsonrpc === '2.0' && d.id && !d.method && window.__w.has(d.id)) {
        window.__w.get(d.id)(d);
        window.__w.delete(d.id);
      }
    });
    window.__r = (m, pa) =>
      new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1e9);
        window.__w.set(id, resolve);
        window.postMessage({ jsonrpc: '2.0', id, method: m, params: pa }, '*');
      });
  });
  const rpc = (method, params) => page.evaluate(([m, p]) => window.__r(m, p), [method, params]);
  const unwrap = (r) => (r.result?.raw?.result ?? r.result?.raw ?? r.result) ?? r.error;

  const LINE = '----------------------------------------';

  console.log(LINE);
  console.log('1. Server handshake');
  const ping = await rpc('ping');
  console.log('   ping:', JSON.stringify(ping.result ?? ping.error));
  const tools = await rpc('tools/list');
  console.log('   tools:', JSON.stringify(tools.result?.tools?.map((t) => t.name)));

  console.log(LINE);
  console.log('2. Read-only inspection');
  const fields = unwrap(await rpc('tools/call', { name: 'inspect_dataset_fields', arguments: {} }));
  console.log('   fields:', fields?.rowCount, 'rows |', fields?.fields?.map((f) => f.name).join(', '));
  const ws = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  console.log('   workspace: editable=%s dataset=%s rev=%d intent=%s', ws?.agentEditablePanelId, ws?.datasetId, ws?.revision, ws?.figureIntent);

  const editable = ws?.agentEditablePanelId;

  const propose = async (overrides = {}) =>
    unwrap(await rpc('tools/call', {
      name: 'propose_figure_revision',
      arguments: {
        targetPanelId: editable,
        basedOnRevision: ws?.revision,
        title: 'Species flipper length comparison',
        figureIntent: 'comparison',
        mark: 'bar',
        encoding: {
          x: { field: 'species', type: 'categorical', axisTitle: 'Species' },
          y: { field: 'flipper_length_mm', type: 'quantitative', aggregate: 'mean', axisTitle: 'Mean Flipper Length (mm)' },
        },
        showsRawObservations: false,
        uncertaintyEncoding: 'none',
        ...overrides,
      },
    }));
  const apply = async (previewId, based, target = editable) =>
    unwrap(await rpc('tools/call', {
      name: 'apply_figure_revision',
      arguments: { targetPanelId: target, previewId, basedOnRevision: based },
    }));

  console.log(LINE);
  console.log('3. Native confirmation gate — DECLINE');
  await page.evaluate(() => { window.requestUserInteraction = () => Promise.resolve({ confirmed: false }); });
  const pDecline = await propose();
  const aDecline = await apply(pDecline?.previewId, pDecline?.basedOnRevision);
  console.log('   propose:', JSON.stringify({ previewId: pDecline?.previewId, valid: pDecline?.validation?.valid }));
  console.log('   apply (declined by human):', JSON.stringify(aDecline?.status));

  console.log(LINE);
  console.log('4. Native confirmation gate — ACCEPT');
  await page.evaluate(() => { window.requestUserInteraction = () => Promise.resolve({ confirmed: true }); });
  const pAccept = await propose();
  const aAccept = await apply(pAccept?.previewId, pAccept?.basedOnRevision);
  console.log('   propose:', JSON.stringify({ previewId: pAccept?.previewId, valid: pAccept?.validation?.valid, blockedIssues: pAccept?.validation?.issues?.filter((i) => i.severity === 'blocking').length }));
  console.log('   apply (accepted):', JSON.stringify({ status: aAccept?.status, newRev: aAccept?.newRevision, title: aAccept?.appliedSpec?.title }));

  console.log(LINE);
  console.log('5. Single-target invariant');
  const pWrong = await propose();
  const aWrong = await apply(pWrong?.previewId, pWrong?.basedOnRevision, 'panel-a');
  console.log('   apply to wrong panel:', JSON.stringify(aWrong?.status));
  const aUnknown = await apply('prev_does_not_exist', 1);
  console.log('   apply unknown preview:', JSON.stringify(aUnknown?.status));

  console.log(LINE);
  console.log('6. Editor screenshot after applied revision');
  await page.getByRole('button', { name: /Launch Editor|Open Figure Editor/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.screenshot({ path: '/tmp/shots/08-after-apply.png' });

  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' -', e.slice(0, 200))); }
  else console.log('NO page errors');
};

run().catch((e) => { console.error(e); process.exit(1); });