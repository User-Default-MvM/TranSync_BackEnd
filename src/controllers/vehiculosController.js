// src/controllers/vehiculosController.js

const pool = require('../config/db');

// Obtener todos los vehículos con información de conductores
const getVehiculos = async (req, res) => {
    try {
        const {
            estado,
            idEmpresa = req.user?.idEmpresa || 1, // Por defecto empresa 1 o del usuario autenticado
            page = 1,
            limit = 100,
            search = ''
        } = req.query;

        let query = `
            SELECT 
                v.idVehiculo,
                v.numVehiculo,
                v.plaVehiculo,
                v.marVehiculo,
                v.modVehiculo,
                v.anioVehiculo,
                v.fecVenSOAT,
                v.fecVenTec,
                v.estVehiculo,
                v.fecCreVehiculo,
                v.fecUltModVehiculo,
                c.idConductor,
                u.nomUsuario as nomConductor,
                u.apeUsuario as apeConductor,
                u.numDocUsuario as numDocConductor,
                u.telUsuario as telConductor,
                e.nomEmpresa
            FROM Vehiculos v
            LEFT JOIN Conductores c ON v.idConductorAsignado = c.idConductor
            LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
            LEFT JOIN Empresas e ON v.idEmpresa = e.idEmpresa
            WHERE v.idEmpresa = ?
        `;
        
        const queryParams = [idEmpresa];

        // Filtro por estado si se proporciona
        if (estado && estado !== 'all') {
            query += ` AND v.estVehiculo = ?`;
            queryParams.push(estado);
        }

        // Filtro de búsqueda
        if (search) {
            query += ` AND (v.plaVehiculo LIKE ? OR v.marVehiculo LIKE ? OR v.modVehiculo LIKE ? OR CONCAT(u.nomUsuario, ' ', u.apeUsuario) LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        query += ` ORDER BY v.plaVehiculo`;

        // Paginación
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [vehiculos] = await pool.query(query, queryParams);

        // Formatear los datos para incluir información del conductor si existe
        const vehiculosFormateados = vehiculos.map(vehiculo => ({
            ...vehiculo,
            conductor: vehiculo.idConductor ? {
                idConductor: vehiculo.idConductor,
                nombre: `${vehiculo.nomConductor} ${vehiculo.apeConductor}`,
                documento: vehiculo.numDocConductor,
                telefono: vehiculo.telConductor
            } : null,
            // Calcular días hasta vencimientos
            diasVencimientoSOAT: vehiculo.fecVenSOAT ? 
                Math.ceil((new Date(vehiculo.fecVenSOAT) - new Date()) / (1000 * 60 * 60 * 24)) : null,
            diasVencimientoTec: vehiculo.fecVenTec ? 
                Math.ceil((new Date(vehiculo.fecVenTec) - new Date()) / (1000 * 60 * 60 * 24)) : null
        }));

        // Obtener el total para paginación
        let countQuery = `
            SELECT COUNT(*) as total FROM Vehiculos v
            LEFT JOIN Conductores c ON v.idConductorAsignado = c.idConductor
            WHERE v.idEmpresa = ?
        `;
        let countParams = [idEmpresa];

        if (estado && estado !== 'all') {
            countQuery += ` AND v.estVehiculo = ?`;
            countParams.push(estado);
        }

        if (search) {
            countQuery += ` AND (v.plaVehiculo LIKE ? OR v.marVehiculo LIKE ? OR v.modVehiculo LIKE ? OR CONCAT(u.nomUsuario, ' ', u.apeUsuario) LIKE ?)`;
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        const [totalResult] = await pool.query(countQuery, countParams);
        const total = totalResult[0].total;

        res.json({
            vehiculos: vehiculosFormateados,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener vehículos:', error);
        res.status(500).json({ message: 'Error del servidor al obtener vehículos.' });
    }
};

// Obtener vehículo por ID
const getVehiculoById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT 
                v.*,
                c.idConductor,
                u.nomUsuario as nomConductor,
                u.apeUsuario as apeConductor,
                u.numDocUsuario as numDocConductor,
                u.telUsuario as telConductor,
                e.nomEmpresa
            FROM Vehiculos v
            LEFT JOIN Conductores c ON v.idConductorAsignado = c.idConductor
            LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
            LEFT JOIN Empresas e ON v.idEmpresa = e.idEmpresa
            WHERE v.idVehiculo = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        const vehiculo = {
            ...rows[0],
            conductor: rows[0].idConductor ? {
                idConductor: rows[0].idConductor,
                nombre: `${rows[0].nomConductor} ${rows[0].apeConductor}`,
                documento: rows[0].numDocConductor,
                telefono: rows[0].telConductor
            } : null,
            // Calcular días hasta vencimientos
            diasVencimientoSOAT: rows[0].fecVenSOAT ? 
                Math.ceil((new Date(rows[0].fecVenSOAT) - new Date()) / (1000 * 60 * 60 * 24)) : null,
            diasVencimientoTec: rows[0].fecVenTec ? 
                Math.ceil((new Date(rows[0].fecVenTec) - new Date()) / (1000 * 60 * 60 * 24)) : null
        };

        res.json({ vehiculo });
    } catch (error) {
        console.error('Error al obtener vehículo:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Crear nuevo vehículo
const crearVehiculo = async (req, res) => {
    const {
        numVehiculo,
        plaVehiculo,
        marVehiculo,
        modVehiculo,
        anioVehiculo,
        fecVenSOAT,
        fecVenTec,
        estVehiculo = 'DISPONIBLE',
        idEmpresa = req.user?.idEmpresa || 1,
        idConductorAsignado = null
    } = req.body;

    // Validaciones básicas
    if (!numVehiculo || !plaVehiculo || !marVehiculo || !modVehiculo || !anioVehiculo || !fecVenSOAT || !fecVenTec) {
        return res.status(400).json({ 
            message: 'Número interno, placa, marca, modelo, año, fecha de vencimiento SOAT y fecha de vencimiento técnica son requeridos.' 
        });
    }

    // Validar estado
    const validStates = ['DISPONIBLE', 'EN_RUTA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
    if (!validStates.includes(estVehiculo)) {
        return res.status(400).json({ message: 'Estado de vehículo inválido.' });
    }

    // Validar año
    const currentYear = new Date().getFullYear();
    if (anioVehiculo < 1950 || anioVehiculo > currentYear + 1) {
        return res.status(400).json({ 
            message: `El año debe estar entre 1950 y ${currentYear + 1}` 
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar que no exista vehículo con la misma placa
        const [existingPlaca] = await connection.query(
            'SELECT idVehiculo FROM Vehiculos WHERE plaVehiculo = ?',
            [plaVehiculo.trim().toUpperCase()]
        );

        if (existingPlaca.length > 0) {
            await connection.rollback();
            return res.status(409).json({ 
                message: 'Ya existe un vehículo con esa placa.' 
            });
        }

        // Verificar que no exista vehículo con el mismo número interno en la empresa
        const [existingNum] = await connection.query(
            'SELECT idVehiculo FROM Vehiculos WHERE idEmpresa = ? AND numVehiculo = ?',
            [idEmpresa, numVehiculo.trim()]
        );

        if (existingNum.length > 0) {
            await connection.rollback();
            return res.status(409).json({ 
                message: 'Ya existe un vehículo con ese número interno en la empresa.' 
            });
        }

        // Validar fechas de vencimiento
        const fechaSOAT = new Date(fecVenSOAT);
        const fechaTec = new Date(fecVenTec);
        const hoy = new Date();
        
        if (fechaSOAT <= hoy) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'La fecha de vencimiento del SOAT debe ser futura.' 
            });
        }

        if (fechaTec <= hoy) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'La fecha de vencimiento de la revisión técnica debe ser futura.' 
            });
        }

        // Si se asigna conductor, verificar que existe y está disponible
        if (idConductorAsignado) {
            const [conductor] = await connection.query(
                'SELECT * FROM Conductores WHERE idConductor = ? AND estConductor = "ACTIVO"',
                [idConductorAsignado]
            );

            if (conductor.length === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: 'El conductor especificado no existe o no está activo.' 
                });
            }

            // Verificar que el conductor no tenga otro vehículo asignado
            const [vehiculoAsignado] = await connection.query(
                'SELECT idVehiculo FROM Vehiculos WHERE idConductorAsignado = ?',
                [idConductorAsignado]
            );

            if (vehiculoAsignado.length > 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    message: 'El conductor ya tiene un vehículo asignado.' 
                });
            }
        }

        // Insertar vehículo
        const [result] = await connection.query(`
            INSERT INTO Vehiculos (
                numVehiculo, plaVehiculo, marVehiculo, modVehiculo, 
                anioVehiculo, fecVenSOAT, fecVenTec, estVehiculo, 
                idEmpresa, idConductorAsignado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            numVehiculo.trim(),
            plaVehiculo.trim().toUpperCase(),
            marVehiculo.trim(),
            modVehiculo.trim(),
            anioVehiculo,
            fecVenSOAT,
            fecVenTec,
            estVehiculo,
            idEmpresa,
            idConductorAsignado
        ]);

        await connection.commit();

        res.status(201).json({
            message: 'Vehículo creado exitosamente.',
            vehiculoId: result.insertId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear vehículo:', error);
        res.status(500).json({ message: 'Error del servidor al crear vehículo.' });
    } finally {
        connection.release();
    }
};

// Actualizar vehículo
const actualizarVehiculo = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        // Verificar que el vehículo existe
        const [existingVehiculo] = await pool.query(
            'SELECT * FROM Vehiculos WHERE idVehiculo = ?',
            [id]
        );

        if (existingVehiculo.length === 0) {
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        // Validaciones específicas
        if (updateData.plaVehiculo && updateData.plaVehiculo.trim().length < 6) {
            return res.status(400).json({ message: 'La placa debe tener al menos 6 caracteres.' });
        }

        if (updateData.anioVehiculo) {
            const currentYear = new Date().getFullYear();
            if (updateData.anioVehiculo < 1950 || updateData.anioVehiculo > currentYear + 1) {
                return res.status(400).json({ 
                    message: `El año debe estar entre 1950 y ${currentYear + 1}` 
                });
            }
        }

        if (updateData.estVehiculo) {
            const validStates = ['DISPONIBLE', 'EN_RUTA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
            if (!validStates.includes(updateData.estVehiculo)) {
                return res.status(400).json({ message: 'Estado de vehículo inválido.' });
            }
        }

        // Verificar unicidad de placa si se actualiza
        if (updateData.plaVehiculo) {
            const [placaDuplicada] = await pool.query(
                'SELECT idVehiculo FROM Vehiculos WHERE plaVehiculo = ? AND idVehiculo != ?',
                [updateData.plaVehiculo.trim().toUpperCase(), id]
            );

            if (placaDuplicada.length > 0) {
                return res.status(409).json({ 
                    message: 'Ya existe otro vehículo con esa placa.' 
                });
            }
        }

        // Verificar unicidad del número interno si se actualiza
        if (updateData.numVehiculo) {
            const [numDuplicado] = await pool.query(
                'SELECT idVehiculo FROM Vehiculos WHERE idEmpresa = ? AND numVehiculo = ? AND idVehiculo != ?',
                [existingVehiculo[0].idEmpresa, updateData.numVehiculo.trim(), id]
            );

            if (numDuplicado.length > 0) {
                return res.status(409).json({ 
                    message: 'Ya existe otro vehículo con ese número interno en la empresa.' 
                });
            }
        }

        // Construir query de actualización dinámicamente
        const fieldsToUpdate = [];
        const values = [];

        Object.keys(updateData).forEach(field => {
            if (updateData[field] !== undefined && updateData[field] !== null) {
                fieldsToUpdate.push(`${field} = ?`);
                if (field === 'plaVehiculo') {
                    values.push(updateData[field].trim().toUpperCase());
                } else if (typeof updateData[field] === 'string') {
                    values.push(updateData[field].trim());
                } else {
                    values.push(updateData[field]);
                }
            }
        });

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        values.push(id);

        const query = `UPDATE Vehiculos SET ${fieldsToUpdate.join(', ')} WHERE idVehiculo = ?`;
        
        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No se pudo actualizar el vehículo.' });
        }

        res.json({ message: 'Vehículo actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar vehículo:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar vehículo.' });
    }
};

// Eliminar vehículo
const eliminarVehiculo = async (req, res) => {
    const { id } = req.params;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar que el vehículo existe
        const [vehiculo] = await connection.query(
            'SELECT * FROM Vehiculos WHERE idVehiculo = ?',
            [id]
        );

        if (vehiculo.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        // Verificar si tiene viajes programados o en curso
        const [viajesActivos] = await connection.query(
            'SELECT COUNT(*) as count FROM Viajes WHERE idVehiculo = ? AND estViaje IN ("PROGRAMADO", "EN_CURSO")',
            [id]
        );

        if (viajesActivos[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'No se puede eliminar el vehículo porque tiene viajes programados o en curso.' 
            });
        }

        // Eliminar vehículo (esto también actualizará registros relacionados por CASCADE/SET NULL)
        await connection.query('DELETE FROM Vehiculos WHERE idVehiculo = ?', [id]);

        await connection.commit();

        res.json({ message: 'Vehículo eliminado exitosamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar vehículo:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar vehículo.' });
    } finally {
        connection.release();
    }
};

