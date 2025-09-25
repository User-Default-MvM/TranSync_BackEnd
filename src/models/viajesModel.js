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
  }
};

module.exports = Viajes;
