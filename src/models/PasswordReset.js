const pool = require("../config/db");
const crypto = require("crypto");

class PasswordReset {
  static async create(userId) {
    try {
      // Generar token único y seguro
      const token = crypto.randomBytes(32).toString('hex');

      // Expiración: 1 hora desde ahora
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Eliminar tokens anteriores del usuario
      await pool.query("DELETE FROM PasswordResets WHERE userId = ?", [userId]);

      const [result] = await pool.query(
        "INSERT INTO PasswordResets (userId, token, expiresAt, used) VALUES (?, ?, ?, ?)",
        [userId, token, expiresAt, false]
      );

      return { token, expiresAt };
    } catch (error) {
      throw error;
    }
  }

  static async findByToken(token) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PasswordResets WHERE token = ? AND expiresAt > NOW() AND used = false",
        [token]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async markAsUsed(token) {
    try {
      const [result] = await pool.query(
        "UPDATE PasswordResets SET used = true WHERE token = ?",
        [token]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async deleteExpiredTokens() {
    try {
      const [result] = await pool.query(
        "DELETE FROM PasswordResets WHERE expiresAt < NOW() OR used = true"
      );
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM PasswordResets WHERE userId = ? ORDER BY createdAt DESC LIMIT 1",
        [userId]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PasswordReset;