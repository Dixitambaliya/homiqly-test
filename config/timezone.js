const moment = require('moment-timezone');

// Convert UTC datetime to target timezone (e.g., Toronto)
function toTimezone(dt, tz = 'America/Toronto') {
    return dt ? moment.utc(dt).tz(tz).format('YYYY-MM-DD HH:mm:ss') : null;
}

// Convert a datetime from target timezone to UTC (for storing in DB)
function toUTC(dt, tz = 'America/Toronto') {
    return dt ? moment.tz(dt, tz).utc().format('YYYY-MM-DD HH:mm:ss') : null;
}

// Optional: convert only date part
function toTimezoneDate(dt, tz = 'America/Toronto') {
    return dt ? moment.utc(dt).tz(tz).format('YYYY-MM-DD') : null;
}

// Optional: convert only time part
function toTimezoneTime(dt, tz = 'America/Toronto') {
    return dt ? moment.utc(dt).tz(tz).format('HH:mm:ss') : null;
}

module.exports = { toTimezone, toUTC, toTimezoneDate, toTimezoneTime };
