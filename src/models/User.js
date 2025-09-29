const pool = require("../config/db");

class User {
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query("SELECT * FROM Usuarios WHERE email = ?", [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(nomUsuario, apeUsuario, numDocUsuario, email, telUsuario, idRol, idEmpresa, passwordHash, estActivo = false) {
    try {
      const [result] = await pool.query(
        "INSERT INTO Usuarios (nomUsuario, apeUsuario, numDocUsuario, email, telUsuario, idRol, idEmpresa, passwordHash, estActivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [nomUsuario, apeUsuario, numDocUsuario, email, telUsuario, idRol, idEmpresa, passwordHash, estActivo]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
               r.nomRol as rol, e.nomEmpresa, u.estActivo, u.fecCreUsuario
        FROM Usuarios u
        JOIN Roles r ON u.idRol = r.idRol
        JOIN Empresas e ON u.idEmpresa = e.idEmpresa
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getByRole(role) {
    try {
      const [rows] = await pool.query(`
        SELECT u.idUsuario, u.email, u.nomUsuario, u.apeUsuario, u.numDocUsuario, u.telUsuario,
               r.nomRol as rol, e.nomEmpresa, u.estActivo, u.fecCreUsuario
        FROM Usuarios u
        JOIN Roles r ON u.idRol = r.idRol
        JOIN Empresas e ON u.idEmpresa = e.idEmpresa
        WHERE r.nomRol = ?
      `, [role]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userData) {
    const { nomUsuario, apeUsuario, numDocUsuario, email, telUsuario, idRol } = userData;

    try {
      const [result] = await pool.query(
        "UPDATE Usuarios SET nomUsuario = ?, apeUsuario = ?, numDocUsuario = ?, email = ?, telUsuario = ?, idRol = ? WHERE idUsuario = ?",
        [nomUsuario, apeUsuario, numDocUsuario, email, telUsuario, idRol, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updatePassword(id, passwordHash) {
    try {
      const [result] = await pool.query(
        "UPDATE Usuarios SET passwordHash = ? WHERE idUsuario = ?",
        [passwordHash, id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async activateUser(id) {
    try {
      const [result] = await pool.query(
        "UPDATE Usuarios SET estActivo = 1 WHERE idUsuario = ?",
        [id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteUser(id) {
    try {
      const [result] = await pool.query("DELETE FROM Usuarios WHERE idUsuario = ?", [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getUserWithDetails(id) {
    const [rows] = await pool.query(`
        SELECT
            u.idUsuario as id,
            u.email,
            u.nomUsuario,
            u.apeUsuario,
            u.numDocUsuario,
            u.telUsuario,
            u.estActivo,
            u.fecCreUsuario,
            u.fecUltAcceso,
            r.nomRol as role,
            r.idRol as roleId,
            e.idEmpresa as empresaId,        // ✅ CAMPO CRÍTICO
            e.nomEmpresa as empresaName,
            e.estEmpresa as empresaActive
        FROM Usuarios u
        JOIN Roles r ON u.idRol = r.idRol
        JOIN Empresas e ON u.idEmpresa = e.idEmpresa  // ✅ JOIN con Empresas
        WHERE u.idUsuario = ?
    `, [id]);

    if (rows.length > 0) {
        const user = rows[0];
        return {
            id: user.id,
            email: user.email,
            name: user.nomUsuario,
            empresaId: user.empresaId,      // ✅ INCLUIR empresaId
            empresaName: user.empresaName,
            role: user.role,
            telefono: user.telUsuario,
            documento: user.numDocUsuario,
            activo: user.estActivo,
            fechaCreacion: user.fecCreUsuario,
            ultimoAcceso: user.fecUltAcceso
        };
    }
    return null;
  }
}

module.exports = User;