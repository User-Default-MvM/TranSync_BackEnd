// src/models/PuntoInteres.js

const pool = require('../config/db');

/**
 * Modelo para gestionar puntos de interés (paradas, terminales, etc.)
 */
class PuntoInteres {

    /**
     * Crear nuevo punto de interés
     */
    static async crear(data) {
        try {
            const {
                nombrePoi,
                tipoPoi,
                latitud,
                longitud,
                descripcion,
                horarioApertura,
                horarioCierre,
                telefono,
                sitioWeb,
                idRutaAsociada,
                datosAdicionales
            } = data;

            const [result] = await pool.query(`
                INSERT INTO puntos_interes
                (nombrePoi, tipoPoi, latitud, longitud, descripcion, horarioApertura, horarioCierre,
                 telefono, sitioWeb, idRutaAsociada, datosAdicionales)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [nombrePoi, tipoPoi, latitud, longitud, descripcion, horarioApertura, horarioCierre,
                telefono, sitioWeb, idRutaAsociada, datosAdicionales]);

            return result.insertId;
        } catch (error) {
            console.error('Error creando punto de interés:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de interés cercanos a coordenadas
     */
    static async obtenerCercanos(latitud, longitud, radioKm = 5, tipos = null) {
        try {
            let query = `
                SELECT *,
                calcular_distancia_haversine(latitud, longitud, ?, ?) as distancia_km
                FROM puntos_interes
                WHERE calcular_distancia_haversine(latitud, longitud, ?, ?) <= ?
            `;
            let params = [latitud, longitud, latitud, longitud, radioKm];

            if (tipos && tipos.length > 0) {
                const placeholders = tipos.map(() => '?').join(',');
                query += ` AND tipoPoi IN (${placeholders})`;
                params.push(...tipos);
            }

            query += ' ORDER BY distancia_km ASC';

            const [puntos] = await pool.query(query, params);
            return puntos;
        } catch (error) {
            console.error('Error obteniendo puntos cercanos:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de interés por ruta
     */
    static async obtenerPorRuta(idRuta) {
        try {
            const [puntos] = await pool.query(`
                SELECT * FROM puntos_interes
                WHERE idRutaAsociada = ?
                ORDER BY nombrePoi ASC
            `, [idRuta]);

            return puntos;
        } catch (error) {
            console.error('Error obteniendo puntos por ruta:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de interés por tipo
     */
    static async obtenerPorTipo(tipoPoi) {
        try {
            const [puntos] = await pool.query(`
                SELECT * FROM puntos_interes
                WHERE tipoPoi = ?
                ORDER BY nombrePoi ASC
            `, [tipoPoi]);

            return puntos;
        } catch (error) {
            console.error('Error obteniendo puntos por tipo:', error);
            throw error;
        }
    }

    /**
     * Buscar puntos de interés por nombre o descripción
     */
    static async buscar(termino, opciones = {}) {
        try {
            const { limite = 50, tipoPoi } = opciones;

            let query = `
                SELECT *,
                MATCH(nombrePoi, descripcion) AGAINST(? IN NATURAL LANGUAGE MODE) as relevancia
                FROM puntos_interes
                WHERE MATCH(nombrePoi, descripcion) AGAINST(? IN NATURAL LANGUAGE MODE)
            `;
            let params = [termino, termino];

            if (tipoPoi) {
                query += ' AND tipoPoi = ?';
                params.push(tipoPoi);
            }

            query += ' ORDER BY relevancia DESC LIMIT ?';
            params.push(limite);

            const [puntos] = await pool.query(query, params);
            return puntos;
        } catch (error) {
            console.error('Error buscando puntos de interés:', error);
            throw error;
        }
    }

    /**
     * Actualizar punto de interés
     */
    static async actualizar(idPoi, data) {
        try {
            const campos = [];
            const valores = [];

            Object.keys(data).forEach(campo => {
                if (data[campo] !== undefined) {
                    campos.push(`${campo} = ?`);
                    valores.push(data[campo]);
                }
            });

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            valores.push(idPoi);

            const [result] = await pool.query(`
                UPDATE puntos_interes
                SET ${campos.join(', ')}
                WHERE idPoi = ?
            `, valores);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando punto de interés:', error);
            throw error;
        }
    }

    /**
     * Eliminar punto de interés
     */
    static async eliminar(idPoi) {
        try {
            const [result] = await pool.query(`
                DELETE FROM puntos_interes WHERE idPoi = ?
            `, [idPoi]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando punto de interés:', error);
            throw error;
        }
    }

    /**
     * Obtener punto de interés por ID
     */
    static async obtenerPorId(idPoi) {
        try {
            const [puntos] = await pool.query(`
                SELECT * FROM puntos_interes WHERE idPoi = ?
            `, [idPoi]);

            return puntos[0] || null;
        } catch (error) {
            console.error('Error obteniendo punto de interés:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de puntos de interés
     */
    static async obtenerEstadisticas() {
        try {
            const [estadisticas] = await pool.query(`
                SELECT
                    tipoPoi,
                    COUNT(*) as total,
                    COUNT(DISTINCT idRutaAsociada) as rutas_asociadas
                FROM puntos_interes
                GROUP BY tipoPoi
                ORDER BY total DESC
            `);

            return estadisticas;
        } catch (error) {
            console.error('Error obteniendo estadísticas de puntos:', error);
            throw error;
        }
    }

    /**
     * Obtener puntos de interés dentro de un área rectangular
     */
    static async obtenerEnArea(latMin, lngMin, latMax, lngMax) {
        try {
            const [puntos] = await pool.query(`
                SELECT *,
                calcular_distancia_haversine(latitud, longitud, ?, ?) as distancia_centro
                FROM puntos_interes
                WHERE latitud BETWEEN ? AND ?
                AND longitud BETWEEN ? AND ?
                ORDER BY distancia_centro ASC
            `, [
                (latMin + latMax) / 2, (lngMin + lngMax) / 2,
                latMin, latMax, lngMin, lngMax
            ]);

            return puntos;
        } catch (error) {
            console.error('Error obteniendo puntos en área:', error);
            throw error;
        }
    }
}

module.exports = PuntoInteres;