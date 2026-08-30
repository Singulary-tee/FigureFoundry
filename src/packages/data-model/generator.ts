import { DatasetProfile, FigureSpec, FigureIntent, MarkType } from '../../types';

export function generateInitialSpecForProfile(profile: DatasetProfile, theme: 'dark' | 'light' = 'light'): FigureSpec {
  const quantFields = profile.fields.filter(f => f.type === 'quantitative');
  const catFields = profile.fields.filter(f => f.type === 'categorical');
  const timeFields = profile.fields.filter(f => f.type === 'temporal');

  if (timeFields.length > 0 && quantFields.length > 0) {
    const xField = timeFields[0];
    const yField = quantFields[0];
    const colorField = catFields[0];

    return {
      id: `spec_${Date.now()}`,
      title: `${yField.name.replace(/_/g, ' ')} over Time`,
      subtitle: `Temporal trend analysis of ${yField.name} across ${xField.name}`,
      figureIntent: 'trend',
      mark: 'line',
      encoding: {
        x: { field: xField.name, type: 'temporal', axisTitle: xField.name.replace(/_/g, ' ') },
        y: { field: yField.name, type: 'quantitative', axisTitle: yField.name.replace(/_/g, ' '), zero: false },
        ...(colorField ? { color: { field: colorField.name, type: 'categorical', legendTitle: colorField.name.replace(/_/g, ' ') } } : {})
      },
      showsRawObservations: true,
      uncertaintyEncoding: 'raw-points-only',
      theme
    };
  }

  if (quantFields.length >= 2) {
    const xField = quantFields[0];
    const yField = quantFields[1];
    const colorField = catFields[0];
    const shapeField = catFields[1] || (catFields[0] && catFields[0].cardinality && catFields[0].cardinality <= 6 ? catFields[0] : undefined);

    return {
      id: `spec_${Date.now()}`,
      title: `${yField.name.replace(/_/g, ' ')} vs ${xField.name.replace(/_/g, ' ')}`,
      subtitle: `Bivariate relationship mapping ${xField.name} to ${yField.name}`,
      figureIntent: 'relationship',
      mark: 'point',
      encoding: {
        x: { field: xField.name, type: 'quantitative', axisTitle: xField.name.replace(/_/g, ' '), zero: false },
        y: { field: yField.name, type: 'quantitative', axisTitle: yField.name.replace(/_/g, ' '), zero: false },
        ...(colorField ? { color: { field: colorField.name, type: 'categorical', legendTitle: colorField.name.replace(/_/g, ' ') } } : {}),
        ...(shapeField && shapeField !== colorField ? { shape: { field: shapeField.name, type: 'categorical', legendTitle: shapeField.name.replace(/_/g, ' ') } } : {})
      },
      showsRawObservations: true,
      uncertaintyEncoding: 'raw-points-only',
      theme
    };
  }

  if (catFields.length >= 1 && quantFields.length >= 1) {
    const xField = catFields[0];
    const yField = quantFields[0];

    return {
      id: `spec_${Date.now()}`,
      title: `${yField.name.replace(/_/g, ' ')} Distribution by ${xField.name.replace(/_/g, ' ')}`,
      subtitle: `Statistical distribution and observation spread of ${yField.name}`,
      figureIntent: 'distribution',
      mark: 'boxplot',
      encoding: {
        x: { field: xField.name, type: 'categorical', axisTitle: xField.name.replace(/_/g, ' ') },
        y: { field: yField.name, type: 'quantitative', axisTitle: yField.name.replace(/_/g, ' '), zero: false },
        color: { field: xField.name, type: 'categorical', legendTitle: xField.name.replace(/_/g, ' ') }
      },
      showsRawObservations: true,
      uncertaintyEncoding: 'raw-points-only',
      theme
    };
  }

  const firstField = profile.fields[0] || { name: 'index', type: 'categorical' };
  const secondField = profile.fields[1] || firstField;

  return {
    id: `spec_${Date.now()}`,
    title: `${profile.title} Overview`,
    subtitle: `Figure workspace initialized from dataset '${profile.datasetId}'`,
    figureIntent: 'comparison',
    mark: 'bar',
    encoding: {
      x: { field: firstField.name, type: firstField.type, axisTitle: firstField.name.replace(/_/g, ' ') },
      y: { field: secondField.name, type: secondField.type, axisTitle: secondField.name.replace(/_/g, ' ') }
    },
    showsRawObservations: true,
    uncertaintyEncoding: null,
    theme
  };
}
