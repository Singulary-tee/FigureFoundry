import { FigureState, FigureProject, ExportBundle } from '../../types';
import { INITIAL_FIGURE_STATE } from './state';
import { figureReducer, FigureDomainAction } from './reducer';

export type StoreListener = (state: FigureState) => void;

export class FigureStore {
  private state: FigureState;
  private listeners: Set<StoreListener> = new Set();

  constructor(initialState: FigureState = INITIAL_FIGURE_STATE) {
    this.state = initialState;
  }

  public getState(): FigureState {
    return this.state;
  }

  public importState(newState: FigureState): void {
    this.state = newState;
    this.notify();
  }

  public dispatch(action: FigureDomainAction): any {
    const { state: nextState, result } = figureReducer(this.state, action);
    this.state = nextState;
    this.notify();

    return result;
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const globalFigureStore = new FigureStore();

export function exportBundle(project: FigureProject): ExportBundle {
  const bundle: ExportBundle = {
    bundleVersion: "1.0",
    project: JSON.parse(JSON.stringify(project))
  };

  if (typeof window !== 'undefined') {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figure_project_bundle.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return bundle;
}

export function importBundle(bundle: ExportBundle): FigureProject {
  if (bundle.bundleVersion !== "1.0") {
    throw new Error("Invalid bundle version. Expected 1.0.");
  }
  return bundle.project;
}