// Cambiar estado de vehículo
const cambiarEstadoVehiculo = async (req, res) => {
    const { id } = req.params;
    const { estVehiculo } = req.body;

    if (!estVehiculo) {
        return res.status(400).json({ message: 'Estado del vehículo es requerido.' });
    }

    const validStates = ['DISPONIBLE', 'EN_RUTA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'];
    if (!validStates.includes(estVehiculo)) {
        return res.status(400).json({ message: 'Estado inválido.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE Vehiculos SET estVehiculo = ? WHERE idVehiculo = ?',
            [estVehiculo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        res.json({ message: 'Estado del vehículo actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al cambiar estado del vehículo:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Asignar conductor a vehículo
const asignarConductorVehiculo = async (req, res) => {
    const { id } = req.params;
    const { idConductor } = req.body;

    if (!idConductor) {
        return res.status(400).json({ message: 'ID del conductor es requerido.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar que el vehículo existe y no tiene conductor
        const [vehiculo] = await connection.query(
            'SELECT * FROM Vehiculos WHERE idVehiculo = ?',
            [id]
        );

        if (vehiculo.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        // Verificar que el conductor existe y está activo
        const [conductor] = await connection.query(
            'SELECT * FROM Conductores WHERE idConductor = ? AND estConductor = "ACTIVO"',
            [idConductor]
        );

        if (conductor.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                message: 'Conductor no encontrado o no está activo.' 
            });
        }

        // Verificar que el conductor no tenga otro vehículo asignado
        const [vehiculoAsignado] = await connection.query(
            'SELECT idVehiculo FROM Vehiculos WHERE idConductorAsignado = ?',
            [idConductor]
        );

        if (vehiculoAsignado.length > 0 && vehiculoAsignado[0].idVehiculo != id) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'El conductor ya tiene otro vehículo asignado.' 
            });
        }

        // Asignar el conductor al vehículo
        await connection.query(
            'UPDATE Vehiculos SET idConductorAsignado = ? WHERE idVehiculo = ?',
            [idConductor, id]
        );

        await connection.commit();

        res.json({ message: 'Conductor asignado al vehículo exitosamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al asignar conductor:', error);
        res.status(500).json({ message: 'Error del servidor al asignar conductor.' });
    } finally {
        connection.release();
    }
};

// Desasignar conductor de vehículo
const desasignarConductorVehiculo = async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar que el vehículo existe
        const [vehiculo] = await pool.query(
            'SELECT * FROM Vehiculos WHERE idVehiculo = ?',
            [id]
        );

        if (vehiculo.length === 0) {
            return res.status(404).json({ message: 'Vehículo no encontrado.' });
        }

        // Desasignar conductor
        const [result] = await pool.query(
            'UPDATE Vehiculos SET idConductorAsignado = NULL WHERE idVehiculo = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'No se pudo desasignar el conductor.' 
            });
        }

        res.json({ message: 'Conductor desasignado del vehículo exitosamente.' });

    } catch (error) {
        console.error('Error al desasignar conductor:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Obtener estadísticas de vehículos
const getEstadisticasVehiculos = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estVehiculo = 'DISPONIBLE' THEN 1 ELSE 0 END) as disponibles,
                SUM(CASE WHEN estVehiculo = 'EN_RUTA' THEN 1 ELSE 0 END) as enRuta,
                SUM(CASE WHEN estVehiculo = 'EN_MANTENIMIENTO' THEN 1 ELSE 0 END) as enMantenimiento,
                SUM(CASE WHEN estVehiculo = 'FUERA_DE_SERVICIO' THEN 1 ELSE 0 END) as fueraDeServicio,
                SUM(CASE WHEN idConductorAsignado IS NOT NULL THEN 1 ELSE 0 END) as conConductorAsignado,
                SUM(CASE WHEN idConductorAsignado IS NULL THEN 1 ELSE 0 END) as sinConductorAsignado
            FROM Vehiculos
            WHERE idEmpresa = ?
        `, [req.user?.idEmpresa || 1]); // Empresa del usuario autenticado o 1 por defecto

        res.json({ estadisticas: stats[0] });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Verificar vencimientos de documentos
const verificarVencimientosVehiculos = async (req, res) => {
    const { dias = 30 } = req.query;

    try {
        const [vehiculos] = await pool.query(`
            SELECT 
                v.idVehiculo,
                v.numVehiculo,
                v.plaVehiculo,
                v.marVehiculo,
                v.modVehiculo,
                v.fecVenSOAT,
                v.fecVenTec,
                DATEDIFF(v.fecVenSOAT, CURDATE()) as diasSOAT,
                DATEDIFF(v.fecVenTec, CURDATE()) as diasTecnica,
                u.nomUsuario as nomConductor,
                u.apeUsuario as apeConductor
            FROM Vehiculos v
            LEFT JOIN Conductores c ON v.idConductorAsignado = c.idConductor
            LEFT JOIN Usuarios u ON c.idUsuario = u.idUsuario
            WHERE (
                v.fecVenSOAT <= DATE_ADD(CURDATE(), INTERVAL ? DAY) OR
                v.fecVenTec <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
            )
            AND v.estVehiculo != 'FUERA_DE_SERVICIO'
            ORDER BY 
                LEAST(DATEDIFF(v.fecVenSOAT, CURDATE()), DATEDIFF(v.fecVenTec, CURDATE())) ASC
        `, [parseInt(dias), parseInt(dias)]);

        res.json({ 
            vehiculosConVencimientos: vehiculos,
            totalVehiculos: vehiculos.length,
            diasAnticipacion: parseInt(dias)
        });

    } catch (error) {
        console.error('Error al verificar vencimientos:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Obtener lista simple de vehículos para selects
const getVehiculosSelect = async (req, res) => {
    try {
        const { idEmpresa = req.user?.idEmpresa || 1 } = req.query;

        const [vehiculos] = await pool.query(
            `SELECT 
                idVehiculo, 
                plaVehiculo, 
                modVehiculo,
                marVehiculo,
                numVehiculo 
             FROM Vehiculos 
             WHERE idEmpresa = ? AND estVehiculo IN ('DISPONIBLE', 'EN_MANTENIMIENTO')
             ORDER BY plaVehiculo ASC`,
            [idEmpresa]
        );

        // Formatear exactamente como lo espera el frontend React
        const vehiculosFormateados = vehiculos.map(v => ({
            idVehiculo: v.idVehiculo,
            placaVehiculo: v.plaVehiculo,           // Nombre que espera React
            modeloVehiculo: `${v.marVehiculo} ${v.modVehiculo}`, // Marca + Modelo
            numeroInterno: v.numVehiculo            // Por si lo necesitas
        }));

        res.json(vehiculosFormateados);
        
    } catch (error) {
        console.error('Error al obtener lista de vehículos para select:', error);
        res.status(500).json({ message: 'Error del servidor al obtener vehículos.' });
    }
};

module.exports = {
    getVehiculos,
    getVehiculoById,
    crearVehiculo,
    actualizarVehiculo,
    eliminarVehiculo,
    cambiarEstadoVehiculo,
    asignarConductorVehiculo,
    desasignarConductorVehiculo,
    getEstadisticasVehiculos,
    verificarVencimientosVehiculos,
    getVehiculosSelect   // <-- Función actualizada para el select
};