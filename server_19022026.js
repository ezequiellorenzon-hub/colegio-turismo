const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const querystring = require('querystring');

// Configuración
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'colegio.db');

// Inicializar base de datos SQLite
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Crear todas las tablas
db.exec(`
  -- Tabla de noticias
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author TEXT NOT NULL,
    image_url TEXT,
    featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de comisión directiva
  CREATE TABLE IF NOT EXISTS board_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    bio TEXT,
    photo_url TEXT,
    email TEXT,
    order_position INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de profesionales matriculados
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    city TEXT,
    active BOOLEAN DEFAULT 1,
    registration_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla de configuración
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Tabla UNIFICADA de Autoridades
  CREATE TABLE IF NOT EXISTS autoridades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('consejo_directivo', 'comision_revisora', 'tribunal_etica')),
    cargo TEXT NOT NULL,
    apellido TEXT NOT NULL,
    nombre TEXT NOT NULL,
    matricula TEXT NOT NULL,
    categoria TEXT NOT NULL,
    delegacion_zona TEXT,
    orden INTEGER DEFAULT 0,
    periodo TEXT DEFAULT '2024-2026',
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_autoridades_tipo ON autoridades(tipo);
  CREATE INDEX IF NOT EXISTS idx_autoridades_activo ON autoridades(activo);
`);

// Insertar configuración inicial
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('site_name', 'Colegio de Profesionales en Turismo');
  insertSetting.run('site_slogan', 'Promoviendo la excelencia en el turismo argentino');
  insertSetting.run('contact_email', 'info@colegioturismo.org.ar');
  insertSetting.run('contact_phone', '+54 11 4567-8900');
  insertSetting.run('contact_address', 'Av. Corrientes 1234, CABA, Argentina');
  console.log('✅ Configuración inicial creada');
}

