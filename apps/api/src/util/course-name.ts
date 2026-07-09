/**
 * Derives a clean, series-level title from a legacy `CourseName` of the form "Name #N YYYY"
 * by stripping the trailing year and the `#N` run suffix. This is the ad-hoc normalization the
 * proper series-detection migration (plan §4.2) will formalize.
 */
export function normalizeCourseName(courseName: string): string {
  return courseName
    .replace(/\s+\d{4}$/, '')
    .replace(/\s+#\d+$/, '')
    .trim();
}
