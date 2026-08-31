import { FigureSpec, DatasetProfile } from '../../types';

export function getJournalThemeConfig(preset?: string, theme: 'dark' | 'light' = 'light') {
  const isDark = theme === 'dark' || preset === 'dark';

  const basePadding = { top: 24, left: 24, right: 24, bottom: 20 };

  if (preset === 'nature') {
    return {
      background: '#ffffff',
      padding: basePadding,
      view: { stroke: 'transparent' },
      axis: {
        domainColor: '#1A1A1A',
        domainWidth: 1.2,
        gridColor: 'rgba(0, 0, 0, 0.05)',
        gridDash: [2, 2],
        labelColor: '#2B2B2B',
        titleColor: '#000000',
        labelFont: 'Arial, Helvetica, sans-serif',
        titleFont: 'Arial, Helvetica, sans-serif',
        titleFontSize: 11,
        titleFontWeight: 700,
        labelFontSize: 9.5,
        labelLimit: 200,
        labelPadding: 6,
        titlePadding: 10,
        tickColor: '#1A1A1A',
        tickSize: 4
      },
      legend: {
        labelColor: '#2B2B2B',
        titleColor: '#000000',
        labelFont: 'Arial, Helvetica, sans-serif',
        titleFont: 'Arial, Helvetica, sans-serif',
        titleFontSize: 11,
        titleFontWeight: 700,
        labelFontSize: 9.5,
        labelLimit: 200,
        orient: 'bottom',
        offset: 12
      },
      title: {
        color: '#000000',
        font: 'Arial, Helvetica, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        subtitleColor: '#555555',
        subtitleFontSize: 10,
        subtitlePadding: 6,
        anchor: 'start',
        offset: 14,
        limit: 1000
      },
      range: {
        category: ['#006837', '#1F78B4', '#E31A1C', '#FF7F00', '#6A3D9A', '#B15928', '#33A02C']
      }
    };
  }

  if (preset === 'science') {
    return {
      background: '#ffffff',
      padding: basePadding,
      view: { stroke: 'transparent' },
      axis: {
        domainColor: '#000000',
        domainWidth: 1.5,
        gridColor: 'rgba(0, 0, 0, 0.04)',
        labelColor: '#111111',
        titleColor: '#000000',
        labelFont: 'Georgia, Times New Roman, serif',
        titleFont: 'Georgia, Times New Roman, serif',
        titleFontSize: 11.5,
        titleFontWeight: 700,
        labelFontSize: 10,
        labelLimit: 200,
        labelPadding: 6,
        titlePadding: 10,
        tickColor: '#000000',
        tickWidth: 1.2
      },
      legend: {
        labelColor: '#111111',
        titleColor: '#000000',
        labelFont: 'Georgia, Times New Roman, serif',
        titleFont: 'Georgia, Times New Roman, serif',
        titleFontSize: 11,
        titleFontWeight: 700,
        labelFontSize: 10,
        labelLimit: 200,
        orient: 'bottom',
        offset: 12
      },
      title: {
        color: '#A6192E',
        font: 'Georgia, Times New Roman, serif',
        fontSize: 14,
        fontWeight: 700,
        subtitleColor: '#444444',
        subtitleFontSize: 10.5,
        subtitlePadding: 6,
        anchor: 'start',
        offset: 14,
        limit: 1000
      },
      range: {
        category: ['#A6192E', '#002D62', '#D99B00', '#53565A', '#008080', '#6F2C91']
      }
    };
  }

  if (preset === 'cell') {
    return {
      background: '#ffffff',
      padding: basePadding,
      view: { stroke: '#000000', strokeWidth: 1 },
      axis: {
        domainColor: '#000000',
        domainWidth: 1,
        grid: false,
        labelColor: '#000000',
        titleColor: '#000000',
        labelFont: 'Arial, sans-serif',
        titleFont: 'Arial, sans-serif',
        titleFontSize: 12,
        titleFontWeight: 700,
        labelFontSize: 10,
        labelLimit: 200,
        labelPadding: 6,
        titlePadding: 10,
        tickColor: '#000000'
      },
      legend: {
        labelColor: '#000000',
        titleColor: '#000000',
        labelFont: 'Arial, sans-serif',
        titleFont: 'Arial, sans-serif',
        titleFontSize: 11,
        titleFontWeight: 700,
        labelFontSize: 10,
        labelLimit: 200,
        orient: 'bottom',
        offset: 12
      },
      title: {
        color: '#000000',
        font: 'Arial, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        subtitleColor: '#444444',
        subtitleFontSize: 10.5,
        subtitlePadding: 6,
        anchor: 'start',
        offset: 14,
        limit: 1000
      },
      range: {
        category: ['#00A3E0', '#E4007C', '#FFC72C', '#4B0082', '#009639', '#FF6600']
      }
    };
  }

  if (preset === 'ieee') {
    return {
      background: '#ffffff',
      padding: basePadding,
      view: { stroke: 'transparent' },
      axis: {
        domainColor: '#222222',
        domainWidth: 1,
        gridColor: '#e0e0e0',
        gridDash: [1, 1],
        labelColor: '#222222',
        titleColor: '#000000',
        labelFont: 'Times New Roman, serif',
        titleFont: 'Times New Roman, serif',
        titleFontSize: 10.5,
        titleFontWeight: 600,
        labelFontSize: 9,
        labelLimit: 200,
        labelPadding: 6,
        titlePadding: 10,
        tickColor: '#222222'
      },
      legend: {
        labelColor: '#222222',
        titleColor: '#000000',
        labelFont: 'Times New Roman, serif',
        titleFont: 'Times New Roman, serif',
        titleFontSize: 10,
        labelFontSize: 9,
        labelLimit: 200,
        orient: 'bottom',
        offset: 12
      },
      title: {
        color: '#000000',
        font: 'Times New Roman, serif',
        fontSize: 12,
        fontWeight: 700,
        subtitleColor: '#444444',
        subtitleFontSize: 9.5,
        subtitlePadding: 6,
        anchor: 'start',
        offset: 14,
        limit: 1000
      },
      range: {
        category: ['#000000', '#555555', '#888888', '#222222', '#aaaaaa']
      }
    };
  }

  if (preset === 'prism') {
    return {
      background: '#ffffff',
      padding: basePadding,
      view: { stroke: 'transparent' },
      axis: {
        domainColor: '#000000',
        domainWidth: 2,
        grid: false,
        labelColor: '#000000',
        titleColor: '#000000',
        labelFont: 'Arial, sans-serif',
        titleFont: 'Arial, sans-serif',
        titleFontSize: 12,
        titleFontWeight: 700,
        labelFontSize: 10.5,
        labelLimit: 200,
        labelPadding: 6,
        titlePadding: 10,
        tickColor: '#000000',
        tickWidth: 1.5,
        tickSize: 5
      },
      legend: {
        labelColor: '#000000',
        titleColor: '#000000',
        labelFont: 'Arial, sans-serif',
        titleFont: 'Arial, sans-serif',
        titleFontSize: 11,
        titleFontWeight: 700,
        labelFontSize: 10,
        labelLimit: 200,
        orient: 'bottom',
        offset: 12
      },
      title: {
        color: '#002147',
        font: 'Arial, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        subtitleColor: '#333333',
        subtitleFontSize: 10.5,
        subtitlePadding: 6,
        anchor: 'start',
        offset: 14,
        limit: 1000
      },
      range: {
        category: ['#0072B2', '#D55E00', '#009E73', '#F0E442', '#56B4E9', '#CC79A7']
      }
    };
  }

  // Default Dark / Light scientific styling
  const textColor = isDark ? '#EDEDED' : '#18181B';
  const labelColor = isDark ? '#8C8C8C' : '#71717A';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  const domainColor = isDark ? '#2E2E2E' : '#E4E4E7';

  return {
    background: 'transparent',
    padding: basePadding,
    view: { stroke: 'transparent' },
    axis: {
      domainColor,
      gridColor,
      labelColor,
      titleColor: textColor,
      labelFont: 'JetBrains Mono, Fira Code, monospace',
      titleFont: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      titleFontSize: 11,
      titleFontWeight: 500,
      titlePadding: 10,
      labelFontSize: 10,
      labelPadding: 6,
      labelLimit: 200,
      labelOverlap: 'parity',
      tickColor: domainColor
    },
    legend: {
      labelColor,
      titleColor: textColor,
      labelFont: 'JetBrains Mono, Fira Code, monospace',
      titleFont: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      titleFontSize: 11,
      titleFontWeight: 500,
      titlePadding: 8,
      labelFontSize: 10,
      labelLimit: 200,
      orient: 'bottom',
      columns: 4,
      offset: 14
    },
    title: {
      color: textColor,
      font: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      fontSize: 14,
      fontWeight: 600,
      subtitleColor: labelColor,
      subtitleFontSize: 11,
      subtitlePadding: 6,
      anchor: 'start',
      offset: 14,
      limit: 1000
    },
    range: {
      category: isDark
        ? ['#3ecf8e', '#60a5fa', '#f59e0b', '#ec4899', '#a78bfa', '#14b8a6', '#f43f5e']
        : ['#059669', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#0d9488', '#e11d48']
    }
  };
}

export function compileToVegaLiteSpec(spec: FigureSpec, profile: DatasetProfile, isPreview: boolean = false): Record<string, any> {
  const baseConfig = getJournalThemeConfig(spec.themePreset, spec.theme || 'light');

  const toVegaType = (t: string) => {
    switch (t) {
      case 'quantitative': return 'quantitative';
      case 'temporal': return 'temporal';
      case 'ordinal': return 'ordinal';
      default: return 'nominal';
    }
  };

  const buildChannel = (ch: any) => {
    if (!ch) return undefined;
    const mapping: Record<string, any> = {
      field: ch.field,
      type: toVegaType(ch.type)
    };
    if (ch.axisTitle || ch.legendTitle) {
      mapping.title = ch.axisTitle || ch.legendTitle;
    }
    if (ch.scaleType) {
      mapping.scale = { type: ch.scaleType, zero: ch.zero ?? false };
    }
    if (ch.aggregate) {
      mapping.aggregate = ch.aggregate;
    }
    return mapping;
  };

  const xEnc = buildChannel(spec.encoding.x);
  const yEnc = buildChannel(spec.encoding.y);
  const colorEnc = buildChannel(spec.encoding.color);
  const shapeEnc = buildChannel(spec.encoding.shape);
  const sizeEnc = buildChannel(spec.encoding.size);

  // Apply filters if any
  let filteredRecords = profile.records;
  if (spec.filters && spec.filters.length > 0) {
    filteredRecords = profile.records.filter(r => {
      return spec.filters!.every(f => {
        const val = r[f.field];
        if (f.operator === '==') return String(val) === String(f.value);
        if (f.operator === '!=') return String(val) !== String(f.value);
        if (f.operator === '>') return Number(val) > Number(f.value);
        if (f.operator === '<') return Number(val) < Number(f.value);
        if (f.operator === 'in' && Array.isArray(f.value)) return f.value.includes(val);
        return true;
      });
    });
  }

  // Distribution with Raw Observation Points (Jitter Boxplot / Beeswarm)
  if (spec.figureIntent === 'distribution' && spec.showsRawObservations) {
    const layers: any[] = [];
    const summaryMarkType = spec.mark || 'boxplot';

    layers.push({
      mark: {
        type: summaryMarkType,
        ...(summaryMarkType === 'boxplot' && {
          extent: 'min-max',
          ticks: true,
          median: { color: '#111827', size: 2 }
        }),
        ...(summaryMarkType === 'bar' && {
          cornerRadiusTop: 3
        }),
        ...(summaryMarkType === 'line' && {
          strokeWidth: 2.5,
          point: true
        }),
        opacity: isPreview ? 0.85 : 0.75
      },
      encoding: {
        x: xEnc,
        y: yEnc,
        ...(colorEnc && { color: colorEnc })
      }
    });

    if (summaryMarkType !== 'point' && summaryMarkType !== 'tick') {
      layers.push({
        transform: [
          {
            calculate: 'random() * 0.4 - 0.2',
            as: 'jitter_offset'
          }
        ],
        mark: {
          type: 'point',
          filled: true,
          size: 38,
          opacity: isPreview ? 0.9 : 0.65,
          tooltip: { content: 'data' }
        },
        encoding: {
          x: xEnc,
          y: yEnc,
          xOffset: { field: 'jitter_offset', type: 'quantitative' },
          ...(colorEnc && { color: colorEnc }),
          ...(shapeEnc && { shape: shapeEnc })
        }
      });
    }

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      title: {
        text: spec.title + (isPreview ? ' [PREVIEW]' : ''),
        subtitle: spec.subtitle || `Intent: ${spec.figureIntent} • Mark: ${summaryMarkType}`
      },
      data: { values: filteredRecords },
      layer: layers,
      config: baseConfig,
      width: 'container',
      height: 380,
      autosize: { type: 'fit', contains: 'padding', resize: true }
    };
  }

  // Scatter plot with Regression Trendlines or Error Bars
  const layers: any[] = [];

  const mainEnc: Record<string, any> = {
    x: xEnc,
    y: yEnc
  };
  if (colorEnc) mainEnc.color = colorEnc;
  if (shapeEnc) mainEnc.shape = shapeEnc;
  if (sizeEnc) mainEnc.size = sizeEnc;

  const markConfig: Record<string, any> = {
    type: spec.mark,
    tooltip: { content: 'data' },
    opacity: isPreview ? 0.9 : (spec.opacity ?? 0.85)
  };

  if (spec.mark === 'point') {
    markConfig.filled = true;
    markConfig.size = 65;
  } else if (spec.mark === 'bar') {
    markConfig.cornerRadiusTop = 3;
  } else if (spec.mark === 'line') {
    markConfig.strokeWidth = 2.5;
    markConfig.point = true;
  }

  // Base Mark Layer
  layers.push({
    mark: markConfig,
    encoding: mainEnc
  });

  // Error Bar Mode layer (SD, SEM, 95% CI)
  if (spec.errorBarMode && spec.errorBarMode !== 'none' && spec.encoding.x && spec.encoding.y) {
    const extentMap: Record<string, string> = {
      sd: 'stdev',
      sem: 'stderr',
      ci95: 'ci'
    };

    layers.push({
      mark: {
        type: 'errorbar',
        extent: extentMap[spec.errorBarMode] || 'stdev',
        ticks: true,
        strokeWidth: 1.5
      },
      encoding: {
        x: xEnc,
        y: yEnc,
        ...(colorEnc && { color: colorEnc })
      }
    });
  }

  // Trendline Layer (Linear / Polynomial Regression)
  if (spec.trendline && spec.trendline !== 'none' && spec.encoding.x && spec.encoding.y) {
    layers.push({
      transform: [
        {
          regression: spec.encoding.y.field,
          on: spec.encoding.x.field,
          groupby: spec.encoding.color ? [spec.encoding.color.field] : undefined
        }
      ],
      mark: {
        type: 'line',
        color: '#dc2626',
        strokeWidth: 2,
        strokeDash: [4, 4]
      },
      encoding: {
        x: xEnc,
        y: yEnc
      }
    });
  }

  // Statistical Annotation Text Layer (p-values, stars)
  if (spec.statisticalAnnotations && spec.statisticalAnnotations.length > 0) {
    spec.statisticalAnnotations.forEach(ann => {
      layers.push({
        data: {
          values: [
            {
              annText: `${ann.group1} vs ${ann.group2}: ${ann.stars} (p=${ann.pValue.toFixed(3)})`,
              xPos: spec.encoding.x.field,
              yPos: ann.yLevel || 0
            }
          ]
        },
        mark: {
          type: 'text',
          align: 'center',
          baseline: 'bottom',
          dy: -10,
          fontWeight: 'bold',
          fontSize: 11,
          color: '#dc2626'
        },
        encoding: {
          text: { field: 'annText', type: 'nominal' }
        }
      });
    });
  }

  if (spec.facetBy) {
    const innerSpec: Record<string, any> = {
      layer: layers.length === 1 ? undefined : layers,
      mark: layers.length === 1 ? markConfig : undefined,
      encoding: layers.length === 1 ? mainEnc : undefined,
      width: 180,
      height: 280
    };

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      title: {
        text: spec.title + (isPreview ? ' [PREVIEW]' : ''),
        subtitle: spec.subtitle || `Intent: ${spec.figureIntent} • Mark: ${spec.mark}${spec.themePreset ? ' • Style: ' + spec.themePreset.toUpperCase() : ''}`
      },
      data: { values: filteredRecords },
      facet: {
        column: {
          field: spec.facetBy.field,
          type: toVegaType(spec.facetBy.type),
          title: spec.facetBy.field
        }
      },
      spec: innerSpec,
      config: baseConfig
    };
  }

  const specOut: Record<string, any> = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: {
      text: spec.title + (isPreview ? ' [PREVIEW]' : ''),
      subtitle: spec.subtitle || `Intent: ${spec.figureIntent} • Mark: ${spec.mark}${spec.themePreset ? ' • Style: ' + spec.themePreset.toUpperCase() : ''}`
    },
    data: { values: filteredRecords },
    layer: layers.length === 1 ? undefined : layers,
    mark: layers.length === 1 ? markConfig : undefined,
    encoding: layers.length === 1 ? mainEnc : undefined,
    config: baseConfig,
    width: 'container',
    height: 380,
    autosize: { type: 'fit', contains: 'padding', resize: true }
  };

  return specOut;
}

