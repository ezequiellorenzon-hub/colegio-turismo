# 🏛️ Colegio de Profesionales en Turismo

Sitio web corporativo completo para un colegio de profesionales con panel de administración.

## 🚀 Características

### Secciones Públicas:
- ✅ Home con hero section y noticias destacadas
- ✅ Noticias y comunicados
- ✅ Comisión Directiva
- ✅ Listado de Profesionales Matriculados (con búsqueda)
- ✅ Contacto

### Panel de Administración:
- ✅ Gestión de Noticias (crear, eliminar, destacar)
- ✅ Gestión de Comisión Directiva
- ✅ Gestión de Profesionales Matriculados
- ✅ Base de datos SQLite

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
```

El sitio estará disponible en: http://localhost:3000

## 🗂️ Estructura

```
colegio-turismo/
├── server.js              → Backend con SQLite
├── colegio.db            → Base de datos (auto-generada)
├── public/
│   ├── index.html        → Home
│   ├── noticias.html     → Blog/Noticias
│   ├── comision.html     → Comisión Directiva
│   ├── matriculados.html → Listado de profesionales
│   ├── contacto.html     → Información de contacto
│   ├── admin.html        → Panel de administración
│   └── assets/
│       └── css/
│           └── style.css → Estilos globales
```

## 📊 Base de Datos

### Tablas:
1. **news** - Noticias y comunicados
2. **board_members** - Comisión directiva
3. **members** - Profesionales matriculados
4. **settings** - Configuración del sitio

## 🎨 Personalización

Para adaptar a otro tipo de organización:
1. Editar `settings` en la base de datos
2. Modificar colores en `:root` en `style.css`
3. Cambiar textos en `index.html`

## 🔧 API Endpoints

### Noticias
- GET `/api/news` - Todas las noticias
- GET `/api/news/featured` - Noticias destacadas
- POST `/api/news` - Crear noticia
- DELETE `/api/news/:id` - Eliminar noticia

### Comisión Directiva
- GET `/api/board` - Todos los miembros
- POST `/api/board` - Agregar miembro
- DELETE `/api/board/:id` - Eliminar miembro

### Profesionales
- GET `/api/members` - Todos los profesionales
- GET `/api/members/search?q=texto` - Buscar
- POST `/api/members` - Registrar profesional
- DELETE `/api/members/:id` - Eliminar profesional

## 💡 Próximas Mejoras

- [ ] Autenticación para el panel admin
- [ ] Sistema de roles (admin/editor)
- [ ] Carga de imágenes real
- [ ] Exportar listado a PDF/Excel
- [ ] Newsletter
- [ ] Eventos y calendario

## 📝 Licencia

MIT - Uso educativo
