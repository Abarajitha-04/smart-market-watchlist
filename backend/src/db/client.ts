import { Pool } from "pg";
import "dotenv/config";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // A dead idle client should not crash the whole process.
  console.error("Unexpected Postgres pool error", err);
});
