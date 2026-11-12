# Guía Completa de Despliegue: Cuaderno Digital del Profesor

Esta guía detalla paso a paso cómo publicar tu **Cuaderno Digital del Profesor** en Internet y cómo vincularlo desde un botón en tu web de **WordPress** ([clavesdemusica.com](https://clavesdemusica.com)).

---

## 📋 Resumen de Opciones de Despliegue

| Opción | Dificultad | Tiempo | Recomendada para |
| :--- | :---: | :---: | :--- |
| **Opción 1: Cloudflare Pages** *(Recomendada)* | Muy fácil | 2 min | Arrastrar y soltar la carpeta sin comandos ni instalaciones. |
| **Opción 2: GitHub Pages** | Fácil | 5 min | Si ya usas GitHub o quieres control de versiones. |
| **Opción 3: Servidor WordPress / Hosting propio** | Fácil | 3 min | Subir el archivo único `CUADERNO_DIGITAL_DOCENTE.html` directamente a tu hosting. |

---

## 🚀 Opción 1: Publicación en Cloudflare Pages (La más rápida y sencilla)

Cloudflare Pages es 100% gratuito, ofrece máxima velocidad, certificado SSL (candado verde HTTPS) y permite desplegar arrastrando la carpeta desde tu ordenador.

### Pasos:
1. Entra en [Cloudflare Pages](https://pages.cloudflare.com/) y crea una cuenta gratuita (o inicia sesión si ya tienes una).
2. En el panel principal, ve a la sección **Workers & Pages** -> **Crear aplicación** -> pestaña **Pages**.
3. Selecciona la opción **"Cargar recursos" (Upload assets)**.
4. Asígnale un nombre a tu proyecto, por ejemplo: `cuaderno-profesor` o `notas-clavesdemusica`.
5. Arrastra la carpeta de tu proyecto `CUADERNO DIGITAL` o selecciónala en el explorador de archivos de tu Mac.
6. Pulsa en **"Implementar sitio" (Deploy site)**.
7. ¡Listo! En 15 segundos Cloudflare te entregará tu enlace seguro oficial, por ejemplo:
   ```text
   https://cuaderno-profesor.pages.dev
   ```

---

## 🐙 Opción 2: Publicación en GitHub Pages

1. Inicia sesión en [GitHub](https://github.com).
2. Haz clic en el botón verde **"New"** para crear un nuevo repositorio:
   - **Repository name**: `cuaderno-profesor`
   - Márcalo como **Public**.
   - Haz clic en **Create repository**.
3. En la pantalla del repositorio, haz clic en **"uploading an existing file"** (subir archivos existentes).
4. Arrastra los archivos de la carpeta `CUADERNO DIGITAL`:
   - `index.html`
   - Carpeta `css` (con `styles.css`)
   - Carpeta `js` (con `config.js`, `storage.js`, `sheets.js`, `export.js`, `app.js`)
   - `alumnos_cache.json`
5. Haz clic en **"Commit changes"**.
6. Ve a la pestaña **Settings** (Configuración del repositorio) -> menú lateral **Pages**.
7. En la sección **Branch**, selecciona `main` y la carpeta `/ (root)`, luego pulsa **Save**.
8. En 1-2 minutos tu web estará publicada en:
   ```text
   https://tu-usuario.github.io/cuaderno-profesor/
   ```

---

## 🌐 Opción 3: Subida directa a tu hosting de WordPress

Hemos creado el archivo independiente **`CUADERNO_DIGITAL_DOCENTE.html`**, que contiene absolutamente todo (código HTML, estilos CSS y lógica JavaScript) en un único archivo autónomo de 144 KB:

1. Accede a tu panel de hosting (cPanel, Plesk o Administrador de Archivos de WordPress).
2. Ve a la carpeta pública de tu web (normalmente `public_html`).
3. Crea una carpeta llamada `cuaderno` y sube el archivo renombrado como `index.html`.
4. Tu enlace directo será:
   ```text
   https://clavesdemusica.com/cuaderno/
   ```

---

## 🔗 Cómo vincular el cuaderno desde un botón en WordPress

Una vez que tengas la URL de tu cuaderno (por ejemplo `https://cuaderno-profesor.pages.dev` o `https://clavesdemusica.com/cuaderno/`):

### En el Editor de Bloques (Gutenberg):
1. Abre en WordPress la página donde quieras colocar el acceso docente (por ejemplo, tu página de profesor o pie de página).
2. Añade un bloque de tipo **Botón**:
   - Texto del botón: `🎵 Acceso al Cuaderno del Profesor`
   - Enlace: Pega la URL de tu cuaderno desplegado.
   - En los ajustes del enlace, activa la casilla **"Abrir en pestaña nueva"** (`target="_blank"`).
3. Guarda o actualiza la página.

### En Elementor (si utilizas este maquetador):
1. Arrastra el widget **Botón** al lugar deseado.
2. En el campo **Enlace**, pega la URL de tu cuaderno.
3. En el icono de engranaje del enlace, marca **"Abrir en nueva ventana"**.
4. Dale tu estilo corporativo (Azul/Índigo `#4F46E5` con texto blanco) y guarda los cambios.

---

## ❓ ¿Es obligatorio o necesario crear un repositorio en GitHub?

**NO, no es obligatorio ni imprescindible.** Tienes total libertad para elegir el método que te resulte más cómodo:

- **Si NO quieres usar GitHub (Recomendado por sencillez):**
  - **Opción A (Cloudflare Pages con subida directa):** Entras en Cloudflare Pages, seleccionas *Upload assets*, arrastras la carpeta de tu cuaderno y en 15 segundos tienes tu enlace activo con SSL (HTTPS) gratuito. Sin crear repositorios, sin comandos y sin configurar Git.
  - **Opción B (Directo en tu WordPress / cPanel):** Puedes subir el archivo único **`CUADERNO_DIGITAL_DOCENTE.html`** directamente a tu propio servidor de WordPress por cPanel o FTP. De ese modo la URL pertenecerá a tu propio dominio (ej: `https://gustavomartinmusica.com/cuaderno/` o `https://clavesdemusica.com/cuaderno/`).

- **Si SÍ quieres usar GitHub:**
  - Solo es necesario si decides alojarlo en **GitHub Pages** o si deseas guardar el historial de cambios y versiones de tu código en tu cuenta de GitHub. Más abajo te dejamos los pasos guiados si decides optar por esta vía.

---

## 🔒 Contraseña y Protección de Datos (RGPD)

1. **Contraseña Docente Maestra:**
   - Para acceder al cuaderno a través de la landing page se solicitará la contraseña de alta seguridad: **`1750*Diag0nal*121068`**.
   - Incluye aviso explícito de confidencialidad y protección de datos académicos de alumnado menor de edad (RGPD).
   - El formulario cuenta con un botón en forma de ojo para mostrar u ocultar los caracteres introducidos.
   - La sesión docente se preserva de forma segura durante la jornada lectiva y puedes pulsar el botón **"Bloquear"** en la barra superior en cualquier momento para volver a proteger el cuaderno.

2. **Permisos de las Hojas de Cálculo en Google Drive**:
   - Para que el cuaderno pueda consultar y actualizar las calificaciones de cada app, la hoja de cálculo en Drive debe tener permiso de lectura compartido:
     - En Google Drive, abre la hoja (ej: `Calificaciones_Lectura`, `Calificaciones_Dictados`, etc.).
     - Pulsa el botón superior **"Compartir"**.
     - En **Acceso general**, selecciona: **"Cualquier persona con el enlace"** con rol **"Lector"**.
     - ¡Eso es todo! No se necesitan claves de API ni configuraciones complejas.

3. **Incorporar nuevas apps en el futuro (Botón "Añadir app +")**:
   - Dentro del cuaderno, pulsa el botón **"Añadir app +"**.
   - Escribe el nombre de la app (ej: *Calificaciones_Ritmo*) y pega la URL de su Google Sheet.
   - El cuaderno la incorporará automáticamente como una nueva columna con su respectivo desglose.
