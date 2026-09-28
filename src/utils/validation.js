// Deliberately simple: something@something.something, no spaces.
// Full email validation is notoriously complex; the only real proof an
// address works is sending mail to it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password, so anything longer
// would be silently truncated.
const PASSWORD_MAX_LENGTH = 72;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;

function normaliseEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

function isValidEmail(email) {
  return (
    typeof email === 'string' &&
    email.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(email)
  );
}

// Returns an error message, or null if the password is acceptable.
function checkPassword(password) {
  if (typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

// Returns a list of problems with a registration request (empty if valid).
function validateRegistration({ email, password, name }) {
  const errors = [];

  if (!isValidEmail(normaliseEmail(email))) {
    errors.push('A valid email is required');
  }

  const passwordError = checkPassword(password);
  if (passwordError) {
    errors.push(passwordError);
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length > NAME_MAX_LENGTH) {
    errors.push(`Name must be at most ${NAME_MAX_LENGTH} characters`);
  }

  return errors;
}

module.exports = {
  normaliseEmail,
  isValidEmail,
  checkPassword,
  validateRegistration,
};
