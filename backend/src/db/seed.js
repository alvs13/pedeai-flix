import bcrypt from "bcryptjs";
import { pool, query } from "./pool.js";

const passwordHash = await bcrypt.hash("streambox", 10);

await query(`
  INSERT INTO users (name, email, password_hash, role)
  VALUES
    ('Administrador', 'admin@streambox.app', $1, 'ADMIN'),
    ('Usuario Demo', 'demo@streambox.app', $1, 'USER')
  ON CONFLICT (email) DO NOTHING
`, [passwordHash]);

const categories = [
  ["Lancamentos", "MOVIE"],
  ["Documentarios", "MOVIE"],
  ["Noticias", "CHANNEL"],
  ["Esportes", "CHANNEL"],
  ["Familia", "ALL"]
];

for (const [name, type] of categories) {
  await query("INSERT INTO categories (name, type) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", [name, type]);
}

const movieCategory = await query("SELECT id FROM categories WHERE name = 'Lancamentos'");
const channelCategory = await query("SELECT id FROM categories WHERE name = 'Noticias'");

await query(`
  INSERT INTO movies (title, description, category_id, year, duration_minutes, poster_url, banner_url, video_url, status, source_fingerprint)
  VALUES
    ('A Jornada do Farol', 'Filme ficticio licenciado para demonstracao do catalogo.', $1, 2026, 102,
     'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
     'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'ACTIVE', 'seed-movie-farol'),
    ('Noite de Aurora', 'Drama independente ficticio para testes de player MP4.', $1, 2025, 94,
     'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
     'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1400&q=80',
     'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'ACTIVE', 'seed-movie-aurora')
  ON CONFLICT (source_fingerprint) DO NOTHING
`, [movieCategory.rows[0].id]);

await query(`
  INSERT INTO channels (name, category_id, logo_url, stream_url, status, source_fingerprint)
  VALUES
    ('StreamBox News Demo', $1,
     'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=400&q=80',
     'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'ACTIVE', 'seed-channel-news')
  ON CONFLICT (source_fingerprint) DO NOTHING
`, [channelCategory.rows[0].id]);

await pool.end();
console.log("Dados ficticios criados. Login admin: admin@streambox.app / streambox");
