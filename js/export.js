/**
 * EXPORTACIÓN DE CALIFICACIONES (Requisito 7)
 * Permite descargar:
 * 1. Solo listado de alumnos y sus notas medias.
 * 2. Todas las notas (resumen completo).
 * 3. Selección de una aplicación específica (ej: solo lectura).
 */

const ExportService = {
  // Modal de opciones de descarga
  mostrarModalDescarga(grupoActual, datosFiltrados, appsVisibles) {
    const modal = document.getElementById("modal-descargar-notas");
    if (!modal) return;

    // Rellenar selector de apps
    const selectApp = document.getElementById("descarga-select-app");
    if (selectApp) {
      selectApp.innerHTML = "";
      appsVisibles.forEach(app => {
        const opt = document.createElement("option");
        opt.value = app.id;
        opt.textContent = `${app.icono || "📊"} ${app.tituloVisible} (${app.nombre})`;
        selectApp.appendChild(opt);
      });
    }

    modal.classList.remove("hidden");
  },

  cerrarModalDescarga() {
    const modal = document.getElementById("modal-descargar-notas");
    if (modal) modal.classList.add("hidden");
  },

  // Ejecuta la descarga según la opción elegida
  ejecutarDescarga(tipoOpcion, grupoActual, matrizDatos, appsVisibles, appIdSeleccionada, formato = "csv") {
    const fechaHoy = new Date().toISOString().split("T")[0];
    let nombreArchivo = "";
    let filasCsv = [];

    // =========================================================================
    // CASO 1: SOLO LISTADO DE ALUMNOS Y SUS NOTAS MEDIAS (Requisito 7.1)
    // =========================================================================
    if (tipoOpcion === "solo_medias") {
      nombreArchivo = `Acta_Medias_${grupoActual.codigo || grupoActual.id}_${fechaHoy}.${formato}`;
      
      // Cabecera
      filasCsv.push([
        "Grupo",
        "Apellidos y Nombre",
        "Nota Media Global",
        "Tiempo Total Invertido (min)",
        "Total Actividades Realizadas",
        "Calificación Cualitativa"
      ]);

      matrizDatos.forEach(fila => {
        const cal = fila.notaMediaGlobal !== null ? fila.notaMediaGlobal.toFixed(2) : "Sin datos";
        const cualitativa = fila.notaMediaGlobal !== null ? this._obtenerTextoCualitativo(fila.notaMediaGlobal) : "No presentado";
        const tiempoMin = Math.round((fila.tiempoTotalSegundos || 0) / 60);

        filasCsv.push([
          grupoActual.codigo || grupoActual.id,
          fila.alumno.textoDesplegable,
          cal,
          tiempoMin,
          fila.totalPruebasRealizadas || 0,
          cualitativa
        ]);
      });
    }

    // =========================================================================
    // CASO 2: TODAS LAS NOTAS (RESUMEN COMPLETO DE TODAS LAS APPS) (Requisito 7.2)
    // =========================================================================
    else if (tipoOpcion === "todas_las_notas") {
      nombreArchivo = `Acta_Completa_${grupoActual.codigo || grupoActual.id}_${fechaHoy}.${formato}`;

      // Cabecera con todas las columnas de apps
      const cabecera = [
        "Grupo",
        "Apellidos y Nombre",
        "Nota Media Global",
        "Tiempo Total Invertido (min)"
      ];

      appsVisibles.forEach(app => {
        cabecera.push(`Media: ${app.tituloVisible}`);
      });

      filasCsv.push(cabecera);

      matrizDatos.forEach(fila => {
        const cal = fila.notaMediaGlobal !== null ? fila.notaMediaGlobal.toFixed(2) : "Sin datos";
        const tiempoMin = Math.round((fila.tiempoTotalSegundos || 0) / 60);

        const filaCsv = [
          grupoActual.codigo || grupoActual.id,
          fila.alumno.textoDesplegable,
          cal,
          tiempoMin
        ];

        appsVisibles.forEach(app => {
          const datoApp = fila.appsNotas[app.id];
          if (datoApp && datoApp.notaMedia !== null && datoApp.notaMedia !== undefined) {
            filaCsv.push(datoApp.notaMedia.toFixed(2));
          } else {
            filaCsv.push("-");
          }
        });

        filasCsv.push(filaCsv);
      });
    }

    // =========================================================================
    // CASO 3: APLICACIÓN ESPECÍFICA (ej: solo notas de Lectura) (Requisito 7.3)
    // =========================================================================
    else if (tipoOpcion === "app_especifica") {
      const app = appsVisibles.find(a => a.id === appIdSeleccionada) || appsVisibles[0];
      nombreArchivo = `Acta_${app ? app.nombre : "App"}_${grupoActual.codigo || grupoActual.id}_${fechaHoy}.${formato}`;

      filasCsv.push([
        "Grupo",
        "Apellidos y Nombre",
        `Nota Media (${app ? app.tituloVisible : "App"})`,
        "Total Intentos",
        "Tiempo Invertido (min)",
        "Desglose de Pruebas (Fecha - Nota - Nivel)"
      ]);

      matrizDatos.forEach(fila => {
        const datoApp = fila.appsNotas[app.id];
        if (datoApp && datoApp.notaMedia !== null) {
          const tiempoMin = Math.round((datoApp.sumaSegundos || 0) / 60);
          const desglose = (datoApp.pruebas || []).map(p => 
            `[${p.fechaVisible || "Fecha"}: ${p.nota.toFixed(1)} pts (${p.nivel || ""})]`
          ).join(" | ");

          filasCsv.push([
            grupoActual.codigo || grupoActual.id,
            fila.alumno.textoDesplegable,
            datoApp.notaMedia.toFixed(2),
            datoApp.pruebas.length,
            tiempoMin,
            desglose
          ]);
        } else {
          filasCsv.push([
            grupoActual.codigo || grupoActual.id,
            fila.alumno.textoDesplegable,
            "Sin datos",
            0,
            0,
            "Sin pruebas realizadas"
          ]);
        }
      });
    }

    // Generar y disparar la descarga
    this._descargarArchivoCsv(filasCsv, nombreArchivo);
    this.cerrarModalDescarga();
  },

  // Genera el archivo CSV con BOM para visualización perfecta en Excel
  _descargarArchivoCsv(matrizFilas, nombreArchivo) {
    const contenidoCsv = matrizFilas.map(fila => 
      fila.map(celda => {
        let str = String(celda ?? "");
        // Escapar comillas dobles
        if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(";") // Usamos punto y coma para Excel en español
    ).join("\r\n");

    // BOM UTF-8 (\uFEFF) para que Excel abra caracteres con tildes y ñ sin corromperlos
    const blob = new Blob(["\uFEFF" + contenidoCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  _obtenerTextoCualitativo(nota) {
    if (nota === null || nota === undefined) return "Sin datos";
    if (nota < 5) return "Insuficiente";
    if (nota < 6) return "Suficiente";
    if (nota < 7) return "Bien";
    if (nota < 9) return "Notable";
    return "Sobresaliente";
  },

  // =========================================================================
  // MEJORA 2: GENERACIÓN DE INFORME PERSONALIZADO DEL ALUMNO EN PDF
  // =========================================================================
  generarInformePDFAlumno(alumnoFila, grupoActual, appsConfiguradas, rangoFechas) {
    if (!alumnoFila || !grupoActual) return;

    const htmlInforme = this._construirHtmlInforme(alumnoFila, grupoActual, appsConfiguradas, rangoFechas);

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.setAttribute("title", "Impresión de informe");
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlInforme);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch(err) {
          console.warn("Impresión directa por iframe no disponible, abriendo ventana:", err);
          this._abrirVentanaImpresion(htmlInforme);
        } finally {
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 6000);
        }
      }, 450);
    } catch(e) {
      this._abrirVentanaImpresion(htmlInforme);
    }
  },

  _abrirVentanaImpresion(htmlInforme) {
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.document.write(htmlInforme);
      ventana.document.close();
      ventana.focus();
      setTimeout(() => ventana.print(), 500);
    }
  },

  _formatearFechaEspanol(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha);
    const opciones = { day: "numeric", month: "long", year: "numeric" };
    return d.toLocaleDateString("es-ES", opciones);
  },

  _formatearFechaCorta(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha);
    const meses = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    return `${d.getDate()} ${meses[d.getMonth()]}`;
  },

  _obtenerColorNotaEstilo(nota) {
    if (nota === null || nota === undefined) {
      return { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
    }
    if (nota >= 7) {
      return { bg: "#dcfce7", color: "#15803d", border: "#86efac" };
    }
    if (nota >= 6) {
      return { bg: "#fef9c3", color: "#854d0e", border: "#fde047" };
    }
    if (nota >= 5) {
      return { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" };
    }
    return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
  },

  _generarComentarioPedagogico(notaGlobal) {
    if (notaGlobal === null || notaGlobal === undefined) {
      return "No se dispone de calificaciones registradas para este periodo. Le rogamos contacte con el profesor para verificar el seguimiento del alumno/a.";
    }
    if (notaGlobal >= 9) {
      return "Excelente rendimiento y gran dominio de los contenidos musicales trabajados. Demuestra constancia, agilidad auditiva y lectura fluida en el uso del cuaderno digital. ¡Enhorabuena por el trabajo realizado!";
    }
    if (notaGlobal >= 7) {
      return "Muy buen trabajo y evolución positiva en las actividades musicales. Se recomienda mantener la regularidad en la práctica semanal para consolidar la precisión en dictados rítmicos y compases.";
    }
    if (notaGlobal >= 6) {
      return "Rendimiento satisfactorio, alcanzando los objetivos propuestos. Conviene dedicar unos minutos más a la semana para afianzar la soltura y velocidad en la lectura y dictados.";
    }
    if (notaGlobal >= 5) {
      return "Alcanza los objetivos mínimos imprescindibles. Es importante reforzar la práctica en casa y realizar más intentos en las actividades con menor puntuación para asentar los conceptos musicales.";
    }
    return "No se alcanzan los objetivos mínimos en este periodo. Es fundamental incrementar el tiempo de práctica activa, realizar nuevos intentos en las actividades pendientes y solicitar apoyo al profesor en clase.";
  },

  _construirHtmlInforme(alumnoFila, grupoActual, appsConfiguradas, rangoFechas) {
    const nombreAlumno = alumnoFila.alumno ? alumnoFila.alumno.textoDesplegable : "Alumno/a";
    const nombreLimpio = nombreAlumno.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, "_");
    const tituloGrupo = grupoActual.titulo || grupoActual.id || "";
    const subtituloGrupo = grupoActual.subtitulo || `Clase de Música. ${grupoActual.curso || ""}`;
    const fechaHoyTxt = this._formatearFechaEspanol(new Date());

    // Rango de fechas
    let periodoTxt = "Curso Actual";
    if (rangoFechas && rangoFechas.inicio && rangoFechas.fin) {
      const hoy = new Date();
      const esHoy = rangoFechas.fin.toDateString() === hoy.toDateString();
      const fFinTxt = esHoy ? "Hoy" : this._formatearFechaCorta(rangoFechas.fin);
      periodoTxt = `${this._formatearFechaCorta(rangoFechas.inicio)} - ${fFinTxt}`;
    }

    // Nota global y métricas
    const notaGlobal = alumnoFila.notaMediaGlobal;
    const notaGlobalTxt = notaGlobal !== null ? notaGlobal.toFixed(1) : "—";
    const cualitativaGlobal = this._obtenerTextoCualitativo(notaGlobal).toUpperCase();
    const estiloNotaGlobal = this._obtenerColorNotaEstilo(notaGlobal);
    const minutosTotales = Math.round((alumnoFila.tiempoTotalSegundos || 0) / 60);
    const totalPruebas = alumnoFila.totalPruebasRealizadas || 0;
    const comentarioOrientacion = this._generarComentarioPedagogico(notaGlobal);

    // Separar apps en Bloque 1 (Lenguaje Musical) y Bloque 2 (Actividades Interactivas)
    const appsLenguaje = (appsConfiguradas || []).filter(a => a.bloque !== "actividades");
    const appsActividades = (appsConfiguradas || []).filter(a => a.bloque === "actividades");

    // Construir filas de tabla para Lenguaje Musical
    let sumaNotasLenguaje = 0;
    let conteoNotasLenguaje = 0;
    let filasLenguajeHtml = "";

    appsLenguaje.forEach(app => {
      const appKey = app.id || app.appId;
      const datoApp = alumnoFila.appsNotas ? alumnoFila.appsNotas[appKey] : null;
      const tieneDatos = datoApp && datoApp.totalPruebas > 0;
      const notaApp = tieneDatos ? datoApp.notaMedia : null;
      const strNota = tieneDatos && notaApp !== null ? notaApp.toFixed(1) : "—";
      const cualitativa = tieneDatos && notaApp !== null ? this._obtenerTextoCualitativo(notaApp) : "Pendiente";
      const tiempoMin = tieneDatos ? Math.round((datoApp.sumaSegundos || 0) / 60) : 0;
      const intentos = tieneDatos ? datoApp.totalPruebas : 0;
      const estiloBadge = this._obtenerColorNotaEstilo(notaApp);

      if (tieneDatos && notaApp !== null) {
        sumaNotasLenguaje += notaApp;
        conteoNotasLenguaje++;
      }

      filasLenguajeHtml += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">${app.icono || '🎼'}</span>
              <div>
                <strong>${app.tituloVisible || app.nombre}</strong>
                <div style="font-size:10px; color:#64748b;">${app.nombre}</div>
              </div>
            </div>
          </td>
          <td style="text-align:center;">${intentos > 0 ? `${intentos} prueba${intentos > 1 ? 's' : ''}` : '<span style="color:#94a3b8;">0</span>'}</td>
          <td style="text-align:center;">${tiempoMin > 0 ? `${tiempoMin} min` : '<span style="color:#94a3b8;">—</span>'}</td>
          <td style="text-align:center;">
            <span style="display:inline-block; font-weight:800; padding:2px 8px; border-radius:12px; background:${estiloBadge.bg}; color:${estiloBadge.color}; border:1px solid ${estiloBadge.border};">
              ${strNota}
            </span>
          </td>
          <td style="text-align:center; font-weight:600; color:${estiloBadge.color}; font-size:11px;">
            ${cualitativa}
          </td>
        </tr>
      `;
    });

    const mediaLenguaje = conteoNotasLenguaje > 0 ? (sumaNotasLenguaje / conteoNotasLenguaje) : null;
    const strMediaLenguaje = mediaLenguaje !== null ? mediaLenguaje.toFixed(1) : "—";
    const estiloMediaLenguaje = this._obtenerColorNotaEstilo(mediaLenguaje);

    // Construir filas de tabla para Actividades Interactivas
    let sumaNotasActividades = 0;
    let conteoNotasActividades = 0;
    let filasActividadesHtml = "";

    appsActividades.forEach(app => {
      const appKey = app.id || app.appId;
      const datoApp = alumnoFila.appsNotas ? alumnoFila.appsNotas[appKey] : null;
      const tieneDatos = datoApp && datoApp.totalPruebas > 0;
      const notaApp = tieneDatos ? datoApp.notaMedia : null;
      const strNota = tieneDatos && notaApp !== null ? notaApp.toFixed(1) : "—";
      const cualitativa = tieneDatos && notaApp !== null ? this._obtenerTextoCualitativo(notaApp) : "Pendiente";
      const tiempoMin = tieneDatos ? Math.round((datoApp.sumaSegundos || 0) / 60) : 0;
      const intentos = tieneDatos ? datoApp.totalPruebas : 0;
      const estiloBadge = this._obtenerColorNotaEstilo(notaApp);

      if (tieneDatos && notaApp !== null) {
        sumaNotasActividades += notaApp;
        conteoNotasActividades++;
      }

      filasActividadesHtml += `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">${app.icono || '🧩'}</span>
              <div>
                <strong>${app.tituloVisible || app.nombre}</strong>
                <div style="font-size:10px; color:#64748b;">${app.nombre}</div>
              </div>
            </div>
          </td>
          <td style="text-align:center;">${intentos > 0 ? `${intentos} act.` : '<span style="color:#94a3b8;">0</span>'}</td>
          <td style="text-align:center;">${tiempoMin > 0 ? `${tiempoMin} min` : '<span style="color:#94a3b8;">—</span>'}</td>
          <td style="text-align:center;">
            <span style="display:inline-block; font-weight:800; padding:2px 8px; border-radius:12px; background:${estiloBadge.bg}; color:${estiloBadge.color}; border:1px solid ${estiloBadge.border};">
              ${strNota}
            </span>
          </td>
          <td style="text-align:center; font-weight:600; color:${estiloBadge.color}; font-size:11px;">
            ${cualitativa}
          </td>
        </tr>
      `;
    });

    const tieneActividades = appsActividades.length > 0 && conteoNotasActividades > 0;
    const mediaActividades = conteoNotasActividades > 0 ? (sumaNotasActividades / conteoNotasActividades) : null;
    const strMediaActividades = mediaActividades !== null ? mediaActividades.toFixed(1) : "—";
    const estiloMediaActividades = this._obtenerColorNotaEstilo(mediaActividades);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe_Musica_${nombreLimpio}_${tituloGrupo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print-bar {
      background: #1e293b;
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .btn-action-print {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-action-close {
      background: transparent;
      color: #cbd5e1;
      border: 1px solid #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }

    .informe-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px 20px;
    }

    /* Cabecera Oficial */
    .header-doc {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      height: 44px;
      object-fit: contain;
    }
    .brand-titles h1 {
      font-size: 16px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.3px;
    }
    .brand-titles p {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .header-badge {
      text-align: right;
    }
    .tag-oficial {
      display: inline-block;
      background: #eef2ff;
      color: #4338ca;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border: 1px solid #c7d2fe;
    }
    .fecha-emision {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Tarjeta de Datos del Alumno */
    .datos-alumno-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .dato-item label {
      display: block;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .dato-item strong {
      display: block;
      font-size: 12.5px;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Resumen Global Destacado */
    .resumen-global-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 18px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .resumen-global-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nota-circle-badge {
      width: 58px;
      height: 58px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      line-height: 1;
    }
    .nota-circle-badge small {
      font-size: 8.5px;
      font-weight: 700;
      opacity: 0.85;
      margin-top: 2px;
    }
    .resumen-textos h2 {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .resumen-textos p {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .resumen-stats-right {
      display: flex;
      align-items: center;
      gap: 14px;
      text-align: right;
    }
    .stat-box {
      border-left: 2px solid #e2e8f0;
      padding-left: 12px;
    }
    .stat-box span {
      display: block;
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .stat-box strong {
      display: block;
      font-size: 13px;
      color: #1e293b;
      margin-top: 1px;
    }

    /* Secciones de Bloques */
    .bloque-seccion {
      margin-bottom: 16px;
    }
    .bloque-titulo-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px 6px 0 0;
      padding: 6px 12px;
    }
    .bloque-titulo-bar h3 {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bloque-media-badge {
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Tablas de Calificaciones */
    .tabla-bloque {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-top: none;
      font-size: 11px;
    }
    .tabla-bloque th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.5px;
      padding: 6px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .tabla-bloque td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .tabla-bloque tr:last-child td {
      border-bottom: none;
    }
    .tabla-bloque tr:nth-child(even) td {
      background: #fafafa;
    }

    .caja-vacia-bloque {
      border: 1px dashed #cbd5e1;
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 12px;
      text-align: center;
      color: #64748b;
      font-size: 11px;
      background: #fbfcfe;
    }

    /* Caja de Orientaciones Pedagógicas */
    .orientaciones-card {
      background: #fdfefe;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .orientaciones-card h4 {
      font-size: 11.5px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .orientaciones-card p {
      font-size: 11px;
      color: #334155;
      line-height: 1.45;
    }

    /* Firmas */
    .firmas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 18px;
      padding-top: 10px;
    }
    .firma-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      text-align: center;
      font-size: 10px;
      color: #475569;
    }
    .firma-box strong {
      display: block;
      font-size: 11px;
      color: #0f172a;
      margin-bottom: 2px;
    }

    /* Pie de Página */
    .footer-doc {
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Barra de acciones en pantalla (Oculta al imprimir) -->
  <div class="no-print-bar">
    <div style="font-size:13px; font-weight:700;">📄 Informe Informativo de Calificaciones para Familias</div>
    <div style="display:flex; gap:10px;">
      <button type="button" class="btn-action-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
      <button type="button" class="btn-action-close" onclick="window.close()">✕ Cerrar ventana</button>
    </div>
  </div>

  <div class="informe-container">
    
    <!-- 1. Cabecera Oficial -->
    <div class="header-doc">
      <div class="header-brand">
        <img src="https://clavesdemusica.com/wp-content/uploads/2023/08/header2.png" alt="Claves de Música" class="logo-img" onerror="this.style.display='none'">
        <div class="brand-titles">
          <h1>Cuaderno Digital del Profesor</h1>
          <p>Departamento de Música • Claves de Música</p>
        </div>
      </div>
      <div class="header-badge">
        <span class="tag-oficial">Informe para Familias</span>
        <div class="fecha-emision">Emisión: ${fechaHoyTxt}</div>
      </div>
    </div>

    <!-- 2. Tarjeta de Datos del Alumno -->
    <div class="datos-alumno-grid">
      <div class="dato-item">
        <label>Alumno / Alumna</label>
        <strong>${nombreAlumno}</strong>
      </div>
      <div class="dato-item">
        <label>Curso y Grupo</label>
        <strong>${tituloGrupo} • ${subtituloGrupo.replace("Clase de Música. ", "")}</strong>
      </div>
      <div class="dato-item">
        <label>Profesor</label>
        <strong>Gustavo</strong>
      </div>
      <div class="dato-item">
        <label>Periodo Evaluado</label>
        <strong>${periodoTxt}</strong>
      </div>
    </div>

    <!-- 3. Resumen Global Destacado -->
    <div class="resumen-global-banner">
      <div class="resumen-global-left">
        <div class="nota-circle-badge" style="background:${estiloNotaGlobal.bg}; color:${estiloNotaGlobal.color}; border:2px solid ${estiloNotaGlobal.border};">
          ${notaGlobalTxt}
          <small>/ 10</small>
        </div>
        <div class="resumen-textos">
          <h2>Calificación Global: <span style="color:${estiloNotaGlobal.color};">${cualitativaGlobal}</span></h2>
          <p>Escala oficial de evaluación: 0 a 10 puntos ponderados.</p>
        </div>
      </div>
      <div class="resumen-stats-right">
        <div class="stat-box">
          <span>Tiempo Invertido</span>
          <strong>${minutosTotales} minutos</strong>
        </div>
        <div class="stat-box">
          <span>Pruebas Realizadas</span>
          <strong>${totalPruebas} actividades</strong>
        </div>
      </div>
    </div>

    <!-- 4. Bloque 1: Lenguaje Musical -->
    <div class="bloque-seccion">
      <div class="bloque-titulo-bar">
        <h3>🎼 Área 1: Lenguaje Musical (Lectura, Equivalencias, Compases, Intervalos y Dictados)</h3>
        <div class="bloque-media-badge">
          <span>Media del Área:</span>
          <span style="font-weight:800; padding:2px 7px; border-radius:10px; background:${estiloMediaLenguaje.bg}; color:${estiloMediaLenguaje.color}; border:1px solid ${estiloMediaLenguaje.border};">
            ${strMediaLenguaje}
          </span>
        </div>
      </div>

      <table class="tabla-bloque">
        <thead>
          <tr>
            <th style="text-align:left;">Aplicación / Contenido Musical</th>
            <th style="text-align:center; width:110px;">Intentos</th>
            <th style="text-align:center; width:110px;">Tiempo</th>
            <th style="text-align:center; width:90px;">Nota Media</th>
            <th style="text-align:center; width:110px;">Valoración</th>
          </tr>
        </thead>
        <tbody>
          ${filasLenguajeHtml}
        </tbody>
      </table>
    </div>

    <!-- 5. Bloque 2: Actividades Interactivas Evaluables -->
    <div class="bloque-seccion">
      <div class="bloque-titulo-bar">
        <h3>🧩 Área 2: Actividades Interactivas Evaluables</h3>
        ${tieneActividades ? `
          <div class="bloque-media-badge">
            <span>Media del Área:</span>
            <span style="font-weight:800; padding:2px 7px; border-radius:10px; background:${estiloMediaActividades.bg}; color:${estiloMediaActividades.color}; border:1px solid ${estiloMediaActividades.border};">
              ${strMediaActividades}
            </span>
          </div>
        ` : ''}
      </div>

      ${tieneActividades ? `
        <table class="tabla-bloque">
          <thead>
            <tr>
              <th style="text-align:left;">Actividad Interactiva</th>
              <th style="text-align:center; width:110px;">Intentos</th>
              <th style="text-align:center; width:110px;">Tiempo</th>
              <th style="text-align:center; width:90px;">Nota Media</th>
              <th style="text-align:center; width:110px;">Valoración</th>
            </tr>
          </thead>
          <tbody>
            ${filasActividadesHtml}
          </tbody>
        </table>
      ` : `
        <div class="caja-vacia-bloque">
          <span>ℹ️ En el periodo actual no se han registrado actividades interactivas evaluables adicionales para este grupo.</span>
        </div>
      `}
    </div>

    <!-- 6. Orientaciones y Observaciones del Profesor -->
    <div class="orientaciones-card">
      <h4>💡 Orientaciones Pedagógicas y Observaciones</h4>
      <p>${comentarioOrientacion}</p>
    </div>

    <!-- 7. Firmas de Validación y Recepción -->
    <div class="firmas-grid">
      <div class="firma-box">
        <strong>Fdo: Gustavo</strong>
        <span>Profesor de Música</span>
      </div>
      <div class="firma-box">
        <strong>Recibido por el Padre / Madre / Tutor Legal</strong>
        <span>Firma y Fecha: ____________________________________</span>
      </div>
    </div>

    <!-- 8. Pie de Página -->
    <div class="footer-doc">
      <span>Cuaderno Digital Docente • Claves de Música • https://clavesdemusica.com</span>
      <span>Documento de seguimiento académico para familias • Página 1 de 1</span>
    </div>

  </div>

</body>
</html>`;
  }
};

window.ExportService = ExportService;
