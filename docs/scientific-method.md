# Scientific Method & Validation Rules

FigureFoundry implements guidelines from modern scientific data visualization literature (including the Midway Guidelines, Cleveland-McGill perceptual hierarchies, and Tufte's data-ink principles).

---

## 1. Core Scientific Rules

| Rule Code | Category | Condition | Severity | Rationale |
|---|---|---|---|---|
| **RULE-DIST-RAW** | Distribution | `figureIntent === 'distribution'` and `showsRawObservations === false` | **Blocking** | Hiding multi-modal distributions behind mean/bar summaries masks critical data features, bimodal splits, and outliers. |
| **RULE-LOG-NONPOS** | Scale Integrity | Log scale requested on axis with non-positive values ($\le 0$) | **Blocking** | Logarithms of zero or negative numbers are undefined and cause silent point drops or NaN rendering artifacts. |
| **RULE-COLOR-CARD** | Perception | Nominal categorical variable with cardinality $> 12$ mapped to `color` or `shape` | **Warning** | Human visual perception cannot reliably distinguish more than 10–12 discrete colors without constant legend cross-referencing. |
| **RULE-BAR-DYNAMITE** | Misleading Summary | Mark is `bar` representing uncertain continuous distributions | **Warning** | "Dynamite plots" (mean bar + error antenna) convey false baseline anchors and waste ink on arbitrary zero references. |
| **RULE-FIELD-EXIST** | Type Correctness | Encoded field does not exist in active dataset schema | **Blocking** | Prevents compilation errors in Vega-Lite. |
| **RULE-TYPE-MISMATCH**| Type Correctness | Discrete mark or scale mapped to quantitative field or vice-versa | **Warning** | Inappropriate scale types produce misaligned ticks and uninterpretable scales. |

---

## 2. Midway Guidelines in FigureFoundry

1. **Show the Data First**: When comparing group distributions, individual jittered data points or boxplot / violin geometry must always accompany statistical summaries.
2. **Preserve Uncertainty Bounds**: Explicitly communicate error bars, confidence intervals, or standard deviations alongside point estimates.
3. **Transparent Missingness**: Acknowledge missing observation rates rather than silently dropping rows.
