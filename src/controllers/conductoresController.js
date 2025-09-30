// src/controllers/conductoresController.js
const pool = require("../config/db");
const bcrypt = require('bcryptjs');

// LEER (GET /)
const listarConductores = async (req, res) => {
  try {
    const idEmpresa = req.user?.idEmpresa || 1; // Fallback a empresa 1 si no hay usuario
    // Obtenemos los filtros desde los query params de la URL
    const { estConductor, tipLicConductor, conVehiculo } = req.query;

        let query = `
            SELECT 
                c.idConductor, c.tipLicConductor, c.fecVenLicConductor, c.estConductor,
                u.idUsuario, u.nomUsuario, u.apeUsuario, u.email,
                u.numDocUsuario, u.telUsuario, u.estActivo,
                v.plaVehiculo
            FROM Conductores c
            JOIN Usuarios u ON c.idUsuario = u.idUsuario
            LEFT JOIN Vehiculos v ON c.idConductor = v.idConductorAsignado
            WHERE c.idEmpresa = ?
        `;
        
        const params = [idEmpresa];

        // Construimos la consulta dinámicamente si llegan filtros
        if (estConductor) {
            query += ` AND c.estConductor = ?`;
            params.push(estConductor);
        }
        if (tipLicConductor) {
            query += ` AND c.tipLicConductor = ?`;
            params.push(tipLicConductor);
        }
        if (conVehiculo === 'true') {
            query += ` AND v.plaVehiculo IS NOT NULL`;
        } else if (conVehiculo === 'false') {
            query += ` AND v.plaVehiculo IS NULL`;
        }
        
        query += ` ORDER BY u.nomUsuario ASC;`;

        const [conductores] = await pool.query(query, params);
        res.json(conductores);

    } catch (error) {
        console.error("Error al listar conductores:", error);
        res.status(500).json({ message: "Error del servidor." });
    }
};

// CREAR (POST /)
const crearConductor = async (req, res) => {
    const { nomUsuario, apeUsuario, email, numDocUsuario, telUsuario, tipLicConductor, fecVenLicConductor } = req.body;
    const idEmpresa = req.user.idEmpresa;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [rol] = await connection.query("SELECT idRol FROM Roles WHERE nomRol = 'CONDUCTOR'");
        const passwordHash = await bcrypt.hash('Password123!', 10); // Contraseña por defecto

        const [userResult] = await connection.query(
            `INSERT INTO Usuarios (nomUsuario, apeUsuario, email, numDocUsuario, telUsuario, passwordHash, idRol, idEmpresa, estActivo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [nomUsuario, apeUsuario, email, numDocUsuario, telUsuario, passwordHash, rol[0].idRol, idEmpresa]
        );
        const idUsuario = userResult.insertId;

        const [driverResult] = await connection.query(
            `INSERT INTO Conductores (idUsuario, tipLicConductor, fecVenLicConductor, idEmpresa, estConductor)
             VALUES (?, ?, ?, ?, 'ACTIVO')`,
            [idUsuario, tipLicConductor, fecVenLicConductor, idEmpresa]
        );
        
        await connection.commit();

        // Notificar vía WebSocket después de crear el conductor
        if (global.realTimeService) {
            const notification = {
                type: 'conductor_nuevo',
                title: '👨‍💼 Nuevo Conductor Registrado',
                message: `Se ha registrado el conductor ${nomUsuario} ${apeUsuario}`,
                data: {
                    idConductor: driverResult.insertId,
                    nomConductor: nomUsuario,
                    apeConductor: apeUsuario,
                    idEmpresa: idEmpresa,
                    tipLicConductor: tipLicConductor,
                    fecVenLicConductor: fecVenLicConductor,
                    estConductor: 'ACTIVO'
                },
                priority: 'medium'
            };

            global.realTimeService.sendToEmpresa(idEmpresa, 'conductor:created', notification);
        }

        res.status(201).json({ message: "Conductor creado exitosamente." });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "El correo o documento ya está registrado." });
        res.status(500).json({ message: "Error al crear conductor." });
    } finally {
        connection.release();
    }
};

// ACTUALIZAR (PUT /:idConductor)
const actualizarConductor = async (req, res) => {
    const { idConductor } = req.params;
    const { nomUsuario, apeUsuario, email, numDocUsuario, telUsuario, tipLicConductor, fecVenLicConductor, estConductor } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const [driver] = await connection.query("SELECT idUsuario FROM Conductores WHERE idConductor = ?", [idConductor]);
        if (driver.length === 0) throw new Error("Conductor no encontrado");
        
        await connection.query(
            `UPDATE Usuarios SET nomUsuario = ?, apeUsuario = ?, email = ?, numDocUsuario = ?, telUsuario = ? 
             WHERE idUsuario = ?`,
            [nomUsuario, apeUsuario, email, numDocUsuario, telUsuario, driver[0].idUsuario]
        );

        await connection.query(
            `UPDATE Conductores SET tipLicConductor = ?, fecVenLicConductor = ?, estConductor = ?
             WHERE idConductor = ?`,
            [tipLicConductor, fecVenLicConductor, estConductor, idConductor]
        );

        await connection.commit();
        res.json({ message: "Conductor actualizado." });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "El correo o documento ya pertenece a otro." });
        res.status(500).json({ message: "Error al actualizar conductor." });
    } finally {
        connection.release();
    }
};

// ELIMINAR (DELETE /:idConductor)
const eliminarConductor = async (req, res) => {
    const { idConductor } = req.params;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        const [driver] = await connection.query("SELECT idUsuario FROM Conductores WHERE idConductor = ?", [idConductor]);
        if (driver.length === 0) throw new Error("Conductor no encontrado");

        await connection.query("DELETE FROM Conductores WHERE idConductor = ?", [idConductor]);
        await connection.query("DELETE FROM Usuarios WHERE idUsuario = ?", [driver[0].idUsuario]);
        
        await connection.commit();
        res.json({ message: "Conductor eliminado." });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: "Error al eliminar conductor." });
    } finally {
        connection.release();
    }
};

const getConductoresDisponibles = async (req, res) => {
  try {
    const [conductores] = await pool.query(`
      SELECT
        c.idConductor,
        u.nomUsuario,
        u.apeUsuario,
        c.tipLicConductor,
        c.fecVenLicConductor
      FROM Conductores c
      JOIN Usuarios u ON c.idUsuario = u.idUsuario
      WHERE c.estConductor = 'ACTIVO'
      AND c.idConductor NOT IN (
        SELECT DISTINCT idConductorAsignado
        FROM Vehiculos
        WHERE idConductorAsignado IS NOT NULL
      )
      ORDER BY u.nomUsuario ASC
    `);

    res.json(conductores);
  } catch (error) {
    console.error('Error al obtener conductores disponibles:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

module.exports = {
  listarConductores,
  crearConductor,
  actualizarConductor,
  eliminarConductor,
  getConductoresDisponibles
};