// Insertar datos de ejemplo si las tablas están vacías
const newsCount = db.prepare('SELECT COUNT(*) as count FROM news').get();
if (newsCount.count === 0) {
  const insertNews = db.prepare(`
    INSERT INTO news (title, content, excerpt, author, featured) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertNews.run(
    'Bienvenidos al Nuevo Portal',
    'Nos complace presentar el nuevo sitio web del Colegio de Profesionales en Turismo. Aquí encontrarán todas las novedades, información sobre trámites y el directorio de profesionales matriculados.',
    'Presentamos nuestro nuevo sitio web institucional',
    'Comisión Directiva',
    1
  );
  
  insertNews.run(
    'Renovación de Matrículas 2026',
    'Recordamos a todos los colegiados que el proceso de renovación anual de matrículas estará abierto desde el 1 de marzo. Pueden realizar el trámite de forma presencial o a través de nuestro sistema online.',
    'Información sobre el proceso de renovación',
    'Secretaría',
    1
  );
  
  console.log('✅ Noticias de ejemplo creadas');
}

const boardCount = db.prepare('SELECT COUNT(*) as count FROM board_members').get();
if (boardCount.count === 0) {
  const insertBoard = db.prepare(`
    INSERT INTO board_members (name, position, bio, order_position) 
    VALUES (?, ?, ?, ?)
  `);
  
  insertBoard.run('María González', 'Presidenta', 'Licenciada en Turismo con 20 años de experiencia en gestión de destinos.', 1);
  insertBoard.run('Carlos Rodríguez', 'Vicepresidente', 'Especialista en turismo sustentable y desarrollo regional.', 2);
  insertBoard.run('Ana Martínez', 'Secretaria', 'Experta en gestión administrativa y organización de eventos.', 3);
  insertBoard.run('Juan Pérez', 'Tesorero', 'Contador Público con especialización en finanzas del sector turístico.', 4);
  
  console.log('✅ Comisión directiva de ejemplo creada');
}

const membersCount = db.prepare('SELECT COUNT(*) as count FROM members').get();
if (membersCount.count === 0) {
  const insertMember = db.prepare(`
    INSERT INTO members (matricula, name, surname, specialty, city, registration_date) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertMember.run('TUR-001', 'Laura', 'Fernández', 'Guía de Turismo', 'Buenos Aires', '2020-03-15');
  insertMember.run('TUR-002', 'Roberto', 'Silva', 'Agente de Viajes', 'Córdoba', '2019-07-22');
  insertMember.run('TUR-003', 'Patricia', 'López', 'Hotelería', 'Mendoza', '2021-01-10');
  insertMember.run('TUR-004', 'Diego', 'Ramírez', 'Turismo Aventura', 'Bariloche', '2018-11-05');
  insertMember.run('TUR-005', 'Cecilia', 'Torres', 'Gestión de Destinos', 'Salta', '2020-09-18');
  
  console.log('✅ Profesionales de ejemplo creados');
}

// Insertar Autoridades si están vacías
const autoridadesCount = db.prepare('SELECT COUNT(*) as count FROM autoridades').get();
if (autoridadesCount.count === 0) {
  const insertAutoridad = db.prepare(`
    INSERT INTO autoridades (tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Consejo Directivo
  insertAutoridad.run('consejo_directivo', 'Presidenta', 'Romero Trucco', 'Amancay', '512', 'Licenciada', 'Mar del Plata', 1, '2024-2026');
  insertAutoridad.run('consejo_directivo', 'Vicepresidente', 'Zaballa', 'Esteban', '1', 'Licenciado', 'Mar del Plata', 2, '2024-2026');
  insertAutoridad.run('consejo_directivo', 'Secretario', 'Gallardo Batista', 'Victoria', '529', 'Licenciado', 'Sudoeste', 3, '2024-2026');
  insertAutoridad.run('consejo_directivo', 'Prosecretario', 'Castiglione', 'Marcos', '574', 'Técnico', 'Centro', 4, '2024-2026');
  insertAutoridad.run('consejo_directivo', 'Tesorera', 'Villamarin', 'Betiana', '84', 'Técnica y Guía', 'La Plata', 5, '2024-2026');
  insertAutoridad.run('consejo_directivo', 'Protesorera', 'Raffanelli', 'María Belén', '63', 'Licenciada y Técnica', 'La Plata', 6, '2024-2026');
  insertAutoridad.run('consejo_directivo', '1º Vocal', 'Centineo', 'Marta Susana', '127', 'Guía', 'Centro', 7, '2024-2026');
  insertAutoridad.run('consejo_directivo', '2º Vocal', 'Martinez', 'Sebastian', '593', 'Técnico y Guía', 'Norte', 8, '2024-2026');
  insertAutoridad.run('consejo_directivo', '3º Vocal', 'Abdala', 'Maricel', '96', 'Guía', 'Norte', 9, '2024-2026');
  insertAutoridad.run('consejo_directivo', '1º Vocal Suplente', 'Cotone Muro', 'Valeria', '236', 'Técnica y Guía', 'Centro', 10, '2024-2026');
  insertAutoridad.run('consejo_directivo', '2º Vocal Suplente', 'Amor', 'Bernardo', '635', 'Licenciado', 'Sudoeste', 11, '2024-2026');
  insertAutoridad.run('consejo_directivo', '3º Vocal Suplente', 'Ferrari', 'Leonardo', '343', 'Licenciado', 'Norte', 12, '2024-2026');
  
  // Comisión Revisora
  insertAutoridad.run('comision_revisora', '1º Titular', 'Santia', 'Marcela', '278', 'Guía', 'Norte', 1, '2024-2026');
  insertAutoridad.run('comision_revisora', '2º Titular', 'Alvarez', 'Facundo', '5', 'Licenciado', 'Mar del Plata', 2, '2024-2026');
  insertAutoridad.run('comision_revisora', '3º Titular', 'Moreno', 'Gabriela', '125', 'Técnica', 'Mar del Plata', 3, '2024-2026');
  insertAutoridad.run('comision_revisora', '4º Titular', 'Passo', 'Hernán Elbio', '50', 'Guía', 'Centro', 4, '2024-2026');
  insertAutoridad.run('comision_revisora', '1º Suplente', 'Sagarna', 'Juan', '573', 'Guía', 'Centro', 5, '2024-2026');
  insertAutoridad.run('comision_revisora', '2º Suplente', 'Barovero Maxit', 'Mariana', '18', 'Licenciada', 'Mar del Plata', 6, '2024-2026');
  
  // Tribunal de Ética
  insertAutoridad.run('tribunal_etica', '1º Titular', 'Biasone', 'Ana María', '19', 'Licenciada', null, 1, '2024-2028');
  insertAutoridad.run('tribunal_etica', '2º Titular', 'Martin', 'Ana', '210', 'Licenciada', null, 2, '2024-2028');
  insertAutoridad.run('tribunal_etica', '3º Titular', 'Torre', 'Rodrigo Hernán', '640', 'Licenciado', null, 3, '2024-2028');
  insertAutoridad.run('tribunal_etica', '4º Titular', 'Ballesteros', 'Lucrecia', '22', 'Licenciada, Técnica y Guía', null, 4, '2024-2028');
  insertAutoridad.run('tribunal_etica', '5º Titular', 'Gazzanego', 'Victoria', '9', 'Guía', null, 5, '2024-2028');
  insertAutoridad.run('tribunal_etica', '1º Suplente', 'Felice', 'Emiliano', '637', 'Licenciado', null, 6, '2024-2028');
  insertAutoridad.run('tribunal_etica', '2º Suplente', 'Russo', 'Ximena', '567', 'Guía', null, 7, '2024-2028');
  insertAutoridad.run('tribunal_etica', '3º Suplente', 'Cromechek', 'Lucas Fernando', '529', 'Licenciado', null, 8, '2024-2028');
  insertAutoridad.run('tribunal_etica', '4º Suplente', 'Herlein', 'Diego', '31', 'Guía', null, 9, '2024-2028');
  
  console.log('✅ Autoridades creadas (27 miembros)');
}

// ==================== QUERIES PREPARADAS ====================

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
  
  // Autoridades (tabla unificada)
  getAutoridadesByTipo: db.prepare('SELECT * FROM autoridades WHERE tipo = ? AND activo = 1 ORDER BY orden'),
  createAutoridad: db.prepare('INSERT INTO autoridades (tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  deleteAutoridad: db.prepare('DELETE FROM autoridades WHERE id = ?')
};

// ==================== HELPERS ====================

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (e) {
      callback(e);
    }
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 - No encontrado');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// ==================== SERVIDOR HTTP ====================

const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ==================== API ROUTES ====================
  
  // NEWS
  if (url === '/api/news' && method === 'GET') {
    sendJSON(res, 200, queries.getAllNews.all());
  }
  else if (url === '/api/news/featured' && method === 'GET') {
    sendJSON(res, 200, queries.getFeaturedNews.all());
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const news = queries.getNewsById.get(id);
    sendJSON(res, news ? 200 : 404, news || { error: 'No encontrado' });
  }
  else if (url === '/api/news' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { title, content, excerpt, author, image_url, featured } = data;
      const result = queries.createNews.run(title, content, excerpt, author, image_url, featured ? 1 : 0);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Noticia creada' });
    });
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { title, content, excerpt, author, image_url, featured } = data;
      queries.updateNews.run(title, content, excerpt, author, image_url, featured ? 1 : 0, id);
      sendJSON(res, 200, { message: 'Noticia actualizada' });
    });
  }
  else if (url.match(/^\/api\/news\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteNews.run(id);
    sendJSON(res, 200, { message: 'Noticia eliminada' });
  }
  
  // BOARD MEMBERS
  else if (url === '/api/board' && method === 'GET') {
    sendJSON(res, 200, queries.getAllBoard.all());
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const member = queries.getBoardById.get(id);
    sendJSON(res, member ? 200 : 404, member || { error: 'No encontrado' });
  }
  else if (url === '/api/board' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { name, position, bio, photo_url, email, order_position } = data;
      const result = queries.createBoard.run(name, position, bio, photo_url, email, order_position || 0);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Miembro creado' });
    });
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { name, position, bio, photo_url, email, order_position } = data;
      queries.updateBoard.run(name, position, bio, photo_url, email, order_position, id);
      sendJSON(res, 200, { message: 'Miembro actualizado' });
    });
  }
  else if (url.match(/^\/api\/board\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteBoard.run(id);
    sendJSON(res, 200, { message: 'Miembro eliminado' });
  }
  
  // MEMBERS
  else if (url === '/api/members' && method === 'GET') {
    sendJSON(res, 200, queries.getAllMembers.all());
  }
  else if (url.startsWith('/api/members/search?') && method === 'GET') {
    const query = url.split('?')[1];
    const params = querystring.parse(query);
    const search = `%${params.q || ''}%`;
    sendJSON(res, 200, queries.searchMembers.all(search, search, search));
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'GET') {
    const id = url.split('/')[3];
    const member = queries.getMemberById.get(id);
    sendJSON(res, member ? 200 : 404, member || { error: 'No encontrado' });
  }
  else if (url === '/api/members' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { matricula, name, surname, specialty, phone, email, city, registration_date } = data;
      const result = queries.createMember.run(matricula, name, surname, specialty, phone, email, city, registration_date);
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Profesional creado' });
    });
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'PUT') {
    const id = url.split('/')[3];
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { matricula, name, surname, specialty, phone, email, city, registration_date } = data;
      queries.updateMember.run(matricula, name, surname, specialty, phone, email, city, registration_date, id);
      sendJSON(res, 200, { message: 'Profesional actualizado' });
    });
  }
  else if (url.match(/^\/api\/members\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteMember.run(id);
    sendJSON(res, 200, { message: 'Profesional eliminado' });
  }
  
  // SETTINGS
  else if (url === '/api/settings' && method === 'GET') {
    sendJSON(res, 200, queries.getAllSettings.all());
  }
  
  // AUTORIDADES (API unificada)
  else if (url === '/api/autoridades/consejo-directivo' && method === 'GET') {
    sendJSON(res, 200, queries.getAutoridadesByTipo.all('consejo_directivo'));
  }
  else if (url === '/api/autoridades/comision-revisora' && method === 'GET') {
    sendJSON(res, 200, queries.getAutoridadesByTipo.all('comision_revisora'));
  }
  else if (url === '/api/autoridades/tribunal-etica' && method === 'GET') {
    sendJSON(res, 200, queries.getAutoridadesByTipo.all('tribunal_etica'));
  }
  else if (url === '/api/autoridades' && method === 'POST') {
    parseBody(req, (err, data) => {
      if (err) return sendJSON(res, 400, { error: 'JSON inválido' });
      const { tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona, orden, periodo } = data;
      const result = queries.createAutoridad.run(tipo, cargo, apellido, nombre, matricula, categoria, delegacion_zona || null, orden || 0, periodo || '2024-2026');
      sendJSON(res, 201, { id: result.lastInsertRowid, message: 'Autoridad creada' });
    });
  }
  else if (url.match(/^\/api\/autoridades\/\d+$/) && method === 'DELETE') {
    const id = url.split('/')[3];
    queries.deleteAutoridad.run(id);
    sendJSON(res, 200, { message: 'Autoridad eliminada' });
  }
  
  // ==================== STATIC FILES ====================
  
  else if (url === '/' || url === '/index.html') {
    serveFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
  }
  else if (url.endsWith('.html')) {
    serveFile(res, path.join(__dirname, 'public', url), 'text/html');
  }
  else if (url.endsWith('.css')) {
    serveFile(res, path.join(__dirname, 'public', url), 'text/css');
  }
  else if (url.endsWith('.js')) {
    serveFile(res, path.join(__dirname, 'public', url), 'application/javascript');
  }
  else if (url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    serveFile(res, path.join(__dirname, 'public', url), 'image/' + url.split('.').pop());
  }
  else if (url.endsWith('.pdf')) {
    serveFile(res, path.join(__dirname, 'public', url), 'application/pdf');
  }
  else if (url.endsWith('.ico')) {
    serveFile(res, path.join(__dirname, 'public', url), 'image/x-icon');
  }
  else {
    res.writeHead(404);
    res.end('404 - Página no encontrada');
  }
});

// Cerrar BD al terminar
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  db.close();
  process.exit(0);
});

//Envio de mail
// Importamos los módulos necesarios
/*const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
//const path = require('path');

// Crear una aplicación Express
const app = express();
//const port = 3000;

// Middleware para procesar datos del formulario
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Sirve archivos estáticos como imágenes, CSS, etc.

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // Asegúrate de que tu formulario esté en index.html
});

// Ruta para manejar el envío de correos
app.post('/send-email', (req, res) => {
  const { nombre, apellido, email, consulta, asunto, mensaje } = req.body;

  // Configuración de Nodemailer (SMTP)
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Usando Gmail para este ejemplo
    auth: {
      user: 'tucorreo@gmail.com', // Reemplaza con tu correo de Gmail
      pass: 'tu_contraseña', // Si usas Gmail, debes usar una contraseña de aplicación si tienes 2FA activada
    },
  });

  // Opciones del correo
  const mailOptions = {
    from: email, // Correo del remitente (quien llena el formulario)
    to: 'correo_destino@gmail.com', // El correo que recibirá el mensaje
    subject: `Consulta desde ${nombre} ${apellido}`,
    text: `
      Nombre: ${nombre}
      Apellido: ${apellido}
      Email: ${email}

      Consulta: ${consulta}
      Asunto: ${asunto}
      Mensaje: ${mensaje}
    `,
  };

  // Enviar el correo
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send('Error al enviar el mensaje');
    }
    res.status(200).send('Mensaje enviado correctamente');
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});*/

server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏛️  COLEGIO DE PROFESIONALES EN TURISMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Sitio Web: http://localhost:${PORT}`);
  console.log(`⚙️  Admin: http://localhost:${PORT}/admin.html`);
  console.log(`💾 Base de datos: ${DB_PATH}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Presiona Ctrl+C para detener\n');
});
