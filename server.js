require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const expressApp = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN INICIAL
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// 2. CONFIGURACIÓN DE SESIONES
expressApp.use(session({
    secret: process.env.SESSION_SECRET || 'colegio-turismo-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true en producción con HTTPS
        httpOnly: true,
        maxAge: 30 * 60 * 1000 // 30 minutos
    }
}));

// 3. BASE DE DATOS
const db = new Database(path.join(__dirname, 'colegio.db'));
db.pragma('journal_mode = WAL');

// Ejecutar schema de autenticación si existe
const authSchemaPath = path.join(__dirname, 'auth-schema.sql');
if (fs.existsSync(authSchemaPath)) {
    try {
        const authSQL = fs.readFileSync(authSchemaPath, 'utf8');
        db.exec(authSQL);
        console.log('✅ Tablas de autenticación verificadas');
    } catch (error) {
        console.log('⚠️  Schema ya ejecutado o error:', error.message);
    }
}

// 4. QUERIES
const queries = {
  // News
  getAllNews: db.prepare('SELECT * FROM news ORDER BY created_at DESC'),
  getFeaturedNews: db.prepare('SELECT * FROM news WHERE featured = 1 ORDER BY created_at DESC LIMIT 5'),
  getNewsById: db.prepare('SELECT * FROM news WHERE id = ?'),
  createNews: db.prepare('INSERT INTO news (title, content, excerpt, author, image_url, featured) VALUES (?, ?, ?, ?, ?, ?)'),
  updateNews: db.prepare('UPDATE news SET title = ?, content = ?, excerpt = ?, author = ?, image_url = ?, featured = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  deleteNews: db.prepare('DELETE FROM news WHERE id = ?'),
  
  // Board Members
  getAllBoard: db.prepare('SELECT * FROM board_members WHERE active = 1 ORDER BY order_position'),
  getBoardById: db.prepare('SELECT * FROM board_members WHERE id = ?'),
  createBoard: db.prepare('INSERT INTO board_members (name, position, bio, photo_url, email, order_position) VALUES (?, ?, ?, ?, ?, ?)'),
  updateBoard: db.prepare('UPDATE board_members SET name = ?, position = ?, bio = ?, photo_url = ?, email = ?, order_position = ? WHERE id = ?'),
  deleteBoard: db.prepare('DELETE FROM board_members WHERE id = ?'),
  
  // Members
  getAllMembers: db.prepare('SELECT * FROM members WHERE active = 1 ORDER BY surname, name'),
  searchMembers: db.prepare('SELECT * FROM members WHERE active = 1 AND (name LIKE ? OR surname LIKE ? OR matricula LIKE ?) ORDER BY surname, name'),
  getMemberById: db.prepare('SELECT * FROM members WHERE id = ?'),
  createMember: db.prepare('INSERT INTO members (matricula, name, surname, specialty, phone, email, city, registration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  updateMember: db.prepare('UPDATE members SET matricula = ?, name = ?, surname = ?, specialty = ?, phone = ?, email = ?, city = ?, registration_date = ? WHERE id = ?'),
  deleteMember: db.prepare('DELETE FROM members WHERE id = ?'),
  
  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  getAllSettings: db.prepare('SELECT * FROM settings'),
  updateSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  
  // Autoridades
  getAutoridadesByTipo: db.prepare('SELECT * FROM autoridades WHERE tipo = ? AND activo = 1 ORDER BY orden'),
  // Después de getAutoridadesByTipo
  getAutoridadById: db.prepare('SELECT * FROM autoridades WHERE id = ?'),
  updateAutoridad: db.prepare(`
      UPDATE autoridades 
      SET tipo = ?, cargo = ?, apellido = ?, nombre = ?, matricula = ?, 
          categoria = ?, delegacion_zona = ?, orden = ?, periodo = ?
      WHERE id = ?
`  ),
  createAutoridad: db.prepare('INSERT INTO autoridades (tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  deleteAutoridad: db.prepare('DELETE FROM autoridades WHERE id = ?'),
  
  // Autenticación
  getUserByUsername: db.prepare('SELECT * FROM usuarios WHERE username = ? AND activo = 1'),
  getUserById: db.prepare('SELECT * FROM usuarios WHERE id = ?'),
  updateLastAccess: db.prepare('UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?'),
  updatePassword: db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?'),
  
  // Colegiados
  getMemberByUserId: db.prepare(`
    SELECT m.*, u.username, u.ultimo_acceso 
    FROM members m 
    JOIN usuarios u ON u.member_id = m.id 
    WHERE u.id = ?
  `),
  updateMemberData: db.prepare('UPDATE members SET phone = ?, email = ?, city = ? WHERE id = ?'),
  
  // Cuotas
  getCuotasByMember: db.prepare('SELECT * FROM cuotas WHERE member_id = ? ORDER BY anio DESC, mes DESC'),
  getCuotasDelAnio: db.prepare('SELECT * FROM cuotas WHERE member_id = ? AND anio = ? ORDER BY mes'),
  createCuota: db.prepare('INSERT INTO cuotas (member_id, anio, mes, monto, pagado, fecha_pago) VALUES (?, ?, ?, ?, ?, ?)')
};

// 5. MIDDLEWARE DE AUTENTICACIÓN
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
};

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.rol === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
};

const requireColegiado = (req, res, next) => {
    if (req.session && req.session.userId && req.session.rol === 'colegiado') {
        return next();
    }
    res.status(403).json({ error: 'Acceso denegado. Solo para colegiados.' });
};

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Login
expressApp.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
        }
        
        const user = queries.getUserByUsername.get(username);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
        
        // Crear sesión
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.rol = user.rol;
        req.session.memberId = user.member_id;
        
        // Actualizar último acceso
        queries.updateLastAccess.run(user.id);
        
        console.log(`✅ Login exitoso: ${username} (${user.rol})`);
        
        res.json({ 
            success: true, 
            rol: user.rol,
            username: user.username
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Logout
expressApp.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

// Verificar sesión
expressApp.get('/api/auth/session', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            username: req.session.username,
            rol: req.session.rol
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Cambiar contraseña
expressApp.post('/api/auth/cambiar-password', requireAuth, async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }
        
        if (passwordNueva.length < 4) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 4 caracteres' });
        }
        
        const user = queries.getUserById.get(req.session.userId);
        const passwordMatch = await bcrypt.compare(passwordActual, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
        }
        
        const newHash = await bcrypt.hash(passwordNueva, 10);
        queries.updatePassword.run(newHash, req.session.userId);
        
        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// ==================== RUTAS DE API - NOTICIAS ====================

expressApp.get('/api/news/featured', (req, res) => {
    res.json(queries.getFeaturedNews.all());
});

expressApp.get('/api/news', (req, res) => {
    res.json(queries.getAllNews.all());
});

expressApp.get('/api/news/:id', (req, res) => {
    const news = queries.getNewsById.get(req.params.id);
    if (news) {
        res.json(news);
    } else {
        res.status(404).json({ error: 'Noticia no encontrada' });
    }
});

expressApp.post('/api/news', requireAdmin, (req, res) => {
    try {
        const { title, content, excerpt, author, image_url, featured } = req.body;
        const isFeatured = featured ? 1 : 0;
        const info = queries.createNews.run(title, content, excerpt || '', author, image_url || null, isFeatured);
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error("Error al crear noticia:", error);
        res.status(500).json({ error: "No se pudo guardar la noticia" });
    }
});

expressApp.put('/api/news/:id', requireAdmin, (req, res) => {
    try {
        const { title, content, excerpt, author, image_url, featured } = req.body;
        const isFeatured = featured ? 1 : 0;
        queries.updateNews.run(title, content, excerpt || '', author, image_url || null, isFeatured, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar noticia:", error);
        res.status(500).json({ error: "No se pudo actualizar la noticia" });
    }
});

expressApp.delete('/api/news/:id', requireAdmin, (req, res) => {
    try {
        queries.deleteNews.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar noticia:", error);
        res.status(500).json({ error: "No se pudo eliminar la noticia" });
    }
});

// ==================== RUTAS DE API - BOARD ====================

expressApp.get('/api/board', (req, res) => {
    res.json(queries.getAllBoard.all());
});

expressApp.post('/api/board', requireAdmin, (req, res) => {
    try {
        const { name, position, bio, photo_url, email, order_position } = req.body;
        const info = queries.createBoard.run(name, position, bio || '', photo_url || '', email || '', order_position || 0);
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error("Error al crear miembro:", error);
        res.status(500).json({ error: "No se pudo crear el miembro" });
    }
});

expressApp.put('/api/board/:id', requireAdmin, (req, res) => {
    try {
        const { name, position, bio, photo_url, email, order_position } = req.body;
        queries.updateBoard.run(name, position, bio, photo_url, email, order_position, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar miembro:", error);
        res.status(500).json({ error: "No se pudo actualizar el miembro" });
    }
});

expressApp.delete('/api/board/:id', requireAdmin, (req, res) => {
    try {
        queries.deleteBoard.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar miembro:", error);
        res.status(500).json({ error: "No se pudo eliminar el miembro" });
    }
});
//ADMIN

 expressApp.get('/api/board/:id', requireAdmin, (req, res) => {
     try {
      const board = queries.getBoardById.get(req.params.id);
         if (!board) return res.status(404).json({ error: 'No encontrado' });
         res.json(board);
     } catch (error) {
         res.status(500).json({ error: error.message });
     }
});

// ==================== RUTAS DE API - MEMBERS ====================

expressApp.get('/api/members/search', (req, res) => {
    const s = `%${req.query.q || ''}%`;
    res.json(queries.searchMembers.all(s, s, s));
});

expressApp.get('/api/members', (req, res) => {
    res.json(queries.getAllMembers.all());
});

expressApp.post('/api/members', requireAdmin, (req, res) => {
    try {
        const { matricula, name, surname, specialty, phone, email, city, registration_date } = req.body;
        const info = queries.createMember.run(
            matricula, name, surname, specialty || '', phone || '', 
            email || '', city || '', registration_date || new Date().toISOString()
        );
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error("Error al crear profesional:", error);
        res.status(500).json({ error: "No se pudo crear el profesional" });
    }
});

expressApp.put('/api/members/:id', requireAdmin, (req, res) => {
    try {
        const { matricula, name, surname, specialty, phone, email, city, registration_date } = req.body;
        queries.updateMember.run(matricula, name, surname, specialty, phone, email, city, registration_date, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar profesional:", error);
        res.status(500).json({ error: "No se pudo actualizar el profesional" });
    }
});

expressApp.delete('/api/members/:id', requireAdmin, (req, res) => {
    try {
        queries.deleteMember.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar profesional:", error);
        res.status(500).json({ error: "No se pudo eliminar el profesional" });
    }
});

// GET individual para members (AGREGAR ESTA)
expressApp.get('/api/members/:id', requireAdmin, (req, res) => {
    try {
        const member = queries.getMemberById.get(req.params.id);
        if (!member) return res.status(404).json({ error: 'No encontrado' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== RUTAS DE API - AUTORIDADES ====================

expressApp.get('/api/autoridades/consejo-directivo', (req, res) => {
    res.json(queries.getAutoridadesByTipo.all('consejo_directivo'));
});

expressApp.get('/api/autoridades/comision-revisora', (req, res) => {
    res.json(queries.getAutoridadesByTipo.all('comision_revisora'));
});

expressApp.get('/api/autoridades/tribunal-etica', (req, res) => {
    res.json(queries.getAutoridadesByTipo.all('tribunal_etica'));
});

expressApp.post('/api/autoridades', requireAdmin, (req, res) => {
    try {
        const { tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo } = req.body;
        const info = queries.createAutoridad.run(
            tipo, cargo, apellido, nombre, matricula, categoria, 
            delegacion_zona || null, orden || 0, periodo || '2024-2026'
        );
        res.status(201).json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        console.error("Error al crear autoridad:", error);
        res.status(500).json({ error: "No se pudo crear la autoridad" });
    }
});

expressApp.delete('/api/autoridades/:id', requireAdmin, (req, res) => {
    try {
        queries.deleteAutoridad.run(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar autoridad:", error);
        res.status(500).json({ error: "No se pudo eliminar la autoridad" });
    }
});

expressApp.put('/api/autoridades/:id', requireAdmin, (req, res) => {
    try {
        const { tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo } = req.body;
        queries.updateAutoridad.run(
            tipo, cargo, apellido, nombre, matricula, categoria, 
            delegacion_zona, orden, periodo, req.params.id
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error al actualizar autoridad:", error);
        res.status(500).json({ error: "No se pudo actualizar la autoridad" });
    }
});

// ==================== RUTAS DE API - COLEGIADOS ====================

// Obtener datos del colegiado logueado
expressApp.get('/api/colegiado/mi-cuenta', requireColegiado, (req, res) => {
    try {
        const member = queries.getMemberByUserId.get(req.session.userId);
        if (!member) {
            return res.status(404).json({ error: 'Datos no encontrados' });
        }
        res.json(member);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error al obtener datos" });
    }
});

// Actualizar datos del colegiado
expressApp.put('/api/colegiado/mis-datos', requireColegiado, (req, res) => {
    try {
        const { phone, email, city } = req.body;
        const member = queries.getMemberByUserId.get(req.session.userId);
        
        if (!member) {
            return res.status(404).json({ error: 'Datos no encontrados' });
        }
        
        queries.updateMemberData.run(phone, email, city, member.id);
        res.json({ success: true, message: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error("Error al actualizar datos:", error);
        res.status(500).json({ error: "No se pudieron actualizar los datos" });
    }
});

// Obtener cuotas del colegiado
expressApp.get('/api/colegiado/cuotas', requireColegiado, (req, res) => {
    try {
        const member = queries.getMemberByUserId.get(req.session.userId);
        if (!member) {
            return res.status(404).json({ error: 'Datos no encontrados' });
        }
        
        const cuotas = queries.getCuotasByMember.all(member.id);
        res.json(cuotas);
    } catch (error) {
        console.error("Error al obtener cuotas:", error);
        res.status(500).json({ error: "Error al obtener cuotas" });
    }
});

// ==================== SETTINGS ====================

expressApp.get('/api/settings', (req, res) => {
    res.json(queries.getAllSettings.all());
});

// ==================== CONTACTO (NODEMAILER) ====================

expressApp.post('/enviar-contacto', async (req, res) => {
    const { nombre, apellido, email, asunto, mensaje, consulta } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ERROR: Variables EMAIL_USER y EMAIL_PASS no configuradas');
        return res.status(500).json({ 
            success: false, 
            message: 'Configuración de email no disponible' 
        });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { 
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS 
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.sendMail({
            from: `"${nombre} ${apellido}" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `Consulta Web - ${consulta || asunto}`,
            html: `
                <h2>Nueva consulta desde el sitio web</h2>
                <p><strong>De:</strong> ${nombre} ${apellido}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Tipo de consulta:</strong> ${consulta || 'No especificado'}</p>
                <p><strong>Asunto:</strong> ${asunto}</p>
                <hr>
                <p><strong>Mensaje:</strong></p>
                <p>${mensaje}</p>
            `
        });
        
        console.log("✅ Mail enviado con éxito");
        res.json({ success: true });
    } catch (e) {
        console.error("❌ Error en Nodemailer:", e.message);
        res.status(500).json({ success: false, message: 'Error al enviar el email' });
    }
});

// ==================== ARCHIVOS ESTÁTICOS ====================

expressApp.use(express.static(path.join(__dirname, 'public')));

// Fallback para rutas HTML
expressApp.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next();
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// 404 Handler
expressApp.use((req, res) => {
    res.status(404).send('404 - Página no encontrada');
});

// Cerrar DB al terminar
process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    db.close();
    process.exit(0);
});

// ==================== INICIO ====================

expressApp.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏛️  COLEGIO DE PROFESIONALES EN TURISMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
    console.log(`⚙️  Admin: http://localhost:${PORT}/admin.html`);
    console.log(`📧 Email configurado: ${process.env.EMAIL_USER || '❌ NO CONFIGURADO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Presiona Ctrl+C para detener\n');
});
