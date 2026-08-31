import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { DomainState, INITIAL_DOMAIN_STATE, INITIAL_FIGURE_STATE } from './state';
import { DomainCommand } from './commands';
import { domainReducer } from './reducer';
import { FigureProject, ExportBundle } from '../../types';

export type StoreListener = (state: DomainState) => void;

export class DomainStore {
  private state: DomainState;
  private listeners: Set<StoreListener> = new Set();

  constructor(initialState: DomainState = INITIAL_DOMAIN_STATE) {
    this.state = initialState;
  }

  public getState(): DomainState {
    return this.state;
  }

  public dispatch(command: DomainCommand): void {
    this.state = domainReducer(this.state, command);
    this.notify();
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const globalDomainStore = new DomainStore();
export type FigureStore = any;

let cachedSnapshot: any = null;
let lastDomainState: DomainState | null = null;

// Backwards compatibility alias for globalFigureStore
export const globalFigureStore = {
  getState: () => {
    const s = globalDomainStore.getState();
    if (s !== lastDomainState || !cachedSnapshot) {
      lastDomainState = s;
      cachedSnapshot = {
        ...INITIAL_FIGURE_STATE,
        datasetId: s.selectedDatasetId,
        currentRevision: s.provenance.events.length + 1,
        provenanceLedger: s.provenance.events,
        activePreview: null,
      };
    }
    return cachedSnapshot;
  },
  dispatch: (action: any) => {
    if (action.type === 'APPLY_PROPOSAL' || action.type === 'PROPOSE_SPEC') {
      globalDomainStore.dispatch({
        type: 'APPLY_PROPOSAL',
        payload: {
          panelId: action.payload?.panelId || 'panel-d',
          spec: action.payload?.spec || action.payload,
          commitMessage: action.payload?.commitMessage || 'Applied WebMCP agent action',
        },
      });
    }
  },
  subscribe: (listener: () => void) => globalDomainStore.subscribe(listener),
};

// React Context for Domain Store
const DomainStoreContext = createContext<{
  state: DomainState;
  dispatch: React.Dispatch<DomainCommand>;
}>({
  state: INITIAL_DOMAIN_STATE,
  dispatch: () => {},
});

export const DomainStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(domainReducer, INITIAL_DOMAIN_STATE);

  // Sync with global store instance for external WebMCP tool calls
  useEffect(() => {
    const unsubscribe = globalDomainStore.subscribe((nextState) => {
      // Keep global store in sync
    });
    return unsubscribe;
  }, []);

  return (
    <DomainStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </DomainStoreContext.Provider>
  );
};

export function useDomainStore() {
  return useContext(DomainStoreContext);
}

export function exportBundle(project: FigureProject): ExportBundle {
  const bundle: ExportBundle = {
    bundleVersion: '1.0',
    project: JSON.parse(JSON.stringify(project)),
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
  if (bundle.bundleVersion !== '1.0') {
    throw new Error('Invalid bundle version. Expected 1.0.');
  }
  return bundle.project;
}
