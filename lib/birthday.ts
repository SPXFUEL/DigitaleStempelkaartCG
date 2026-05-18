/**
 * Birthday helpers. Vergelijking gebeurt in Europe/Amsterdam zodat de
 * verjaardag van 00:00 tot 23:59 NL-tijd actief is (en niet UTC, anders
 * mist 'ie de eerste 1-2 uur na middernacht en het laatste uur).
 */

const AMS_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns YYYY-MM-DD in Europe/Amsterdam time */
export function todayInAms(): string {
  return AMS_FMT.format(new Date());
}

/** Returns current year in Europe/Amsterdam time */
export function currentYearInAms(): number {
  return parseInt(todayInAms().slice(0, 4), 10);
}

/**
 * Is de klant vandaag jarig én heeft die de verjaardags-tractatie dit
 * jaar nog niet ingewisseld?
 */
export function isBirthdayActive(input: {
  birthday?: string | null;
  birthdayRedeemedYear?: number | null;
}): boolean {
  if (!input.birthday) return false;
  const today = todayInAms(); // "YYYY-MM-DD"
  const year = parseInt(today.slice(0, 4), 10);
  const todayMD = today.slice(5); // "MM-DD"
  const bdayMD = input.birthday.slice(5); // "MM-DD"
  if (bdayMD !== todayMD) return false;
  if (input.birthdayRedeemedYear === year) return false;
  return true;
}
