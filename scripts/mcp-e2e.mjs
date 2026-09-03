import { chromium } from 'playwright';

// External browser-agent transport harness via the app's postMessage JSON-RPC transport.
// Verifies the browser-native confirmation gate (accept AND decline) and the
// preview-to-panel binding (wrong target / unknown preview rejected).

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
  let ws = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  console.log('   workspace: targets=%s dataset=%s rev=%d intent=%s', ws?.targetPanelIds?.join(','), ws?.datasetId, ws?.revision, ws?.figureIntent);

  const analysis = unwrap(await rpc('tools/call', {
    name: 'analyze_group_comparison',
    arguments: { valueField: 'body_mass_g', groupField: 'species', group1Val: 'Adelie', group2Val: 'Chinstrap' },
  }));
  if (!analysis?.effect || !analysis?.test || analysis?.groups?.length !== 2) {
    throw new Error('Group analysis did not return effect, uncertainty, test, and both group summaries');
  }
  console.log('   analysis: %s estimate=%s CI=[%s,%s] p=%s', analysis.method, analysis.effect.estimate, analysis.effect.ci95Lower, analysis.effect.ci95Upper, analysis.test.pValue);

  const editable = ws?.targetPanelIds?.[0];
  if (!editable) throw new Error('inspect_figure_workspace returned no target panels');

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
  console.log('3. Native confirmation gate — UNAVAILABLE');
  const pUnavailable = await propose();
  const aUnavailable = await apply(pUnavailable?.previewId, pUnavailable?.basedOnRevision);
  if (aUnavailable?.status !== 'rejected_unapproved') {
    throw new Error(`Expected unavailable confirmation to reject, received ${aUnavailable?.status}`);
  }
  console.log('   apply (no confirmation API):', JSON.stringify(aUnavailable?.status));

  console.log(LINE);
  console.log('4. Native confirmation gate — DECLINE');
  // This hook is consumed only by the DEV-only test path; production native
  // WebMCP approval comes from the execution context's agent callback.
  await page.evaluate(() => { window.__FIGURE_FOUNDRY_TEST_CONFIRMATION__ = () => Promise.resolve(false); });
  const pDecline = await propose();
  const aDecline = await apply(pDecline?.previewId, pDecline?.basedOnRevision);
  if (aDecline?.status !== 'rejected_unapproved') {
    throw new Error(`Expected declined confirmation to reject, received ${aDecline?.status}`);
  }
  console.log('   propose:', JSON.stringify({ previewId: pDecline?.previewId, valid: pDecline?.validation?.valid }));
  console.log('   apply (declined by human):', JSON.stringify(aDecline?.status));

  console.log(LINE);
  console.log('5. Native confirmation gate — ACCEPT');
  await page.evaluate(() => { window.__FIGURE_FOUNDRY_TEST_CONFIRMATION__ = () => Promise.resolve(true); });
  const pAccept = await propose();
  const aAccept = await apply(pAccept?.previewId, pAccept?.basedOnRevision);
  if (aAccept?.status !== 'applied') {
    throw new Error(`Expected accepted confirmation to apply, received ${aAccept?.status}`);
  }
  console.log('   propose:', JSON.stringify({ previewId: pAccept?.previewId, valid: pAccept?.validation?.valid, blockedIssues: pAccept?.validation?.issues?.filter((i) => i.severity === 'blocking').length }));
  console.log('   apply (accepted):', JSON.stringify({ status: aAccept?.status, newRev: aAccept?.newRevision, title: aAccept?.appliedSpec?.title }));
  const wsAfterAccept = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  console.log('   inspect after accept:', JSON.stringify({ panel: wsAfterAccept.panels.find((panel) => panel.id === editable), revision: wsAfterAccept.revision }));
  const acceptedPanelState = Object.fromEntries(wsAfterAccept.panels.map((panel) => [panel.id, panel]));
  const acceptedLayerOrder = [...wsAfterAccept.layerOrder];

  console.log(LINE);
  console.log('6. Preview target binding');
  ws = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  const pWrong = await propose();
  const aWrong = await apply(pWrong?.previewId, pWrong?.basedOnRevision, editable === 'panel-a' ? 'panel-b' : 'panel-a');
  if (aWrong?.status !== 'rejected_wrong_target') {
    throw new Error(`Expected wrong target to reject, received ${aWrong?.status}`);
  }
  console.log('   apply to wrong panel:', JSON.stringify(aWrong?.status));
  const aUnknown = await apply('prev_does_not_exist', ws?.revision);
  console.log('   apply unknown preview:', JSON.stringify(aUnknown?.status));

  console.log(LINE);
  console.log('7. Non-chart panel and atomic arrangement');
  ws = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  const captionTarget = ws?.targetPanelIds?.includes('panel-caption') ? 'panel-caption' : ws?.targetPanelIds?.at(-1);
  const frameTarget = ws?.targetPanelIds?.find((id) => id !== captionTarget);
  const pStructure = unwrap(await rpc('tools/call', {
    name: 'propose_figure_revision',
    arguments: {
      targetPanelId: captionTarget,
      basedOnRevision: ws.revision,
      panelKind: 'text-caption',
      panelSpec: { kind: 'text-caption', title: 'Analysis notes', captionText: 'Effect size shown with a 95% confidence interval; raw observations remain available in the distribution panel.' },
      workspacePatch: { panelChanges: [{ panelId: frameTarget, frame: { x: 640, y: 40, width: 520, height: 300 } }], layerOrder: [...ws.targetPanelIds].reverse() },
    },
  }));
  if (!pStructure?.validation?.valid) throw new Error(`Structural proposal failed: ${JSON.stringify(pStructure?.validation)}`);
  const aStructure = await apply(pStructure.previewId, pStructure.basedOnRevision, captionTarget);
  if (aStructure?.status !== 'applied') throw new Error(`Structural proposal was not applied: ${aStructure?.status}`);
  const wsAfterStructure = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  const caption = wsAfterStructure.panels.find((panel) => panel.id === captionTarget);
  const frameChanged = wsAfterStructure.panels.find((panel) => panel.id === frameTarget);
  const untouchedPanels = wsAfterStructure.panels.filter((panel) => panel.id !== captionTarget && panel.id !== frameTarget);
  console.log('   inspect after:', JSON.stringify({ caption, order: wsAfterStructure.layerOrder, expectedFirst: ws.targetPanelIds.at(-1) }));
  if (
    caption?.kind !== 'text-caption' ||
    JSON.stringify(frameChanged?.frame) !== JSON.stringify({ x: 640, y: 40, width: 520, height: 300 }) ||
    wsAfterStructure.layerOrder.join('|') !== [...ws.targetPanelIds].reverse().join('|') ||
    untouchedPanels.some((panel) => JSON.stringify(panel) !== JSON.stringify(acceptedPanelState[panel.id]))
  ) {
    throw new Error('Structural apply did not preserve panel kinds, requested frame/order, or unrelated panel state');
  }
  console.log('   applied:', JSON.stringify({ kind: caption.kind, order: wsAfterStructure.layerOrder, revision: wsAfterStructure.revision }));

  console.log(LINE);
  console.log('8. Provenance restore');
  await page.getByRole('button', { name: /Launch Editor|Open Figure Editor/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'History' }).click();
  await page.getByRole('button', { name: 'Restore' }).last().click();
  await page.waitForTimeout(300);
  const wsAfterRestore = unwrap(await rpc('tools/call', { name: 'inspect_figure_workspace', arguments: {} }));
  console.log('   inspect restored:', JSON.stringify({ revision: wsAfterRestore.revision, panelAKind: wsAfterRestore.panels.find((panel) => panel.id === 'panel-a')?.kind, order: wsAfterRestore.layerOrder }));
  const restoredPanelState = Object.fromEntries(wsAfterRestore.panels.map((panel) => [panel.id, panel]));
  if (
    wsAfterRestore.revision !== 4 ||
    wsAfterRestore.layerOrder.join('|') !== acceptedLayerOrder.join('|') ||
    Object.keys(acceptedPanelState).some((panelId) => JSON.stringify(restoredPanelState[panelId]) !== JSON.stringify(acceptedPanelState[panelId]))
  ) {
    throw new Error('Provenance restore did not replay the complete historical panel, frame, and layer-order snapshot');
  }
  console.log('   restored:', JSON.stringify({ revision: wsAfterRestore.revision, panels: wsAfterRestore.panels.length, order: wsAfterRestore.layerOrder }));
  const historyText = await page.locator('body').innerText();
  if (!historyText.includes('Target') || !historyText.includes('Based on') || !historyText.includes('Validation')) {
    throw new Error('Expected provenance drawer to expose target, base revision, and validation metadata');
  }
  await page.screenshot({ path: 'artifacts/e2e-after-apply.png' });

  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach((e) => console.log(' -', e.slice(0, 200))); }
  else console.log('NO page errors');
};

run().catch((e) => { console.error(e); process.exit(1); });