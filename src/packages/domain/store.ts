import { FigureState } from '../../types';
import { INITIAL_FIGURE_STATE } from './state';
import { figureReducer, FigureDomainAction } from './reducer';
import { IndexedDbRepository } from './repository';

export type StoreListener = (state: FigureState) => void;

export class FigureStore {
  private state: FigureState;
  private listeners: Set<StoreListener> = new Set();
  private repository: IndexedDbRepository;

  constructor(initialState: FigureState = INITIAL_FIGURE_STATE) {
    this.state = initialState;
    this.repository = new IndexedDbRepository();

    this.repository
      .loadLatestSnapshot()
      .then(saved => {
        if (saved && saved.datasetId) {
          this.state = saved;
          this.notify();
        }
      })
      .catch(() => {});
  }

  public getState(): FigureState {
    return this.state;
  }

  public dispatch(action: FigureDomainAction): any {
    const { state: nextState, result } = figureReducer(this.state, action);
    this.state = nextState;
    this.notify();

    this.repository.saveSnapshot(this.state).catch(() => {});

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
