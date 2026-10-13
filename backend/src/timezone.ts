// Fixes the process timezone before anything else loads. Hosts like Railway run
// in UTC, while @Cron jobs without `timeZone` and any `new Date("YYYY-MM-DDTHH:mm")`
// without an offset use the process's local time. In Aggendarme, without this,
// a 9:50 appointment was treated as 4:50 a.m. Colombia time and reminders went
// out 5 hours off.
//
// APP_TIMEZONE overrides the default (an IANA name, e.g. "America/Mexico_City").
// Must be the first import in main.ts.
process.env.TZ = process.env.APP_TIMEZONE || 'America/Bogota';
