// src/controllers/rutasController.js
const pool = require('../config/db');

// Lista simple de rutas para SELECT
const getRutasSelect = async (req, res) => {
  try {
    const [rutas] = await pool.query(`
      SELECT idRuta, nomRuta
      FROM Rutas
      ORDER BY nomRuta ASC
    `);

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
    const [rutas] = await pool.query(`SELECT * FROM Rutas ORDER BY nomRuta ASC`);
    res.json(rutas);
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    res.status(500).json({ message: "Error del servidor al obtener rutas." });
  }
};

const crearRuta = async (req, res) => {
  const { nomRuta } = req.body;
  if (!nomRuta) return res.status(400).json({ message: "El nombre de la ruta es obligatorio" });

  try {
    const [result] = await pool.query(`INSERT INTO Rutas (nomRuta) VALUES (?)`, [nomRuta]);
    res.status(201).json({ idRuta: result.insertId, nomRuta });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    res.status(500).json({ message: "Error del servidor al crear ruta." });
  }
};

const actualizarRuta = async (req, res) => {
  const { id } = req.params;
  const { nomRuta } = req.body;
  try {
    await pool.query(`UPDATE Rutas SET nomRuta = ? WHERE idRuta = ?`, [nomRuta, id]);
    res.json({ message: "Ruta actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar ruta:", error);
    res.status(500).json({ message: "Error del servidor al actualizar ruta." });
  }
};

const eliminarRuta = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM Rutas WHERE idRuta = ?`, [id]);
    res.json({ message: "Ruta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    res.status(500).json({ message: "Error del servidor al eliminar ruta." });
  }
};

const getParadasRuta = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la ruta existe
    const [ruta] = await pool.query('SELECT * FROM Rutas WHERE idRuta = ?', [id]);
    if (ruta.length === 0) {
      return res.status(404).json({ message: 'Ruta no encontrada.' });
    }

    // Por ahora retornar array vacío ya que no hay tabla de paradas
    // En el futuro se puede implementar con coordenadas de la ruta
    res.json([]);

  } catch (error) {
    console.error('Error al obtener paradas de ruta:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

module.exports = {
  getRutasSelect,
  getRutas,
  crearRuta,
  actualizarRuta,
  eliminarRuta,
  getParadasRuta
};
