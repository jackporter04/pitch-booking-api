/**
 * Initial schema: users, venues, pitches, slots, bookings.
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 100).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('venues', (t) => {
    t.increments('id').primary();
    t.string('name', 150).notNullable();
    t.string('address', 255).notNullable();
    t.time('opening_time').notNullable();
    t.time('closing_time').notNullable();
    t.check('?? < ??', ['opening_time', 'closing_time'], 'venues_opening_before_closing');
  });

  // A venue can have several pitches (e.g. two cages side by side).
  await knex.schema.createTable('pitches', (t) => {
    t.increments('id').primary();
    t.integer('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.string('surface_type', 50).notNullable();
    t.decimal('price_per_hour', 8, 2).notNullable();
    t.unique(['venue_id', 'name']);
    t.check('?? >= 0', ['price_per_hour'], 'pitches_price_non_negative');
    t.index('venue_id');
  });

  // Slots are pre-generated per pitch, so a booking claims an existing row
  // rather than checking for overlapping time ranges.
  await knex.schema.createTable('slots', (t) => {
    t.increments('id').primary();
    t.integer('pitch_id').notNullable().references('id').inTable('pitches').onDelete('CASCADE');
    t.timestamp('start_time', { useTz: true }).notNullable();
    t.timestamp('end_time', { useTz: true }).notNullable();
    t.unique(['pitch_id', 'start_time']);
    t.check('?? < ??', ['start_time', 'end_time'], 'slots_start_before_end');
  });

  // Cancellations are soft (status = 'cancelled'), so rows are never deleted
  // and bookings keep a RESTRICT relationship to their slot and user.
  await knex.schema.createTable('bookings', (t) => {
    t.increments('id').primary();
    t.integer('slot_id').notNullable().references('id').inTable('slots').onDelete('RESTRICT');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.enu('status', ['confirmed', 'cancelled'], {
      useNative: true,
      enumName: 'booking_status',
    }).notNullable().defaultTo('confirmed');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('slot_id');
    t.index('user_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('bookings');
  await knex.raw('DROP TYPE IF EXISTS booking_status');
  await knex.schema.dropTableIfExists('slots');
  await knex.schema.dropTableIfExists('pitches');
  await knex.schema.dropTableIfExists('venues');
  await knex.schema.dropTableIfExists('users');
};
