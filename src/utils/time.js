// All venues are in the UK. Opening hours and "date" query parameters are
// UK local time; the database stores exact moments (timestamptz).
const VENUE_TIME_ZONE = 'Europe/London';

module.exports = { VENUE_TIME_ZONE };
