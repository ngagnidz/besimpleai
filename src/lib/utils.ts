/**
 * Small type guards shared by the parser and other modules.
 */
import type { JsonValue } from '../types'

/**
 * True for any non-null object (including arrays — in JS `typeof [] === 'object'`).
 * Use alongside `Array.isArray` when you need “plain object only”.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * True when `value` matches our recursive `JsonValue` shape (JSON-serializable tree).
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue)
  }

  return false
}
