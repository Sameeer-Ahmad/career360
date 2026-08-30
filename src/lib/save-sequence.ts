/**
 * Guards an autosave flow against out-of-order responses. Call `next()` when
 * dispatching a request; when its response arrives, only apply it if
 * `isLatest(sequence)` is still true (a later `next()` call means a newer
 * request superseded it).
 */
export function createSaveSequencer() {
  let current = 0;
  return {
    next(): number {
      current += 1;
      return current;
    },
    isLatest(sequence: number): boolean {
      return sequence === current;
    },
  };
}
