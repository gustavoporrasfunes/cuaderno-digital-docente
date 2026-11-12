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
    if (nota < 5) return "Insuficiente";
    if (nota < 6) return "Suficiente";
    if (nota < 7) return "Bien";
    if (nota < 9) return "Notable";
    return "Sobresaliente";
  }
};

window.ExportService = ExportService;
