import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3100';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/shots/01-dashboard.png', fullPage: false });

  // Report WebMCP tool surface as the browser agent would see it
  const mcp = await page.evaluate(() => {
    const poly = window.__WEBMCP_POLYFILL_STATE__ ?? null;
    const ctx = (navigator).modelContext ?? (document).modelContext ?? null;
    return {
      nativeModelContext: !!ctx,
      polyfill: poly,
    };
  });
  console.log('MCP state:', JSON.stringify(mcp, null, 2));

  // navigate through views via left sidebar
  const navButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a')).map((b) => b.textContent?.trim()).filter(Boolean).slice(0, 60)
  );
  console.log('NAV:', JSON.stringify(navButtons));

  const go = async (label, shot) => {
    try {
      await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click({ timeout: 3000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `/tmp/shots/${shot}.png` });
      return true;
    } catch { console.log('MISS:', label); return false; }
  };
  await go('Open Figure Editor|Launch Editor', '02-editor');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/shots/02b-editor.png' });
  // editor sidebar icons: data, analyses, notes, settings, help
  await go('Data', '03-data');
  await go('Analyses', '04-analyses');
  await go('Notes', '05-notes');
  await go('Settings', '06-settings');
  await go('Help', '07-help');
  await browser.close();
  if (errors.length) {
    console.log('CONSOLE ERRORS:');
    errors.forEach((e) => console.log(' -', e.slice(0, 300)));
  } else {
    console.log('NO console errors');
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
