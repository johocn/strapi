const TABLE_NAME = "zhao_channels";
const COLUMN_NAME = "site_id";
const FOREIGN_TABLE = "zhao_site_configs";
const CONSTRAINT_NAME = "zhao_channels_site_id_fk";

module.exports = {
  name: "add_site_column",

  async up({ db }) {
    const hasColumn = await db.schema.hasColumn(TABLE_NAME, COLUMN_NAME);
    if (!hasColumn) {
      await db.schema.alterTable(TABLE_NAME, (table) => {
        table.integer(COLUMN_NAME).unsigned();
        table.foreign(COLUMN_NAME, CONSTRAINT_NAME)
          .references("id")
          .inTable(FOREIGN_TABLE)
          .onDelete("SET NULL");
      });
    }
  },

  async down({ db }) {
    const hasColumn = await db.schema.hasColumn(TABLE_NAME, COLUMN_NAME);
    if (hasColumn) {
      await db.schema.alterTable(TABLE_NAME, (table) => {
        table.dropForeign([COLUMN_NAME], CONSTRAINT_NAME);
        table.dropColumn(COLUMN_NAME);
      });
    }
  },
};
