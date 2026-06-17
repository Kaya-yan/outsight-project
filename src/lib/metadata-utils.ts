export function mergeMetadata(
  base: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
  };
}
