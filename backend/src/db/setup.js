import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = await readFile(path.join(__dirname, "schema.sql"), "utf8");

await pool.query(schema);
await pool.end();
console.log("Banco preparado com sucesso.");
