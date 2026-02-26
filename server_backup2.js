require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const expressApp = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN INICIAL
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// 2. BASE DE DATOS Y QUERIES
const db = new Database(path.join(__dirname, 'colegio.db'));
db.pragma('journal_mode = WAL');

const queries = {
  // News
  getAllNews: db.prepare('SELECT * FROM news ORDER BY created_at DESC'),
  getFeaturedNews: db.prepare('SELECT * FROM news WHERE featured = 1 ORDER BY created_at DESC LIMIT 3'),
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
  createAutoridad: db.prepare('INSERT INTO autoridades (tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  deleteAutoridad: db.prepare('DELETE FROM autoridades WHERE id = ?')
};

// ==================== RUTAS DE LA API ====================

// --- NOTICIAS ---
expressApp.get('/api/news/featured', (req, res) => {
  try {
    res.json(queries.getFeaturedNews.all());
  } catch (error) {
    console.error('Error en /api/news/featured:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.get('/api/news', (req, res) => {
  try {
    res.json(queries.getAllNews.all());
  } catch (error) {
    console.error('Error en /api/news:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.get('/api/news/:id', (req, res) => {
  try {
    const news = queries.getNewsById.get(req.params.id);
    if (news) res.json(news);
    else res.status(404).json({ error: 'Noticia no encontrada' });
  } catch (error) {
    console.error('Error en /api/news/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.post('/api/news', (req, res) => {
  try {
    const { title, content, excerpt, author, image_url, featured } = req.body;
    const result = queries.createNews.run(title, content, excerpt || '', author, image_url || '', featured ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Noticia creada' });
  } catch (error) {
    console.error('Error en POST /api/news:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.delete('/api/news/:id', (req, res) => {
  try {
    queries.deleteNews.run(req.params.id);
    res.json({ success: true, message: 'Noticia eliminada' });
  } catch (error) {
    console.error('Error en DELETE /api/news/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- BOARD MEMBERS ---
expressApp.get('/api/board', (req, res) => {
  try {
    res.json(queries.getAllBoard.all());
  } catch (error) {
    console.error('Error en /api/board:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.post('/api/board', (req, res) => {
  try {
    const { name, position, bio, photo_url, email, order_position } = req.body;
    const result = queries.createBoard.run(name, position, bio || '', photo_url || '', email || '', order_position || 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Miembro creado' });
  } catch (error) {
    console.error('Error en POST /api/board:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.delete('/api/board/:id', (req, res) => {
  try {
    queries.deleteBoard.run(req.params.id);
    res.json({ success: true, message: 'Miembro eliminado' });
  } catch (error) {
    console.error('Error en DELETE /api/board/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- MEMBERS ---
expressApp.get('/api/members/search', (req, res) => {
  try {
    const s = `%${req.query.q || ''}%`;
    res.json(queries.searchMembers.all(s, s, s));
  } catch (error) {
    console.error('Error en /api/members/search:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.get('/api/members', (req, res) => {
  try {
    res.json(queries.getAllMembers.all());
  } catch (error) {
    console.error('Error en /api/members:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.post('/api/members', (req, res) => {
  try {
    const { matricula, name, surname, specialty, phone, email, city, registration_date } = req.body;
    const result = queries.createMember.run(
      matricula, 
      name, 
      surname, 
      specialty || '', 
      phone || '', 
      email || '', 
      city || '', 
      registration_date || new Date().toISOString()
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Profesional creado' });
  } catch (error) {
    console.error('Error en POST /api/members:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.put('/api/members/:id', (req, res) => {
  try {
    const { matricula, name, surname, specialty, phone, email, city, registration_date } = req.body;
    queries.updateMember.run(matricula, name, surname, specialty, phone, email, city, registration_date, req.params.id);
    res.json({ success: true, message: 'Profesional actualizado' });
  } catch (error) {
    console.error('Error en PUT /api/members/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.delete('/api/members/:id', (req, res) => {
  try {
    queries.deleteMember.run(req.params.id);
    res.json({ success: true, message: 'Profesional eliminado' });
  } catch (error) {
    console.error('Error en DELETE /api/members/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- AUTORIDADES ---
expressApp.get('/api/autoridades/consejo-directivo', (req, res) => {
  try {
    res.json(queries.getAutoridadesByTipo.all('consejo_directivo'));
  } catch (error) {
    console.error('Error en /api/autoridades/consejo-directivo:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.get('/api/autoridades/comision-revisora', (req, res) => {
  try {
    res.json(queries.getAutoridadesByTipo.all('comision_revisora'));
  } catch (error) {
    console.error('Error en /api/autoridades/comision-revisora:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.get('/api/autoridades/tribunal-etica', (req, res) => {
  try {
    res.json(queries.getAutoridadesByTipo.all('tribunal_etica'));
  } catch (error) {
    console.error('Error en /api/autoridades/tribunal-etica:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.post('/api/autoridades', (req, res) => {
  try {
    const { tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo } = req.body;
    const result = queries.createAutoridad.run(
      tipo, 
      cargo, 
      apellido, 
      nombre, 
      matricula, 
      categoria, 
      delegacion_zona || null, 
      orden || 0, 
      periodo || '2024-2026'
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Autoridad creada' });
  } catch (error) {
    console.error('Error en POST /api/autoridades:', error);
    res.status(500).json({ error: error.message });
  }
});

expressApp.delete('/api/autoridades/:id', (req, res) => {
  try {
    queries.deleteAutoridad.run(req.params.id);
    res.json({ success: true, message: 'Autoridad eliminada' });
  } catch (error) {
    console.error('Error en DELETE /api/autoridades/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- SETTINGS ---
expressApp.get('/api/settings', (req, res) => {
  try {
    res.json(queries.getAllSettings.all());
  } catch (error) {
    console.error('Error en /api/settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- CONTACTO (NODEMAILER) ---
expressApp.post('/enviar-contacto', async (req, res) => {
    const { nombre, apellido, email, asunto, mensaje, consulta } = req.body;

    // Validar que existan las variables de entorno
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ERROR: Variables EMAIL_USER y EMAIL_PASS no configuradas en .env');
        return res.status(500).json({ 
            success: false, 
            message: 'Configuración de email no disponible. Contacte al administrador.' 
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
        
        console.log("✅ Mail enviado con éxito a:", process.env.EMAIL_USER);
        res.json({ success: true, message: 'Email enviado correctamente' });
    } catch (e) {
        console.error("❌ Error en Nodemailer:", e.message);
        res.status(500).json({ success: false, message: 'Error al enviar el email. Intente más tarde.' });
    }
});

// --- SERVIR ARCHIVOS ESTÁTICOS ---
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

// Error handler para cerrar DB limpiamente
process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    db.close();
    process.exit(0);
});

// 3. INICIO
expressApp.listen(PORT, '0.0.0.0', () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏛️  COLEGIO DE PROFESIONALES EN TURISMO`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`⚙️  Admin: http://localhost:${PORT}/admin.html`);
    console.log(`📧 Email configurado: ${process.env.EMAIL_USER || '❌ NO CONFIGURADO'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('Presiona Ctrl+C para detener\n');
});