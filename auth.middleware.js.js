const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET || 'secreto_seguro_token');
        req.usuario = verificado; // Adjunta { id, rol } a la petición
        next();
    } catch (err) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

const requerirRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'No tienes los permisos de rol requeridos.' });
        }
        next();
    };
};

module.exports = { verificarToken, requerirRol };