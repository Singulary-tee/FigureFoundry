import { FigureState } from '../../types';

export const INITIAL_FIGURE_STATE: FigureState = {
  datasetId: '',
  currentRevision: 0,
  spec: null,
  activePreview: null,
  provenanceLedger: [],
  undoStack: [],
  redoStack: [],
  userDatasets: []
};
