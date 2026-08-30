// A MongoDB ObjectId is always exactly 24 hex characters.
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/** Parses an unknown value into a valid ObjectId string, or null if it isn't one. */
export function parseObjectId(value: unknown): string | null {
  return isValidObjectId(value) ? value : null;
}
