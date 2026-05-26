import "dotenv/config";
import pg from "pg";

const isSupabase = process.env.DATABASE_URL?.includes(".supabase.co");

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 12
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}
