/**
 * Double-booking prevention: at most one confirmed booking per slot.
 *
 * This is a partial unique index. It only covers rows where status is
 * 'confirmed', so a slot can collect any number of cancelled bookings and
 * still be booked again, but can never have two confirmed ones.
 */

exports.up = async function up(knex) {
  await knex.raw(`
    CREATE UNIQUE INDEX bookings_one_confirmed_per_slot
    ON bookings (slot_id)
    WHERE status = 'confirmed'
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS bookings_one_confirmed_per_slot');
};
