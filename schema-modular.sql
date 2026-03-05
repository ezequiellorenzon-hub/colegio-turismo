-- ==================== SISTEMA MODULAR Y PERMISOS ====================

-- Tabla de módulos del sistema
CREATE TABLE IF NOT EXISTS modulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    icono TEXT,
    color TEXT,
    ruta TEXT,
    orden INTEGER DEFAULT 0,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de permisos por rol y módulo
CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rol TEXT NOT NULL,
    modulo_codigo TEXT NOT NULL,
    puede_ver INTEGER DEFAULT 0,
    puede_crear INTEGER DEFAULT 0,
    puede_editar INTEGER DEFAULT 0,
    puede_eliminar INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modulo_codigo) REFERENCES modulos(codigo),
    UNIQUE(rol, modulo_codigo)
);

-- Tabla de items de menú (dinámico)
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo_codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    ruta TEXT NOT NULL,
    icono TEXT,
    orden INTEGER DEFAULT 0,
    parent_id INTEGER,
    requiere_permiso TEXT, -- 'ver', 'crear', 'editar', 'eliminar'
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (modulo_codigo) REFERENCES modulos(codigo),
    FOREIGN KEY (parent_id) REFERENCES menu_items(id)
);

-- Tabla de log de actividades (auditoría)
CREATE TABLE IF NOT EXISTS actividad_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    modulo_codigo TEXT,
    accion TEXT NOT NULL, -- 'crear', 'editar', 'eliminar', 'ver'
    descripcion TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (modulo_codigo) REFERENCES modulos(codigo)
);

-- Actualizar tabla usuarios para múltiples roles
ALTER TABLE usuarios ADD COLUMN roles TEXT DEFAULT '[]'; -- JSON array

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_permisos_rol ON permisos(rol);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo_codigo);
CREATE INDEX IF NOT EXISTS idx_menu_modulo ON menu_items(modulo_codigo);
CREATE INDEX IF NOT EXISTS idx_actividad_usuario ON actividad_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha ON actividad_log(created_at);

-- ==================== DATOS INICIALES ====================

-- MÓDULOS DEL SISTEMA
INSERT OR IGNORE INTO modulos (codigo, nombre, descripcion, icono, color, ruta, orden) VALUES
('dashboard', 'Dashboard', 'Panel principal con estadísticas', '📊', '#667eea', '/dashboard.html', 1),
('web', 'Gestión Web', 'Administración del sitio web', '🌐', '#10b981', '/admin/web/', 2),
('tesoreria', 'Tesorería', 'Gestión financiera y cuotas', '💰', '#f59e0b', '/admin/tesoreria/', 3),
('administrativo', 'Administrativo', 'Gestión de trámites y expedientes', '📋', '#3b82f6', '/admin/admin/', 4),
('usuarios', 'Usuarios', 'Gestión de usuarios y permisos', '👥', '#8b5cf6', '/admin/usuarios/', 5),
('config', 'Configuración', 'Configuración del sistema', '⚙️', '#6b7280', '/admin/config/', 6);

