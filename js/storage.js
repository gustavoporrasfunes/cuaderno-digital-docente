/**
 * GESTIÓN DE ALMACENAMIENTO (SESSION Y LOCAL STORAGE)
 * Autenticación, persistencia de apps y caché de calificaciones.
 */

const StorageManager = {
  KEYS: {
    AUTH: "cuaderno_auth_docente",
    APPS: "cuaderno_apps_config_v1",
    DEMO_MODE: "cuaderno_demo_mode",
    STUDENTS_CACHE: "cuaderno_students_cache",
    ACTIVE_GROUP: "cuaderno_active_group_id",
    DATE_RANGE: "cuaderno_date_range_filter"
  },

  // ==========================================
  // AUTENTICACIÓN (Requisito 2)
  // ==========================================
  isAuthenticated() {
    return sessionStorage.getItem(this.KEYS.AUTH) === "true";
  },

  login(password) {
    if (password && password.trim() === CONFIG.CLAVE_DOCENTE) {
      sessionStorage.setItem(this.KEYS.AUTH, "true");
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.KEYS.AUTH);
  },

  // ==========================================
  // APLICACIONES Y HOJAS GOOGLE SHEETS (Requisito 8)
  // ==========================================
  getAppsList() {
    const raw = localStorage.getItem(this.KEYS.APPS);
    if (!raw) {
      // Devolver copia profunda de las 5 apps base
      return JSON.parse(JSON.stringify(CONFIG.APPS_BASE));
    }
    try {
      const stored = JSON.parse(raw);
      // Asegurar que las apps base siempre existan y en el orden correcto
      const baseApps = JSON.parse(JSON.stringify(CONFIG.APPS_BASE));
      const merged = baseApps.map(base => {
        const custom = stored.find(s => s.id === base.id);
        const obj = {
          ...base,
          bloque: CONFIG.BLOQUES.LENGUAJE,
          bloqueNombre: CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.LENGUAJE]
        };
        if (custom) {
          obj.urlSheet = custom.urlSheet || base.urlSheet;
          obj.sheetId = custom.sheetId || base.sheetId;
          obj.tituloVisible = custom.tituloVisible || base.tituloVisible;
        }
        return obj;
      });

      // Añadir apps adicionales creadas por el profesor con "Añadir app +"
      const customOnes = stored
        .filter(s => !CONFIG.APPS_BASE.some(b => b.id === s.id))
        .map(c => {
          const b = c.bloque || CONFIG.BLOQUES.ACTIVIDADES;
          return {
            ...c,
            bloque: b,
            bloqueNombre: CONFIG.NOMBRES_BLOQUES[b] || CONFIG.NOMBRES_BLOQUES[CONFIG.BLOQUES.ACTIVIDADES]
          };
        });
      return [...merged, ...customOnes];
    } catch(e) {
      console.error("Error al leer apps del storage:", e);
      return JSON.parse(JSON.stringify(CONFIG.APPS_BASE));
    }
  },

  saveAppsList(appsArray) {
    try {
      localStorage.setItem(this.KEYS.APPS, JSON.stringify(appsArray));
      return true;
    } catch(e) {
      console.error("Error al guardar apps:", e);
      return false;
    }
  },

  // Añadir una nueva aplicación (Requisito 8 y división en bloques)
  addCustomApp(nombre, urlSheet, bloque = CONFIG.BLOQUES.ACTIVIDADES) {
    const sheetId = CONFIG.extraerSheetId(urlSheet);
    if (!sheetId) {
      throw new Error("La URL de Google Sheet proporcionada no contiene un ID válido.");
    }

    const bloqueTarget = bloque || CONFIG.BLOQUES.ACTIVIDADES;
    const apps = this.getAppsList();
    const id = "custom_" + Date.now();
    const nuevaApp = {
      id: id,
      nombre: nombre.trim().replace(/\s+/g, "_"),
      tituloVisible: nombre.trim(),
      descripcion: bloqueTarget === CONFIG.BLOQUES.ACTIVIDADES ? "Actividad interactiva evaluable" : "Aplicación de Lenguaje Musical",
      urlSheet: urlSheet.trim(),
      sheetId: sheetId,
      bloque: bloqueTarget,
      bloqueNombre: CONFIG.NOMBRES_BLOQUES[bloqueTarget] || "Actividades Interactivas Evaluables",
      icono: bloqueTarget === CONFIG.BLOQUES.ACTIVIDADES ? "🧩" : "🎵",
      color: bloqueTarget === CONFIG.BLOQUES.ACTIVIDADES ? "#0284c7" : "#4f46e5",
      esPersonalizada: true,
      fechaCreacion: new Date().toISOString()
    };

    apps.push(nuevaApp);
    this.saveAppsList(apps);
    return nuevaApp;
  },

  // Actualizar la URL de una app existente
  updateAppUrl(appId, urlSheet) {
    const apps = this.getAppsList();
    const app = apps.find(a => a.id === appId);
    if (!app) throw new Error("Aplicación no encontrada");

    const sheetId = CONFIG.extraerSheetId(urlSheet) || "";
    app.urlSheet = urlSheet.trim();
    app.sheetId = sheetId;
    this.saveAppsList(apps);
    return app;
  },

  // Eliminar una app personalizada
  deleteCustomApp(appId) {
    const apps = this.getAppsList();
    const filtradas = apps.filter(a => a.id !== appId);
    this.saveAppsList(filtradas);
    return filtradas;
  },

  // ==========================================
  // GRUPO ACTIVO Y FECHAS
  // ==========================================
  getActiveGroupId() {
    return localStorage.getItem(this.KEYS.ACTIVE_GROUP) || "1ESO-A";
  },

  setActiveGroupId(groupId) {
    localStorage.setItem(this.KEYS.ACTIVE_GROUP, groupId);
  },

  getDateRange() {
    const raw = localStorage.getItem(this.KEYS.DATE_RANGE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          inicioISO: parsed.inicioISO,
          finISO: parsed.finISO
        };
      } catch(e) {}
    }
    return CONFIG.obtenerRangoFechasPorDefecto();
  },

  saveDateRange(inicioISO, finISO) {
    localStorage.setItem(this.KEYS.DATE_RANGE, JSON.stringify({ inicioISO, finISO }));
  },

  // ==========================================
  // MODO DEMO / SIMULACIÓN
  // ==========================================
  isDemoModeActive() {
    return localStorage.getItem(this.KEYS.DEMO_MODE) === "true";
  },

  setDemoMode(enabled) {
    localStorage.setItem(this.KEYS.DEMO_MODE, enabled ? "true" : "false");
  }
};

window.StorageManager = StorageManager;
