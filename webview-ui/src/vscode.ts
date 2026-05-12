interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

let _api: VSCodeAPI | undefined;

function getApi(): VSCodeAPI {
  if (!_api) {
    if (typeof acquireVsCodeApi !== 'undefined') {
      _api = acquireVsCodeApi();
    } else {
      _api = {
        postMessage: (msg) => console.log('[vscode mock] postMessage:', msg),
        getState: () => null,
        setState: (_s) => {},
      };
    }
  }
  return _api;
}

export function vscodePostMessage(message: unknown): void {
  getApi().postMessage(message);
}

export function vscodeGetState(): unknown {
  return getApi().getState();
}

export function vscodeSetState(state: unknown): void {
  getApi().setState(state);
}
