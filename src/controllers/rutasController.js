// src/controllers/rutasController.js
const pool = require('../config/db');

// Lista simple de rutas para SELECT
const getRutasSelect = async (req, res) => {
  try {
    const idEmpresa = req.user?.idEmpresa || 1; // Empresa del usuario autenticado

    const [rutas] = await pool.query(`
      SELECT idRuta, nomRuta
      FROM Rutas
      WHERE idEmpresa = ?  -- ✅ Filtrar por empresa del usuario
      ORDER BY nomRuta ASC
    `, [idEmpresa]);

    const formateadas = rutas.map(r => ({
      idRuta: r.idRuta,
      nomRuta: r.nomRuta
    }));

    res.json(formateadas);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ message: "Error del servidor al obtener rutas." });
  }
};

const getRutas = async (req, res) => {
  try {
    const idEmpresa = req.user?.idEmpresa || 1; // Empresa del usuario autenticado

    const [rutas] = await pool.query(
      `SELECT * FROM Rutas WHERE idEmpresa = ? ORDER BY nomRuta ASC`,
      [idEmpresa]
    );
    res.json(rutas);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ message: "Error del servidor al obtener rutas." });
  }
};

const crearRuta = async (req, res) => {
  const { nomRuta } = req.body;
  const idEmpresa = req.user?.idEmpresa || 1; // Empresa del usuario autenticado

  if (!nomRuta) return res.status(400).json({ message: "El nombre de la ruta es obligatorio" });

  try {
    const [result] = await pool.query(
      `INSERT INTO Rutas (nomRuta, idEmpresa) VALUES (?, ?)`,
      [nomRuta, idEmpresa]
    );
    res.status(201).json({ idRuta: result.insertId, nomRuta });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "Ya existe una ruta con ese nombre en la empresa." });
    }
    res.status(500).json({ message: "Error del servidor al crear ruta." });
  }
};

const actualizarRuta = async (req, res) => {
  const { id } = req.params;
  const { nomRuta } = req.body;
  const idEmpresa = req.user?.idEmpresa || 1; // Empresa del usuario autenticado

  try {
    // Verificar que la ruta pertenece a la empresa del usuario
    const [rutaExistente] = await pool.query(
      'SELECT idRuta FROM Rutas WHERE idRuta = ? AND idEmpresa = ?',
      [id, idEmpresa]
    );

    if (rutaExistente.length === 0) {
      return res.status(404).json({ message: "Ruta no encontrada o no pertenece a su empresa." });
    }

    await pool.query(
      `UPDATE Rutas SET nomRuta = ? WHERE idRuta = ? AND idEmpresa = ?`,
      [nomRuta, id, idEmpresa]
    );
    res.json({ message: "Ruta actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar ruta:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "Ya existe una ruta con ese nombre en la empresa." });
    }
    res.status(500).json({ message: "Error del servidor al actualizar ruta." });
  }
};

const eliminarRuta = async (req, res) => {
  const { id } = req.params;
  const idEmpresa = req.user?.idEmpresa || 1; // Empresa del usuario autenticado

  try {
    // Verificar que la ruta pertenece a la empresa del usuario
    const [rutaExistente] = await pool.query(
      'SELECT idRuta FROM Rutas WHERE idRuta = ? AND idEmpresa = ?',
      [id, idEmpresa]
    );

    if (rutaExistente.length === 0) {
      return res.status(404).json({ message: "Ruta no encontrada o no pertenece a su empresa." });
    }

    // Verificar que la ruta no tenga viajes asociados
    const [viajesAsociados] = await pool.query(
      'SELECT COUNT(*) as count FROM Viajes WHERE idRuta = ?',
      [id]
    );

    if (viajesAsociados[0].count > 0) {
      return res.status(400).json({
        message: "No se puede eliminar la ruta porque tiene viajes asociados."
      });
    }

    await pool.query(
      `DELETE FROM Rutas WHERE idRuta = ? AND idEmpresa = ?`,
      [id, idEmpresa]
    );
    res.json({ message: "Ruta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    res.status(500).json({ message: "Error del servidor al eliminar ruta." });
  }
};


module.exports = {
  getRutasSelect,
  getRutas,
  crearRuta,
  actualizarRuta,
  eliminarRuta
};
