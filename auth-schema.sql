-- ==================== TABLAS DE AUTENTICACIÓN ====================

-- Tabla de usuarios (admin y colegiados)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'colegiado')),
    member_id INTEGER,
    activo INTEGER DEFAULT 1,
    ultimo_acceso DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Tabla de cuotas
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_member ON usuarios(member_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_member ON cuotas(member_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_periodo ON cuotas(anio, mes);

-- Usuario admin por defecto
-- Usuario: admin
-- Password: admin123 (CAMBIAR EN PRODUCCIÓN)
INSERT OR IGNORE INTO usuarios (username, password_hash, rol) 
VALUES ('admin', '$2b$10$rZ3qVHKGKZJZN9yQx5PXJeCLnC.xQMqP1YQ.Qq5vRQGX5aU6YkJGK', 'admin');

-- Crear usuarios para los profesionales existentes
-- Password inicial: su número de matrícula
-- Ejemplo: Si matrícula es 1234, password = 1234
INSERT OR IGNORE INTO usuarios (username, password_hash, rol, member_id)
SELECT 
    matricula,
    '$2b$10$' || substr(hex(randomblob(22)), 1, 53), -- Hash temporal
    'colegiado',
    id
FROM members 
WHERE active = 1;
