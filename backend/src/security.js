import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const encryptionSecret = process.env.API_TOKEN_ENCRYPTION_SECRET || "dev-encryption-secret";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(role = null) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Token ausente." });
    try {
      req.user = jwt.verify(token, jwtSecret);
      if (role && req.user.role !== role) return res.status(403).json({ error: "Acesso negado." });
      next();
    } catch {
      res.status(401).json({ error: "Token invalido ou expirado." });
    }
  };
}

function key() {
  return crypto.createHash("sha256").update(encryptionSecret).digest();
}

export function encryptSecret(value = "") {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value = "") {
  if (!value) return "";
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function fingerprint(...parts) {
  return crypto.createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex");
}
