const pool = require("../config/db");

class User {
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(name, last_name, document, email, phone, vehicle_plate, role, hashedPassword) {
    try {
      const [result] = await pool.query(
        "INSERT INTO users (name, last_name, document, email, phone, vehicle_plate, role, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, last_name, document, email, phone, vehicle_plate, role, hashedPassword]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.query("SELECT id, name, last_name, document, email, phone, vehicle_plate, role, created_at FROM users");
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByRole(role) {
    try {
      const [rows] = await pool.query("SELECT id, name, last_name, document, email, phone, vehicle_plate, role, created_at FROM users WHERE role = ?", [role]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userData) {
    const { name, last_name, document, email, phone, vehicle_plate, role } = userData;

    try {
      const [result] = await pool.query(
        "UPDATE users SET name = ?, last_name = ?, document = ?, email = ?, phone = ?, vehicle_plate = ?, role = ? WHERE id = ?",
        [name, last_name, document, email, phone, vehicle_plate, role, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updatePassword(id, hashedPassword) {
    try {
      const [result] = await pool.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteUser(id) {
    try {
      const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;