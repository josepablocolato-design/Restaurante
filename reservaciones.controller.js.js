const db = require('../config/db'); // Tu pool de conexión (pg u mysql2)

exports.crearReservacion = async (req, res) => {
    const { mesa_id, fecha, hora, comensales } = req.body;
    const usuario_id = req.usuario.id; // Obtenido del token JWT verificado

    if (!mesa_id || !fecha || !hora || !comensales) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        // 1. Validar existencia y capacidad de la mesa
        const { rows: mesas } = await db.query('SELECT * FROM mesas WHERE id = $1', [mesa_id]);
        if (mesas.length === 0) {
            return res.status(404).json({ error: 'La mesa seleccionada no existe.' });
        }
        if (mesas[0].estado !== 'disponible') {
            return res.status(400).json({ error: 'La mesa se encuentra temporalmente fuera de servicio.' });
        }
        if (comensales > mesas[0].capacidad) {
            return res.status(400).json({ error: `La capacidad máxima de esta mesa es de ${mesas[0].capacidad} personas.` });
        }

        // 2. REGLA CLÍTICA: Comprobar colisiones de horario
        const { rows: conflicto } = await db.query(
            `SELECT * FROM reservaciones 
             WHERE mesa_id = $1 AND fecha = $2 AND hora = $3 AND estado != 'cancelada'`,
            [mesa_id, fecha, hora]
        );

        if (conflicto.length > 0) {
            return res.status(409).json({ error: 'La mesa ya se encuentra reservada para esa fecha y hora.' });
        }

        // 3. Registrar la reserva en estado "pendiente"
        const { rows: nuevaReserva } = await db.query(
            `INSERT INTO reservaciones (usuario_id, mesa_id, fecha, hora, comensales) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [usuario_id, mesa_id, fecha, hora, comensales]
        );

        return res.status(201).json({ mensaje: 'Reservación realizada', reservacion: nuevaReserva[0] });
    } catch (error) {
        return res.status(500).json({ error: 'Error del servidor al procesar la reserva.' });
    }
};