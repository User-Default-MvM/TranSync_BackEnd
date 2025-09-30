const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener todos los viajes con información relacionada
router.get("/", async (req, res) => {
  try {
    console.log("📌 Entrando a GET /api/viajes");
    
    // Query con JOINs para obtener información completa
    const [rows] = await pool.query(`
      SELECT
        v.*,
        veh.plaVehiculo,
        veh.marVehiculo,
        veh.modVehiculo,
        veh.numVehiculo,
        u.nomUsuario as nomConductor,
        u.apeUsuario as apeConductor,
        u.numDocUsuario as numDocConductor,
        r.nomRuta,
        r.oriRuta,
        r.desRuta
      FROM Viajes v
      LEFT JOIN Vehiculos veh ON v.idVehiculo = veh.idVehiculo
      LEFT JOIN Conductores c ON v.idConductor = c.idConductor
      LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
      LEFT JOIN Rutas r ON v.idRuta = r.idRuta
      ORDER BY v.fecHorSalViaje DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en GET /api/viajes:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Obtener un viaje específico
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📌 Entrando a GET /api/viajes/:id con ID:", id);
    
    const [rows] = await pool.query(`
      SELECT
        v.*,
        veh.plaVehiculo,
        veh.marVehiculo,
        veh.modVehiculo,
        veh.numVehiculo,
        u.nomUsuario as nomConductor,
        u.apeUsuario as apeConductor,
        u.numDocUsuario as numDocConductor,
        r.nomRuta,
        r.oriRuta,
        r.desRuta
      FROM Viajes v
      LEFT JOIN Vehiculos veh ON v.idVehiculo = veh.idVehiculo
      LEFT JOIN Conductores c ON v.idConductor = c.idConductor
      LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
      LEFT JOIN Rutas r ON v.idRuta = r.idRuta
      WHERE v.idViaje = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error en GET /api/viajes/:id:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Crear un viaje
router.post("/", async (req, res) => {
  try {
    console.log("📌 Datos recibidos en POST /api/viajes:", req.body);
    
    const { 
      idVehiculo, 
      idConductor, 
      idRuta, 
      fecHorSalViaje, 
      fecHorLleViaje, 
      estViaje, 
      obsViaje 
    } = req.body;

    // Validaciones básicas
    if (!idVehiculo || !idConductor || !idRuta || !fecHorSalViaje) {
      return res.status(400).json({ 
        message: "Campos requeridos: idVehiculo, idConductor, idRuta, fecHorSalViaje" 
      });
    }

    // Verificar que el vehículo existe y está disponible
    const [vehiculo] = await pool.query(
      "SELECT * FROM Vehiculos WHERE idVehiculo = ? AND estVehiculo IN ('DISPONIBLE', 'EN_MANTENIMIENTO')",
      [idVehiculo]
    );
    
    if (vehiculo.length === 0) {
      return res.status(400).json({ 
        message: "El vehículo no existe o no está disponible" 
      });
    }

    // Verificar que el conductor existe y está activo
    const [conductor] = await pool.query(
      "SELECT * FROM Conductores WHERE idConductor = ? AND estConductor = 'ACTIVO'",
      [idConductor]
    );
    
    if (conductor.length === 0) {
      return res.status(400).json({ 
        message: "El conductor no existe o no está activo" 
      });
    }

    // Verificar que la ruta existe
    const [ruta] = await pool.query(
      "SELECT * FROM Rutas WHERE idRuta = ?",
      [idRuta]
    );
    
    if (ruta.length === 0) {
      return res.status(400).json({ 
        message: "La ruta especificada no existe" 
      });
    }

    // Insertar el viaje
    const [result] = await pool.query(`
      INSERT INTO Viajes (
        idVehiculo, 
        idConductor, 
        idRuta, 
        fecHorSalViaje, 
        fecHorLleViaje, 
        estViaje, 
        obsViaje
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      idVehiculo, 
      idConductor, 
      idRuta, 
      fecHorSalViaje, 
      fecHorLleViaje || null, 
      estViaje || 'PROGRAMADO', 
      obsViaje || null
    ]);

    // Si el viaje se programa, actualizar estado del vehículo
    if (estViaje === 'PROGRAMADO' || !estViaje) {
      await pool.query(
        "UPDATE Vehiculos SET estVehiculo = 'EN_RUTA' WHERE idVehiculo = ?",
        [idVehiculo]
      );
    }

    console.log("✅ Viaje creado exitosamente con ID:", result.insertId);

    res.status(201).json({ 
      idViaje: result.insertId, 
      message: "Viaje creado exitosamente",
      ...req.body 
    });
    
  } catch (error) {
    console.error("❌ Error en POST /api/viajes:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Actualizar un viaje
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📌 Actualizando viaje ID:", id, "con datos:", req.body);
    
    const { 
      idVehiculo, 
      idConductor, 
      idRuta, 
      fecHorSalViaje, 
      fecHorLleViaje, 
      estViaje, 
      obsViaje 
    } = req.body;

    // Verificar que el viaje existe
    const [viajeExistente] = await pool.query("SELECT * FROM Viajes WHERE idViaje = ?", [id]);
    
    if (viajeExistente.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    // Validar datos si se proporcionan
    if (idVehiculo) {
      const [vehiculo] = await pool.query(
        "SELECT * FROM Vehiculos WHERE idVehiculo = ?", 
        [idVehiculo]
      );
      if (vehiculo.length === 0) {
        return res.status(400).json({ message: "El vehículo especificado no existe" });
      }
    }

    if (idConductor) {
      const [conductor] = await pool.query(
        "SELECT * FROM Conductores WHERE idConductor = ?", 
        [idConductor]
      );
      if (conductor.length === 0) {
        return res.status(400).json({ message: "El conductor especificado no existe" });
      }
    }

    if (idRuta) {
      const [ruta] = await pool.query("SELECT * FROM Rutas WHERE idRuta = ?", [idRuta]);
      if (ruta.length === 0) {
        return res.status(400).json({ message: "La ruta especificada no existe" });
      }
    }

    // Construir query de actualización dinámicamente
    const fieldsToUpdate = [];
    const values = [];

    if (idVehiculo !== undefined) {
      fieldsToUpdate.push("idVehiculo = ?");
      values.push(idVehiculo);
    }
    if (idConductor !== undefined) {
      fieldsToUpdate.push("idConductor = ?");
      values.push(idConductor);
    }
    if (idRuta !== undefined) {
      fieldsToUpdate.push("idRuta = ?");
      values.push(idRuta);
    }
    if (fecHorSalViaje !== undefined) {
      fieldsToUpdate.push("fecHorSalViaje = ?");
      values.push(fecHorSalViaje);
    }
    if (fecHorLleViaje !== undefined) {
      fieldsToUpdate.push("fecHorLleViaje = ?");
      values.push(fecHorLleViaje);
    }
    if (estViaje !== undefined) {
      fieldsToUpdate.push("estViaje = ?");
      values.push(estViaje);
    }
    if (obsViaje !== undefined) {
      fieldsToUpdate.push("obsViaje = ?");
      values.push(obsViaje);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: "No se proporcionaron campos para actualizar" });
    }

    values.push(id);

    const query = `UPDATE Viajes SET ${fieldsToUpdate.join(", ")} WHERE idViaje = ?`;
    
    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No se pudo actualizar el viaje" });
    }

    console.log("✅ Viaje actualizado exitosamente");
    res.json({ message: "Viaje actualizado exitosamente" });
    
  } catch (error) {
    console.error("❌ Error en PUT /api/viajes:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Eliminar un viaje
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("📌 Eliminando viaje ID:", id);
    
    // Verificar que el viaje existe
    const [viajeExistente] = await pool.query("SELECT * FROM Viajes WHERE idViaje = ?", [id]);
    
    if (viajeExistente.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    // Si el viaje está en curso, no permitir eliminación
    if (viajeExistente[0].estViaje === 'EN_CURSO') {
      return res.status(400).json({ 
        message: "No se puede eliminar un viaje que está en curso" 
      });
    }

    // Liberar el vehículo si el viaje estaba programado
    if (viajeExistente[0].estViaje === 'PROGRAMADO') {
      await pool.query(
        "UPDATE Vehiculos SET estVehiculo = 'DISPONIBLE' WHERE idVehiculo = ?",
        [viajeExistente[0].idVehiculo]
      );
    }

    // Eliminar el viaje
    const [result] = await pool.query("DELETE FROM Viajes WHERE idViaje = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No se pudo eliminar el viaje" });
    }

    console.log("✅ Viaje eliminado exitosamente");
    res.json({ message: "Viaje eliminado exitosamente" });
    
  } catch (error) {
    console.error("❌ Error en DELETE /api/viajes:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

// Cambiar estado de un viaje
router.patch("/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estViaje } = req.body;
    
    if (!estViaje) {
      return res.status(400).json({ message: "Estado del viaje es requerido" });
    }

    const validStates = ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO'];
    if (!validStates.includes(estViaje)) {
      return res.status(400).json({ message: "Estado de viaje inválido" });
    }

    // Obtener información del viaje
    const [viaje] = await pool.query("SELECT * FROM Viajes WHERE idViaje = ?", [id]);
    
    if (viaje.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    // Actualizar estado del viaje
    const [result] = await pool.query(
      "UPDATE Viajes SET estViaje = ? WHERE idViaje = ?",
      [estViaje, id]
    );

    // Actualizar estado del vehículo según el estado del viaje
    let estadoVehiculo;
    switch (estViaje) {
      case 'PROGRAMADO':
      case 'EN_CURSO':
        estadoVehiculo = 'EN_RUTA';
        break;
      case 'FINALIZADO':
      case 'CANCELADO':
        estadoVehiculo = 'DISPONIBLE';
        break;
    }

    if (estadoVehiculo) {
      await pool.query(
        "UPDATE Vehiculos SET estVehiculo = ? WHERE idVehiculo = ?",
        [estadoVehiculo, viaje[0].idVehiculo]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No se pudo actualizar el estado" });
    }

    res.json({ message: "Estado del viaje actualizado exitosamente" });
    
  } catch (error) {
    console.error("❌ Error en PATCH /api/viajes/:id/estado:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

module.exports = router;