-- PERMISOS PARA super_admin (acceso total)
INSERT OR IGNORE INTO permisos (rol, modulo_codigo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('super_admin', 'dashboard', 1, 0, 0, 0),
('super_admin', 'web', 1, 1, 1, 1),
('super_admin', 'tesoreria', 1, 1, 1, 1),
('super_admin', 'administrativo', 1, 1, 1, 1),
('super_admin', 'usuarios', 1, 1, 1, 1),
('super_admin', 'config', 1, 1, 1, 1);

-- PERMISOS PARA admin_web (solo gestión web)
INSERT OR IGNORE INTO permisos (rol, modulo_codigo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('admin_web', 'dashboard', 1, 0, 0, 0),
('admin_web', 'web', 1, 1, 1, 1);

-- PERMISOS PARA tesorero (solo tesorería)
INSERT OR IGNORE INTO permisos (rol, modulo_codigo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('tesorero', 'dashboard', 1, 0, 0, 0),
('tesorero', 'web', 1, 0, 0, 0),
('tesorero', 'tesoreria', 1, 1, 1, 1);

-- PERMISOS PARA secretario (administrativo)
INSERT OR IGNORE INTO permisos (rol, modulo_codigo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('secretario', 'dashboard', 1, 0, 0, 0),
('secretario', 'web', 1, 0, 0, 0),
('secretario', 'administrativo', 1, 1, 1, 1);

-- PERMISOS PARA admin (compatibilidad)
INSERT OR IGNORE INTO permisos (rol, modulo_codigo, puede_ver, puede_crear, puede_editar, puede_eliminar) VALUES
('admin', 'dashboard', 1, 0, 0, 0),
('admin', 'web', 1, 1, 1, 1);

-- MENÚ ITEMS - MÓDULO WEB
INSERT OR IGNORE INTO menu_items (modulo_codigo, nombre, ruta, icono, orden, requiere_permiso) VALUES
('web', 'Noticias', '/admin/web/noticias.html', '📰', 1, 'ver'),
('web', 'Comisión Directiva', '/admin/web/comision.html', '👥', 2, 'ver'),
('web', 'Matriculados', '/admin/web/matriculados.html', '📜', 3, 'ver'),
('web', 'Autoridades', '/admin/web/autoridades.html', '🏛️', 4, 'ver');

-- MENÚ ITEMS - MÓDULO TESORERÍA
INSERT OR IGNORE INTO menu_items (modulo_codigo, nombre, ruta, icono, orden, requiere_permiso) VALUES
('tesoreria', 'Cuotas', '/admin/tesoreria/cuotas.html', '💳', 1, 'ver'),
('tesoreria', 'Registrar Pago', '/admin/tesoreria/pagos.html', '💵', 2, 'crear'),
('tesoreria', 'Deudores', '/admin/tesoreria/deudores.html', '⚠️', 3, 'ver'),
('tesoreria', 'Informes', '/admin/tesoreria/informes.html', '📊', 4, 'ver'),
('tesoreria', 'Comprobantes', '/admin/tesoreria/comprobantes.html', '🧾', 5, 'ver');

-- MENÚ ITEMS - MÓDULO ADMINISTRATIVO
INSERT OR IGNORE INTO menu_items (modulo_codigo, nombre, ruta, icono, orden, requiere_permiso) VALUES
('administrativo', 'Trámites', '/admin/admin/tramites.html', '📝', 1, 'ver'),
('administrativo', 'Expedientes', '/admin/admin/expedientes.html', '📁', 2, 'ver'),
('administrativo', 'Documentación', '/admin/admin/documentos.html', '📄', 3, 'ver');

-- MENÚ ITEMS - MÓDULO USUARIOS
INSERT OR IGNORE INTO menu_items (modulo_codigo, nombre, ruta, icono, orden, requiere_permiso) VALUES
('usuarios', 'Gestión de Usuarios', '/admin/usuarios/lista.html', '👤', 1, 'ver'),
('usuarios', 'Roles y Permisos', '/admin/usuarios/permisos.html', '🔐', 2, 'ver'),
('usuarios', 'Actividad', '/admin/usuarios/actividad.html', '📈', 3, 'ver');

-- MENÚ ITEMS - MÓDULO CONFIGURACIÓN
INSERT OR IGNORE INTO menu_items (modulo_codigo, nombre, ruta, icono, orden, requiere_permiso) VALUES
('config', 'General', '/admin/config/general.html', '⚙️', 1, 'ver'),
('config', 'Email', '/admin/config/email.html', '📧', 2, 'ver'),
('config', 'Sistema', '/admin/config/sistema.html', '🖥️', 3, 'ver');

-- Actualizar usuario admin existente con nuevo rol
UPDATE usuarios SET roles = '["super_admin"]' WHERE rol = 'admin' AND roles = '[]';
UPDATE usuarios SET roles = '["colegiado"]' WHERE rol = 'colegiado' AND roles = '[]';

-- ==================== FUNCIONES ÚTILES ====================

-- Vista para obtener permisos de un usuario
CREATE VIEW IF NOT EXISTS v_permisos_usuario AS
SELECT 
    u.id as usuario_id,
    u.username,
    u.rol,
    u.roles,
    m.codigo as modulo_codigo,
    m.nombre as modulo_nombre,
    m.icono as modulo_icono,
    m.color as modulo_color,
    m.ruta as modulo_ruta,
    p.puede_ver,
    p.puede_crear,
    p.puede_editar,
    p.puede_eliminar
FROM usuarios u
CROSS JOIN modulos m
LEFT JOIN permisos p ON (p.rol = u.rol AND p.modulo_codigo = m.codigo)
WHERE m.activo = 1;

-- Vista para menú dinámico
CREATE VIEW IF NOT EXISTS v_menu_completo AS
SELECT 
    mi.id,
    mi.modulo_codigo,
    m.nombre as modulo_nombre,
    m.icono as modulo_icono,
    mi.nombre as item_nombre,
    mi.ruta as item_ruta,
    mi.icono as item_icono,
    mi.orden,
    mi.parent_id,
    mi.requiere_permiso
FROM menu_items mi
JOIN modulos m ON m.codigo = mi.modulo_codigo
WHERE mi.activo = 1 AND m.activo = 1
ORDER BY m.orden, mi.orden;
