const postgres = require("postgres");
const sql = postgres("postgresql://lifehub:lifehub_dev_password@localhost:5432/lifehub");
async function main() {
  const c = await sql.unsafe("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'page_blocks'::regclass");
  console.log("Constraints:", JSON.stringify(c));
  const e = await sql.unsafe("SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid");
  console.log("All enums:", JSON.stringify(e));
  const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'page_blocks'");
  console.log("Columns:", JSON.stringify(cols));
  await sql.end();
}
main().catch(console.error);
