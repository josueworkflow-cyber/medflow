/**
 * Utility functions for date parsing and handling in reports.
 */

/**
 * Helper function to parse date parameters safely.
 * - If dateStr is not provided, defaults to 30 days ago for start, or today at end of day for end.
 * - Handles YYYY-MM-DD strings and sets start (00:00:00) or end (23:59:59.999) times.
 * - Safely handles invalid date formats by falling back to default values.
 */
export function parseDateParam(dateStr: string | null, isEnd: boolean): Date {
  if (!dateStr) {
    const d = new Date();
    if (isEnd) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    if (isEnd) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return parseDateParam(null, isEnd);
  }
  return d;
}
