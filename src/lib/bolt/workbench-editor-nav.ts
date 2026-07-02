let scrollToLineHandler: ((line: number) => void) | null = null;

export function registerWorkbenchEditorScroll(handler: (line: number) => void) {
  scrollToLineHandler = handler;
  return () => {
    if (scrollToLineHandler === handler) scrollToLineHandler = null;
  };
}

export function scrollWorkbenchEditorToLine(line: number) {
  scrollToLineHandler?.(line);
}
