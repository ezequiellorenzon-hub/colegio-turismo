-- ==================== GALERÍA DE NOTICIAS NORMALIZADA ====================

-- Tabla para las imágenes de la galería de cada noticia
CREATE TABLE IF NOT EXISTS news_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER NOT NULL,
    image_filename TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_news_gallery_news_id ON news_gallery(news_id);
CREATE INDEX IF NOT EXISTS idx_news_gallery_order ON news_gallery(news_id, image_order);
