import React, { createContext, useContext, useReducer, useEffect, useCallback, useSyncExternalStore } from 'react';
import { DomainState, INITIAL_DOMAIN_STATE } from './state';
import { DomainCommand } from './commands';
import { domainReducer } from './reducer';
import { FigureProject, ExportBundle } from '../../types';
import { loadDomainState } from './persistence';

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

export const globalDomainStore = new DomainStore(loadDomainState());
export type FigureStore = any;

let cachedSnapshot: any = null;
let lastDomainState: DomainState | null = null;

export const globalFigureStore = {
  getState: () => {
    const s = globalDomainStore.getState();
    if (s !== lastDomainState || !cachedSnapshot) {
      lastDomainState = s;
      const currentPanel = s.figure?.panels?.[0];
      cachedSnapshot = {
        datasetId: s.selectedDatasetId,
        currentRevision: s.provenance.events.length + 1,
        spec: currentPanel?.spec?.kind === 'single-chart' ? currentPanel.spec.spec : null,
        provenanceLedger: s.provenance.events,
        activePreview: s.activePreview,
        panels: s.figure?.panels || [],
        layers: s.figure?.layers || [],
        figures: s.figures || [],
        activeFigureId: s.activeFigureId || null,
        datasets: s.datasets || [],
      };
    }
    return cachedSnapshot;
  },
  dispatch: (action: any) => {
    if (action.type === 'APPLY_PROPOSAL' || action.type === 'PROPOSE_SPEC') {
      globalDomainStore.dispatch({
        type: 'APPLY_PROPOSAL',
        payload: {
          panelId: action.payload?.panelId || globalDomainStore.getState().figure?.panels?.[0]?.id,
          spec: action.payload?.spec || action.payload,
          commitMessage: action.payload?.commitMessage || 'Applied WebMCP agent action',
          workspacePatch: action.payload?.workspacePatch,
          provenance: action.payload?.provenance,
        },
      });
    } else if (action.type === 'SET_PREVIEW' || action.type === 'CLEAR_PREVIEW') {
      globalDomainStore.dispatch(action as any);
    } else if (action.type === 'RESTORE_SNAPSHOT') {
      globalDomainStore.dispatch(action as any);
    }
  },
  subscribe: (listener: () => void) => globalDomainStore.subscribe(listener),
};

export function DomainStoreProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useDomainStore(): { state: DomainState; dispatch: (command: DomainCommand) => void } {
  const state = useSyncExternalStore(
    globalDomainStore.subscribe.bind(globalDomainStore),
    globalDomainStore.getState.bind(globalDomainStore),
    globalDomainStore.getState.bind(globalDomainStore)
  ) as DomainState;

  const dispatch = useCallback((command: DomainCommand) => {
    globalDomainStore.dispatch(command);
  }, []);

  return { state, dispatch };
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
