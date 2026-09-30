// Postgres error code for a unique constraint violation.
const UNIQUE_VIOLATION = '23505';

// True if err is Postgres refusing a write because of a unique constraint
// (optionally a specific one, by name).
function isUniqueViolation(err, constraint) {
  return err.code === UNIQUE_VIOLATION && (!constraint || err.constraint === constraint);
}

module.exports = { isUniqueViolation };
