import { DomainState } from './state';
import { DomainCommand } from './commands';
import { recordRevision } from '../provenance/ledger';
import { DEFAULT_MULTIPANEL_FIGURE, createNewFigure } from '../multipanel/defaultFigure';
import { saveFigureToStorage, saveActiveThemeId } from '../multipanel/storage';
import { registerRuntimeDataset } from '../data-model/profiler';
import { unregisterRuntimeDataset } from '../data-model/profiler';
import { saveDomainState } from './persistence';

export function domainReducer(state: DomainState, command: DomainCommand): DomainState {
  switch (command.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: command.payload };

    case 'SWITCH_ACCOUNT': {
      const isGuest = command.payload === 'guest';
      return {
        ...state,
        account: {
          id: isGuest ? 'acc-guest' : 'acc-1',
          name: isGuest ? 'Researcher' : 'Researcher',
          email: isGuest ? 'researcher@figurefoundry.local' : 'researcher@figurefoundry.local',
          type: command.payload,
          activeWorkspaceId: state.activeWorkspaceId,
        },
      };
    }

    case 'SWITCH_WORKSPACE': {
      const wsId = command.payload;
      const ws = state.workspaces.find((w) => w.id === wsId);
      if (!ws) return state;

      const wsProjects = state.projects.filter((p) => p.workspaceId === wsId);
      const activeProj = wsProjects[0] || null;
      const activeFig = activeProj
        ? state.figures.find((f) => activeProj.figureIds.includes(f.id)) || null
        : null;

      return {
        ...state,
        activeWorkspaceId: wsId,
        projects: state.projects,
        activeProjectId: activeProj ? activeProj.id : null,
        figure: activeFig,
        activeFigureId: activeFig ? activeFig.id : null,
        account: {
          ...state.account,
          activeWorkspaceId: wsId,
        },
      };
    }

    case 'CREATE_WORKSPACE': {
      const newWs = {
        id: `ws-${Date.now()}`,
        name: command.payload.name.trim() || 'New Team Workspace',
        ownerId: state.account.id,
        memberIds: [state.account.id],
        sharedDatasetIds: [],
        projectIds: [],
      };

      return {
        ...state,
        workspaces: [...state.workspaces, newWs],
        activeWorkspaceId: newWs.id,
        activeProjectId: null,
        figure: null,
        activeFigureId: null,
        account: {
          ...state.account,
          activeWorkspaceId: newWs.id,
        },
      };
    }

    case 'DELETE_WORKSPACE': {
      const wsIdToDelete = command.payload;
      const remainingWorkspaces = state.workspaces.filter((w) => w.id !== wsIdToDelete);

      let nextWsList = remainingWorkspaces;
      let nextWsId = state.activeWorkspaceId;

      if (remainingWorkspaces.length === 0) {
        const freshWs = {
          id: `ws-${Date.now()}`,
          name: 'Main Workspace',
          ownerId: state.account.id,
          memberIds: [state.account.id],
          sharedDatasetIds: [],
          projectIds: [],
        };
        nextWsList = [freshWs];
        nextWsId = freshWs.id;
      } else if (state.activeWorkspaceId === wsIdToDelete) {
        nextWsId = remainingWorkspaces[0].id;
      }

      // Remove projects and figures belonging to deleted workspace
      const remainingProjects = state.projects.filter((p) => p.workspaceId !== wsIdToDelete);
      const activeProj = remainingProjects.find((p) => p.workspaceId === nextWsId) || null;
      const activeFig = activeProj
        ? state.figures.find((f) => activeProj.figureIds.includes(f.id)) || null
        : null;

      return {
        ...state,
        workspaces: nextWsList,
        activeWorkspaceId: nextWsId,
        projects: remainingProjects,
        activeProjectId: activeProj ? activeProj.id : null,
        figure: activeFig,
        activeFigureId: activeFig ? activeFig.id : null,
        account: {
          ...state.account,
          activeWorkspaceId: nextWsId,
        },
      };
    }

    case 'SWITCH_PROJECT': {
      const projId = command.payload;
      const proj = state.projects.find((p) => p.id === projId);
      if (!proj) return state;

      const activeFig = state.figures.find((f) => proj.figureIds.includes(f.id)) || state.figure;

      return {
        ...state,
        activeProjectId: projId,
        figure: activeFig,
        activeFigureId: activeFig.id,
      };
    }

    case 'CREATE_PROJECT': {
      const newProj = {
        id: `proj-${Date.now()}`,
        workspaceId: state.activeWorkspaceId,
        name: command.payload.name.trim() || 'New Research Project',
        description: command.payload.description?.trim() || 'Multi-panel figure collection.',
        datasetIds: [],
        figureIds: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };

      // Create initial figure for this project — seed one agent-editable panel so
      // the canvas is never a blank white page on first open.
      const freshFig = {
        id: `fig-${Date.now()}`,
        name: `${newProj.name} - Canvas 1`,
        panels: [
          {
            id: 'panel-a',
            label: 'Panel A',
            letter: 'A',
            frame: { x: 30, y: 20, width: 560, height: 360 },
            spec: {
              kind: 'single-chart',
              isAgentEditable: true,
              spec: {
                title: 'Agent Editable Chart',
                mark: 'bar',
                encoding: {
                  x: { field: 'species', type: 'nominal' },
                  y: { field: 'body_mass_g', type: 'quantitative', aggregate: 'mean' },
                },
              },
            },
          },
        ],
        layers: [
          {
            id: 'layer-panel-a',
            name: 'Panel A',
            visible: true,
            locked: false,
            panelId: 'panel-a',
            order: 0,
          },
        ],
        manualItems: [],
        canvasSize: { width: 1200, height: 800 },
        activeThemeId: 'nature',
      };
      
      newProj.figureIds.push(freshFig.id);

      const updatedWorkspaces = state.workspaces.map((w) =>
        w.id === state.activeWorkspaceId
          ? { ...w, projectIds: [...w.projectIds, newProj.id] }
          : w
      );

      saveFigureToStorage(freshFig as any);

      return {
        ...state,
        workspaces: updatedWorkspaces,
        projects: [...state.projects, newProj],
        activeProjectId: newProj.id,
        figures: [...state.figures, freshFig as any],
        figure: freshFig as any,
        activeFigureId: freshFig.id,
      };
    }

    case 'DELETE_PROJECT': {
      const filtered = state.projects.filter((p) => p.id !== command.payload);
      const nextActive = filtered.find((p) => p.workspaceId === state.activeWorkspaceId) || filtered[0] || null;
      const nextFig = nextActive ? (state.figures.find((f) => nextActive.figureIds.includes(f.id)) || state.figures[0] || null) : null;

      return {
        ...state,
        projects: filtered,
        activeProjectId: nextActive ? nextActive.id : null,
        figure: nextFig,
        activeFigureId: nextFig ? nextFig.id : null,
      };
    }

    case 'SWITCH_FIGURE': {
      const figId = command.payload;
      const targetFig = state.figures.find((f) => f.id === figId);
      if (!targetFig) return state;

      saveFigureToStorage(targetFig);
      return {
        ...state,
        figure: targetFig,
        activeFigureId: figId,
      };
    }

    case 'CREATE_FIGURE': {
      const activeProj = state.projects.find((p) => p.id === state.activeProjectId);
      const figureCount = activeProj ? activeProj.figureIds.length + 1 : state.figures.length + 1;
      const title = command.payload?.name || `Figure ${figureCount}. New Canvas Composition`;
      
      // Start every new canvas from the same usable scientific template.
      const freshFig = {
        ...structuredClone(DEFAULT_MULTIPANEL_FIGURE),
        id: `fig-${Date.now()}`,
        name: title,
      };
      saveFigureToStorage(freshFig);

      const updatedProjects = state.projects.map((p) =>
        p.id === state.activeProjectId
          ? { ...p, figureIds: [...p.figureIds, freshFig.id], updatedAt: new Date().toISOString().split('T')[0] }
          : p
      );

      return {
        ...state,
        projects: updatedProjects,
        figures: [...state.figures, freshFig],
        figure: freshFig,
        activeFigureId: freshFig.id,
        activeView: 'figures',
      };
    }

    case 'DELETE_FIGURE': {
      const targetFigId = command.payload;
      const filteredFigs = state.figures.filter((f) => f.id !== targetFigId);

      const updatedProjects = state.projects.map((p) => ({
        ...p,
        figureIds: p.figureIds.filter((id) => id !== targetFigId),
      }));

      const activeProj = updatedProjects.find((p) => p.id === state.activeProjectId);
      const remainingFig = activeProj
        ? filteredFigs.find((f) => activeProj.figureIds.includes(f.id)) || filteredFigs[0] || null
        : filteredFigs[0] || null;

      return {
        ...state,
        projects: updatedProjects,
        figures: filteredFigs,
        figure: remainingFig,
        activeFigureId: remainingFig ? remainingFig.id : null,
      };
    }

    case 'SELECT_DATASET':
      return { ...state, selectedDatasetId: command.payload };

    case 'ADD_DATASET': {
      const { dataset, scope } = command.payload;
      const exists = state.datasets.some((d) => d.id === dataset.id);
      const datasets = exists
        ? state.datasets.map((d) => (d.id === dataset.id ? dataset : d))
        : [...state.datasets, dataset];

      // Make the imported dataset visible to profileDataset()/DataView/agent tools
      // by registering it in the runtime registry (rows -> records shape).
      registerRuntimeDataset({
        id: dataset.id,
        title: dataset.title || dataset.name || dataset.id,
        description: dataset.description || 'User-imported dataset',
        citation: 'Uploaded local scientific data',
        records: dataset.rows || [],
      });

      let updatedProjects = state.projects;
      let updatedWorkspaces = state.workspaces;

      if (scope === 'project') {
        updatedProjects = state.projects.map((p) =>
          p.id === state.activeProjectId && !p.datasetIds.includes(dataset.id)
            ? { ...p, datasetIds: [...p.datasetIds, dataset.id] }
            : p
        );
      } else {
        updatedWorkspaces = state.workspaces.map((w) =>
          w.id === state.activeWorkspaceId && !w.sharedDatasetIds.includes(dataset.id)
            ? { ...w, sharedDatasetIds: [...w.sharedDatasetIds, dataset.id] }
            : w
        );
      }

      const nextState = {
        ...state,
        datasets,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
        selectedDatasetId: dataset.id,
      };
      saveDomainState(nextState);
      return nextState;
    }

    case 'TOGGLE_DATASET_SCOPE': {
      const { datasetId, scope } = command.payload;
      const updatedProjects = state.projects.map((p) => {
        if (p.id === state.activeProjectId) {
          const ids = scope === 'project'
            ? Array.from(new Set([...p.datasetIds, datasetId]))
            : p.datasetIds.filter((id) => id !== datasetId);
          return { ...p, datasetIds: ids };
        }
        return p;
      });

      const updatedWorkspaces = state.workspaces.map((w) => {
        if (w.id === state.activeWorkspaceId) {
          const ids = scope === 'workspace'
            ? Array.from(new Set([...w.sharedDatasetIds, datasetId]))
            : w.sharedDatasetIds.filter((id) => id !== datasetId);
          return { ...w, sharedDatasetIds: ids };
        }
        return w;
      });

      const nextState = {
        ...state,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
      };
      saveDomainState(nextState);
      return nextState;
    }

    case 'UPDATE_DATASET': {
      const datasets = state.datasets.map((d) => {
        if (d.id !== command.payload.id) return d;
        return { ...d, rows: command.payload.rows };
      });
      const nextState = { ...state, datasets };
      saveDomainState(nextState);
      return nextState;
    }

    case 'DELETE_DATASET': {
      const payload: any = (command as any).payload;
      const datasetId = typeof payload === 'string' ? payload : payload?.id;
      const datasets = state.datasets.filter((d) => d.id !== datasetId);
      const updatedProjects = state.projects.map((p) => ({
        ...p,
        datasetIds: p.datasetIds.filter((id) => id !== datasetId),
      }));
      const updatedWorkspaces = state.workspaces.map((w) => ({
        ...w,
        sharedDatasetIds: w.sharedDatasetIds.filter((id) => id !== datasetId),
      }));
      const selectedDatasetId = state.selectedDatasetId === datasetId
        ? datasets[0]?.id || ''
        : state.selectedDatasetId;
      const nextState = {
        ...state,
        datasets,
        projects: updatedProjects,
        workspaces: updatedWorkspaces,
        selectedDatasetId,
      };
      unregisterRuntimeDataset(datasetId);
      saveDomainState(nextState);
      return nextState;
    }



    case 'UPDATE_PANEL_SPEC': {
      const updatedPanels = state.figure.panels.map((p) =>
        p.id === command.payload.panelId ? { ...p, spec: command.payload.spec } : p
      );
      const figure = { ...state.figure, panels: updatedPanels };
      saveFigureToStorage(figure);
      return { ...state, figure };
    }

    case 'UPDATE_PANEL_FRAME': {
      const updatedPanels = state.figure.panels.map((p) =>
        p.id === command.payload.panelId ? { ...p, frame: command.payload.frame } : p
      );
      const figure = { ...state.figure, panels: updatedPanels };
      saveFigureToStorage(figure);
      return { ...state, figure };
    }

    case 'SET_ACTIVE_THEME': {
      const figure = { ...state.figure, activeThemeId: command.payload };
      saveFigureToStorage(figure);
      saveActiveThemeId(command.payload);
      return { ...state, figure };
    }

    case 'SET_CANVAS_SIZE': {
      const figure = { ...state.figure, canvasSize: command.payload };
      saveFigureToStorage(figure);
      return { ...state, figure };
    }

    case 'UPDATE_FIGURE_NAME': {
      const figure = { ...state.figure, name: command.payload };
      saveFigureToStorage(figure);
      const updatedFigures = state.figures.map((f) => (f.id === figure.id ? figure : f));
      return { ...state, figure, figures: updatedFigures };
    }

    case 'LOAD_FIGURE': {
      saveFigureToStorage(command.payload);
      const exists = state.figures.some((f) => f.id === command.payload.id);
      const figures = exists
        ? state.figures.map((f) => (f.id === command.payload.id ? command.payload : f))
        : [...state.figures, command.payload];
      return { ...state, figure: command.payload, activeFigureId: command.payload.id, figures };
    }

    case 'RESET_FIGURE': {
      const fresh = createNewFigure(`Reset Canvas ${new Date().toLocaleTimeString()}`);
      saveFigureToStorage(fresh);
      return { ...state, figure: fresh };
    }

    case 'IMPORT_FIGURE_BUNDLE': {
      const importedFig = command.payload;
      saveFigureToStorage(importedFig);

      const updatedProjects = state.projects.map((p) =>
        p.id === state.activeProjectId
          ? { ...p, figureIds: Array.from(new Set([...p.figureIds, importedFig.id])) }
          : p
      );

      return {
        ...state,
        projects: updatedProjects,
        figures: [...state.figures, importedFig],
        figure: importedFig,
        activeFigureId: importedFig.id,
        activeView: 'figures',
      };
    }

    case 'APPLY_PROPOSAL': {
      const { panelId, spec, commitMessage } = command.payload;
      const updatedPanels = state.figure.panels.map((p) =>
        p.id === panelId ? { ...p, spec } : p
      );
      const updatedFigure = { ...state.figure, panels: updatedPanels };
      saveFigureToStorage(updatedFigure);

      const provenance = recordRevision(
        state.provenance,
        updatedFigure,
        commitMessage || 'Applied WebMCP agent proposal',
        'agent'
      );

      return {
        ...state,
        figure: updatedFigure,
        provenance,
        activePreview: null,
      };
    }

    case 'SET_PREVIEW': {
      return { ...state, activePreview: command.payload.preview };
    }

    case 'CLEAR_PREVIEW':
      return { ...state, activePreview: null };

    case 'SET_WEBMCP_CONNECTED':
      return { ...state, isWebMcpConnected: command.payload };

    default:
      return state;
  }
}

export type FigureDomainAction = DomainCommand;

export interface ApplyResult {
  status: 'applied' | 'rejected_stale' | 'rejected_unknown_preview' | 'rejected_unapproved' | 'rejected_wrong_target';
  newRevision: number;
  appliedSpec: any;
  provenanceEventId: string;
  message: string;
}

