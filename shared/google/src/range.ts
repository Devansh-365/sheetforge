/**
 * Build a Google Sheets A1 range string with the tab name properly quoted.
 *
 * Sheets API rejects unquoted tab names that contain spaces, apostrophes, or
 * other non-alphanumeric chars (`Q1 2026!A1:ZZ` → 400 INVALID_ARGUMENT). The
 * spec form is `'Q1 2026'!A1:ZZ` with embedded apostrophes doubled.
 */
export function a1Range(tabName: string, range: string): string {
  const needsQuote = /[^A-Za-z0-9_]/.test(tabName);
  const tab = needsQuote ? `'${tabName.replace(/'/g, "''")}'` : tabName;
  return `${tab}!${range}`;
}

/**
 * Quote just the tab name, no range — for endpoints like values.get on a
 * whole tab where the range portion is empty.
 */
export function a1Tab(tabName: string): string {
  const needsQuote = /[^A-Za-z0-9_]/.test(tabName);
  return needsQuote ? `'${tabName.replace(/'/g, "''")}'` : tabName;
}
