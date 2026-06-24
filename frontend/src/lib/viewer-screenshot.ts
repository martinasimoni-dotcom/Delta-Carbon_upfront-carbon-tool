let _capture: () => string | null = () => null;

export function registerCapture(fn: () => string | null): void {
  _capture = fn;
}

export function captureViewerScreenshot(): string | null {
  return _capture();
}
