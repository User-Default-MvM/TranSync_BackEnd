const db = require('../config/db');

const Viajes = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT v.idViaje, v.fecHorSalViaje, v.fecHorLleViaje, v.estViaje, v.obsViaje,
             ve.plaVehiculo, CONCAT(u.nomUsuario, ' ', u.apeUsuario) as nombreConductor, r.nomRuta
      FROM Viajes v
      INNER JOIN Vehiculos ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Conductores c ON v.idConductor = c.idConductor
      LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
      INNER JOIN Rutas r ON v.idRuta = r.idRuta
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM Viajes WHERE idViaje = ?', [id]);
    return rows[0];
  },

  create: async (data) => {
    const { idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje } = data;

    // Verificar si ya existe un viaje duplicado antes de insertar
    const [existing] = await db.query(
      `SELECT idViaje FROM Viajes
       WHERE idVehiculo = ? AND idConductor = ? AND idRuta = ?
       AND DATE(fecHorSalViaje) = DATE(?)
       AND HOUR(fecHorSalViaje) = HOUR(?)
       AND MINUTE(fecHorSalViaje) = MINUTE(?)`,
      [idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorSalViaje, fecHorSalViaje]
    );

    if (existing.length > 0) {
      throw new Error('Ya existe un viaje programado con los mismos datos (vehículo, conductor, ruta y horario)');
    }

    const [result] = await db.query(
      'INSERT INTO Viajes (idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje]
    );
    return { idViaje: result.insertId, ...data };
  },

  update: async (id, data) => {
    const { idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje } = data;
    await db.query(
      'UPDATE Viajes SET idVehiculo=?, idConductor=?, idRuta=?, fecHorSalViaje=?, fecHorLleViaje=?, estViaje=?, obsViaje=? WHERE idViaje=?',
      [idVehiculo, idConductor, idRuta, fecHorSalViaje, fecHorLleViaje, estViaje, obsViaje, id]
    );
    return { idViaje: id, ...data };
  },

  delete: async (id) => {
    await db.query('DELETE FROM Viajes WHERE idViaje=?', [id]);
    return { message: 'Viaje eliminado correctamente' };
  },

  // Método para limpiar viajes duplicados
  limpiarDuplicados: async () => {
    const [result] = await db.query(`
      DELETE v1 FROM Viajes v1
      INNER JOIN Viajes v2
      WHERE v1.idViaje > v2.idViaje
      AND v1.idVehiculo = v2.idVehiculo
      AND v1.idConductor = v2.idConductor
      AND v1.idRuta = v2.idRuta
      AND DATE(v1.fecHorSalViaje) = DATE(v2.fecHorSalViaje)
      AND HOUR(v1.fecHorSalViaje) = HOUR(v2.fecHorSalViaje)
      AND MINUTE(v1.fecHorSalViaje) = MINUTE(v2.fecHorSalViaje)
    `);
    return { eliminados: result.affectedRows };
  },

  // Método para obtener viajes sin duplicados
  getAllSinDuplicados: async () => {
    const [rows] = await db.query(`
      SELECT DISTINCT
        v.idViaje, v.fecHorSalViaje, v.fecHorLleViaje, v.estViaje, v.obsViaje,
        ve.plaVehiculo, CONCAT(u.nomUsuario, ' ', u.apeUsuario) as nombreConductor, r.nomRuta
      FROM Viajes v
      INNER JOIN Vehiculos ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Conductores c ON v.idConductor = c.idConductor
      LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
      INNER JOIN Rutas r ON v.idRuta = r.idRuta
      GROUP BY v.idVehiculo, v.idConductor, v.idRuta, DATE(v.fecHorSalViaje), HOUR(v.fecHorSalViaje), MINUTE(v.fecHorSalViaje)
      ORDER BY v.fecHorSalViaje DESC
    `);
    return rows;
  }
};

module.exports = Viajes;
