// ==================== PLAN DE IMPLEMENTACIÓN ====================
/*
SISTEMA DE LOGIN - COLEGIO DE TURISMO

1. BASE DE DATOS:
   - Tabla: usuarios (admin y colegiados)
   - Tabla: sesiones (para manejar login)
   - Tabla: cuotas (para certificados)

2. PERFILES:
   A) ADMINISTRADOR:
      - Usuario: admin
      - Acceso: /admin.html (ABM completo actual)
   
   B) COLEGIADO:
      - Usuario: matrícula del profesional
      - Acceso: /mi-cuenta.html
      - Funciones:
        * Ver/editar sus datos
        * Descargar credencial (PDF con foto)
        * Descargar certificado de cuota al día (PDF)
        * Cambiar contraseña

3. ESTRUCTURA:
   /login.html          → Página de login única
   /admin.html          → Panel admin (requiere rol admin)
   /mi-cuenta.html      → Panel colegiado (requiere rol colegiado)
   /api/auth/login      → API login
   /api/auth/logout     → API logout
   /api/auth/session    → Verificar sesión
   /api/colegiado/*     → APIs para colegiados

4. DEPENDENCIAS NUEVAS:
   - bcrypt            → Hashear contraseñas
   - express-session   → Manejar sesiones
   - pdfkit           → Generar PDFs (credencial y certificado)

5. SEGURIDAD:
   - Contraseñas hasheadas con bcrypt
   - Sesiones con express-session
   - Middleware de autenticación
   - CSRF protection (simple)
*/

// ==================== COMANDOS PARA INSTALAR ====================
/*
cd /home/ezequiel/Progr/NodeJs/colegio-turismo
npm install bcrypt express-session pdfkit
*/

// ==================== SCHEMA DE BASE DE DATOS ====================

const createAuthTables = `
-- Tabla de usuarios (admin y colegiados)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'colegiado')),
    member_id INTEGER,  -- ID del profesional si es colegiado
    activo INTEGER DEFAULT 1,
    ultimo_acceso DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Tabla de cuotas (para certificados)
CREATE TABLE IF NOT EXISTS cuotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    monto REAL NOT NULL,
    pagado INTEGER DEFAULT 0,
    fecha_pago DATETIME,
    comprobante TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    UNIQUE(member_id, anio, mes)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_member ON usuarios(member_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_member ON cuotas(member_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_periodo ON cuotas(anio, mes);

-- Usuario admin por defecto (password: admin123)
-- Hash generado con: bcrypt.hash('admin123', 10)
INSERT OR IGNORE INTO usuarios (username, password_hash, rol) 
VALUES ('admin', '$2b$10$rZ3qVHKGKZJZN9yQx5PXJeCLnC.xQMqP1YQ.Qq5vRQGX5aU6YkJGK', 'admin');
`;

// ==================== NOTAS DE IMPLEMENTACIÓN ====================
/*
FLUJO DE LOGIN:
1. Usuario entra a /login.html
2. Ingresa usuario y contraseña
3. POST a /api/auth/login
4. Si es admin → redirect a /admin.html
5. Si es colegiado → redirect a /mi-cuenta.html

CREDENCIAL (PDF):
- Logo del colegio
- Foto del profesional
- Nombre completo
- Matrícula
- Especialidad
- Fecha de emisión
- Código QR (opcional)

CERTIFICADO DE CUOTA (PDF):
- Logo del colegio
- Datos del profesional
- Estado de cuotas del año actual
- Texto: "Se certifica que el profesional X con matrícula Y 
  se encuentra al día con las cuotas del año Z"
- Fecha de emisión
- Firma digital
*/

module.exports = {
    createAuthTables
};
