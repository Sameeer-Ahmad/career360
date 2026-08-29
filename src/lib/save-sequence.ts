/**
 * Guards an autosave-style flow against out-of-order responses: if request
 * A is dispatched, then request C is dispatched before A's response
 * arrives, A's (now-stale) response must never be allowed to overwrite
 * what C's response applies. Call `next()` when dispatching a request and
 * keep the returned sequence number; when that request's response arrives,
 * only apply it if `isLatest(sequence)` is still true — a later `next()`
 * call in between means a newer request has since been dispatched, so this
 * response is discarded. Framework-independent so it's usable (and
 * testable) outside of any specific component — used by the Notes
 * autosave flow in learning-workspace.tsx.
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
