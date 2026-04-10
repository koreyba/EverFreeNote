/**
 * Format an array of tags as a human-readable string.
 * Returns "no tags" if the array is empty, otherwise joins tags with commas.
 */
export function formatTags(tags: string[]): string {
  return tags.length > 0 ? `tags: ${tags.join(", ")}` : "no tags";
}
