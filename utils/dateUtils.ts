/**
 * Week Definition: Sunday (day 0) to Saturday (day 6)
 * Week number is calculated as: the week containing that Sunday belongs to the year of that Sunday.
 * For weeks spanning two months, the week is assigned to whichever month has more days in that week.
 */

/**
 * Get the start (Sunday) of the week for a given date.
 */
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day); // go back to Sunday
  return d;
};

/**
 * Get the week number (Sun-Sat) and year for a given date.
 * Week 1 is the week containing the first Sunday of the year,
 * or if Jan 1 is not a Sunday, the week that starts on the previous Sunday.
 * We use a simpler approach: Jan 1 week = week 1 always,
 * then count forward.
 *
 * Simpler robust approach: 
 * - Week year = year of the majority-month of that week (Sun-Sat)
 * - Week number = count of weeks from the first week of that year
 *
 * For compatibility and clarity, we compute week number as:
 * The Sunday of the week. Week 1 = the week whose Sunday falls on or before Jan 1 AND whose Saturday is >= Jan 1.
 * Then week number = floor((Sunday - firstWeekSunday) / 7) + 1
 */
export const getSunSatWeek = (date: Date = new Date()): { year: number; week: number; start: Date; end: Date } => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Determine which year this week belongs to (majority month logic for year boundary).
  // For year purposes: use the year that has more days in this week.
  // More simply: if the week spans a year boundary (Dec->Jan), assign to the year with 4+ days.
  // Since week is 7 days: Sunday is day 0, Saturday is day 6.
  // Days in previous year: if weekStart.year < weekEnd.year => days in old year = 31 - weekStart.getDate() + 1 = ...
  // Actually: days in weekStart.year = days from Sunday to Dec 31 = 31-weekStart.getDate()+1 (if Dec)
  // days in weekEnd.year = weekEnd.getDate() (if Jan)
  // We assign to the year with more days; if weekEnd.year > weekStart.year:
  //   daysInOldYear = 7 - weekEnd.getDate() (days from Sunday through to Dec 31)
  //   daysInNewYear = weekEnd.getDate() (Jan 1 through Saturday)
  //   if daysInNewYear >= 4 => new year, else old year
  
  let weekYear: number;
  if (weekEnd.getFullYear() > weekStart.getFullYear()) {
    const daysInNewYear = weekEnd.getDate(); // days in January (since weekEnd is in Jan)
    weekYear = daysInNewYear >= 4 ? weekEnd.getFullYear() : weekStart.getFullYear();
  } else {
    weekYear = weekStart.getFullYear();
  }

  // Find the start of week 1 for weekYear:
  // Week 1 is the week (Sun-Sat) that contains Jan 1 of weekYear, or starts on/before Jan 1.
  // If Jan 1 majority is in weekYear, then the Sunday on/before Jan 1 is the start of week 1.
  const jan1 = new Date(weekYear, 0, 1);
  const firstWeekSunday = getWeekStart(jan1);
  
  // But if firstWeekSunday's week belongs to previous year (less than 4 days in weekYear):
  // then week 1 might start on the next Sunday.
  // Check: days of firstWeekSunday's week in weekYear:
  const firstWeekSat = new Date(firstWeekSunday);
  firstWeekSat.setDate(firstWeekSat.getDate() + 6);
  const daysInYear = firstWeekSat.getFullYear() > firstWeekSunday.getFullYear()
    ? firstWeekSat.getDate() // days of Jan in that week
    : 7; // full week in same year
  
  let actualFirstWeekSunday: Date;
  if (daysInYear < 4) {
    // Week 1 starts the next Sunday
    actualFirstWeekSunday = new Date(firstWeekSunday);
    actualFirstWeekSunday.setDate(actualFirstWeekSunday.getDate() + 7);
  } else {
    actualFirstWeekSunday = firstWeekSunday;
  }

  const diffMs = weekStart.getTime() - actualFirstWeekSunday.getTime();
  const weekNumber = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;

  return {
    year: weekYear,
    week: weekNumber,
    start: weekStart,
    end: weekEnd
  };
};

/**
 * Format week as "YYYY-WXX" string (Sun-Sat definition)
 */
export const getWeekId = (date: Date = new Date()): string => {
  const { year, week } = getSunSatWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

export const getCurrentWeekId = (): string => getWeekId(new Date());

/**
 * Get the previous week's ID
 */
export const getPreviousWeekId = (weekId: string): string => {
  const { start } = weekIdToDateRange(weekId);
  const prevSunday = new Date(start);
  prevSunday.setDate(prevSunday.getDate() - 7);
  return getWeekId(prevSunday);
};

/**
 * Get the next week's ID
 */
export const getNextWeekId = (weekId: string): string => {
  const { start } = weekIdToDateRange(weekId);
  const nextSunday = new Date(start);
  nextSunday.setDate(nextSunday.getDate() + 7);
  return getWeekId(nextSunday);
};

/**
 * Convert a weekId string ("YYYY-WXX") to { start: Date (Sunday), end: Date (Saturday) }
 */
export const weekIdToDateRange = (weekId: string): { start: Date; end: Date } => {
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Find the first week's Sunday for this year
  const jan1 = new Date(year, 0, 1);
  let firstWeekSunday = getWeekStart(jan1);
  
  // Check if this week actually belongs to the year
  const firstWeekSat = new Date(firstWeekSunday);
  firstWeekSat.setDate(firstWeekSat.getDate() + 6);
  const daysInYear = firstWeekSat.getFullYear() > firstWeekSunday.getFullYear()
    ? firstWeekSat.getDate()
    : 7;
  
  if (daysInYear < 4) {
    firstWeekSunday = new Date(firstWeekSunday);
    firstWeekSunday.setDate(firstWeekSunday.getDate() + 7);
  }

  const start = new Date(firstWeekSunday);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
};

// ─── Legacy aliases for backward compatibility ───────────────────────────────
export const getISOWeek = getWeekId;
export const getCurrentISOWeek = getCurrentWeekId;
export const isoWeekToDateRange = weekIdToDateRange;
export const getPreviousISOWeek = getPreviousWeekId;
export const getNextISOWeek = getNextWeekId;

/**
 * Get the month "label" for a week, using majority rule.
 * If the week spans two months, returns the month that has >= 4 days.
 */
export const getWeekMonth = (weekId: string): { year: number; month: number } => {
  const { start, end } = weekIdToDateRange(weekId);
  if (start.getMonth() === end.getMonth()) {
    return { year: start.getFullYear(), month: start.getMonth() };
  }
  // Count days in start vs end month
  const daysInEndMonth = end.getDate(); // days of the last month in this week
  if (daysInEndMonth >= 4) {
    return { year: end.getFullYear(), month: end.getMonth() };
  } else {
    return { year: start.getFullYear(), month: start.getMonth() };
  }
};
