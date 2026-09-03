# FigureFoundry recording script

Record the live managed Preview with the harness browser. This runbook deliberately does not use Playwright.

## Dashboard to configured figure

1. Start the managed Preview with `preview_start` and open the returned preview reference in the harness browser.
2. Wait for the dashboard to show the workspace header and project figure thumbnails.
3. Start a browser recording at `clips/figurefoundry-dashboard-to-editor.webm`.
4. Open the configured example figure by clicking its thumbnail or **Open canvas**.
5. Pause briefly on the canvas so the forest, funnel, grouped-bar, subgroup, and single-chart panels are visible with their compatible data.
6. Select a panel, open **Data**, and switch its panel-local dataset. Pause on the updated preview.
7. Open **Design** and change a field mapping. Pause on the rematerialized panel.
8. Stop the recording and inspect representative frames before sharing it.

## Review points

- The dashboard presents projects and figure thumbnails as workspace files, without repeated launch buttons.
- The example figure opens with data-rendered panels rather than empty connection cards.
- Dataset selection is in **Data**; field mapping is in **Design**.
- Invalid or unavailable values show concise slot-specific messages and do not produce stale marks or exports.
- The analysis destination is an analysis workflow; a forest plot is only one possible output view.

Keep clips short and focused. Never share a recording containing account, tenant, credential, or other private data.
