import { DomainState, INITIAL_DOMAIN_STATE } from './state';

const DOMAIN_STATE_KEY = 'figurefoundry_domain_state_v1';

/** Persist catalog and provenance; a pending WebMCP proposal remains session-scoped. */
export function loadDomainState(): DomainState {
  if (typeof window === 'undefined') return INITIAL_DOMAIN_STATE;
  try {
    const raw = localStorage.getItem(DOMAIN_STATE_KEY);
    if (!raw) return INITIAL_DOMAIN_STATE;
    const saved = JSON.parse(raw) as Partial<DomainState>;
    return {
      ...INITIAL_DOMAIN_STATE,
      ...saved,
      account: { ...INITIAL_DOMAIN_STATE.account, ...saved.account },
      workspaces: saved.workspaces || INITIAL_DOMAIN_STATE.workspaces,
      projects: saved.projects || INITIAL_DOMAIN_STATE.projects,
      figures: saved.figures || INITIAL_DOMAIN_STATE.figures,
      datasets: saved.datasets || INITIAL_DOMAIN_STATE.datasets,
      provenance: saved.provenance || INITIAL_DOMAIN_STATE.provenance,
      activePreview: null,
      isWebMcpConnected: INITIAL_DOMAIN_STATE.isWebMcpConnected,
    };
  } catch {
    return INITIAL_DOMAIN_STATE;
  }
}

export function saveDomainState(state: DomainState): void {
  if (typeof window === 'undefined') return;
  try {
    const { activePreview, isWebMcpConnected, ...persisted } = state;
    localStorage.setItem(DOMAIN_STATE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage is best effort; the in-memory state remains authoritative.
  }
}
