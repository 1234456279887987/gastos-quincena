// Claves para localStorage
const STORAGE_GASTOS_KEY = "gastos_quincena_v2";
const CONFIG_KEY = "gastos_quincena_config_v2";
const INGRESOS_EXTRA_KEY = "gastos_quincena_ingresos_extra_v1";

// Al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().substring(0, 10);
  const campoFecha = document.getElementById("fecha");
  const campoIngresoExtraFecha = document.getElementById("ingresoExtraFecha");
  const campoGfFecha = document.getElementById("gfFecha");

  if (campoFecha) campoFecha.value = hoy;
  if (campoIngresoExtraFecha) campoIngresoExtraFecha.value = hoy;
  if (campoGfFecha) campoGfFecha.value = hoy;

  cargarConfig();
  renderTodo();

  // Service worker (para PWA/offline)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  }

  // Botón guardar ingreso base
  const btnGuardarIngreso = document.getElementById("btn-guardar-ingreso");
  if (btnGuardarIngreso) {
    btnGuardarIngreso.addEventListener("click", guardarConfigDesdeUI);
  }

  // Botón agregar ingreso extra
  const btnAgregarIngresoExtra = document.getElementById("btn-agregar-ingreso-extra");
  if (btnAgregarIngresoExtra) {
    btnAgregarIngresoExtra.addEventListener("click", agregarIngresoExtraDesdeUI);
  }

  // Botón aplicar gastos fijos
  const btnGastosFijos = document.getElementById("btn-aplicar-gastos-fijos");
  if (btnGastosFijos) {
    btnGastosFijos.addEventListener("click", aplicarGastosFijosDesdeUI);
  }

  // Formulario de gastos
  const form = document.getElementById("form-gasto");
  if (form) {
    form.addEventListener("submit", onSubmitGasto);
  }

  // Botón exportar CSV
  const btnExportar = document.getElementById("btn-exportar");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarCSV);
  }

  // Auto-cálculo de diezmo cuando cambia categoría o fecha
  const campoCategoria = document.getElementById("categoria");
  if (campoCategoria) {
    campoCategoria.addEventListener("change", actualizarMontoSiDiezmo);
  }
  if (campoFecha) {
    campoFecha.addEventListener("change", actualizarMontoSiDiezmo);
  }
});

// ================== UTILIDADES BÁSICAS ==================

function calcularQuincena(fechaISO) {
  const d = new Date(fechaISO);
  const dia = d.getDate();
  return dia <= 15 ? "Q1" : "Q2";
}

// ================== GASTOS ==================

function leerGastos() {
  const data = localStorage.getItem(STORAGE_GASTOS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function guardarGastos(lista) {
  localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(lista));
}

// ================== CONFIG (INGRESO BASE) ==================

function leerConfig() {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) {
    return { ingresoQ1: 0, ingresoQ2: 0 };
  }
  try {
    const cfg = JSON.parse(data);
    return {
      ingresoQ1: Number(cfg.ingresoQ1) || 0,
      ingresoQ2: Number(cfg.ingresoQ2) || 0,
    };
  } catch {
    return { ingresoQ1: 0, ingresoQ2: 0 };
  }
}

function guardarConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function cargarConfig() {
  const cfg = leerConfig();
  const campoQ1 = document.getElementById("ingresoQ1");
  const campoQ2 = document.getElementById("ingresoQ2");
  if (campoQ1) campoQ1.value = cfg.ingresoQ1 || "";
  if (campoQ2) campoQ2.value = cfg.ingresoQ2 || "";
}

function guardarConfigDesdeUI() {
  const campoQ1 = document.getElementById("ingresoQ1");
  const campoQ2 = document.getElementById("ingresoQ2");

  const ingresoQ1 = campoQ1 && campoQ1.value ? Number(campoQ1.value) : 0;
  const ingresoQ2 = campoQ2 && campoQ2.value ? Number(campoQ2.value) : 0;

  const cfg = { ingresoQ1, ingresoQ2 };
  guardarConfig(cfg);

  alert("Ingreso base guardado ✅");
  renderTodo();
}

// ================== INGRESOS EXTRA ==================

function leerIngresosExtra() {
  const data = localStorage.getItem(INGRESOS_EXTRA_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function guardarIngresosExtra(lista) {
  localStorage.setItem(INGRESOS_EXTRA_KEY, JSON.stringify(lista));
}

function agregarIngresoExtraDesdeUI() {
  const campoMonto = document.getElementById("ingresoExtraMonto");
  const campoFecha = document.getElementById("ingresoExtraFecha");
  const campoDesc = document.getElementById("ingresoExtraDesc");

  const monto = campoMonto && campoMonto.value ? Number(campoMonto.value) : 0;
  const fecha = campoFecha && campoFecha.value ? campoFecha.value : "";
  const descripcion = campoDesc ? campoDesc.value.trim() : "";

  if (!monto || !fecha) {
    alert("Pon monto y fecha del ingreso extra");
    return;
  }

  const quincena = calcularQuincena(fecha);

  const ingresoExtra = { monto, fecha, quincena, descripcion };
  const lista = leerIngresosExtra();
  lista.push(ingresoExtra);
  guardarIngresosExtra(lista);

  // Limpiar campos
  if (campoMonto) campoMonto.value = "";
  if (campoDesc) campoDesc.value = "";

  alert("Ingreso extra agregado ✅");
  renderTodo();
}


// ===== GASTOS FIJOS POR QUINCENA (DESPENSA, CEL, CAMIONES, DIEZMO BASE) =====
function aplicarGastosFijosDesdeUI() {
  const campoFecha = document.getElementById("gfFecha");
  const campoDias = document.getElementById("gfDiasTrabajo");

  const fecha = campoFecha && campoFecha.value ? campoFecha.value : "";
  const diasTrabajo = campoDias && campoDias.value ? Number(campoDias.value) : 0;

  if (!fecha) {
    alert("Pon una fecha para la quincena");
    return;
  }
  if (diasTrabajo < 0) {
    alert("Los días de trabajo no pueden ser negativos");
    return;
  }

  const qna = calcularQuincena(fecha);
  const gastos = leerGastos();
  const nuevos = [];

  // 1) Despensa solo en Q1
  if (qna === "Q1") {
    nuevos.push({
      fecha,
      quincena: qna,
      monto: 1500,
      categoria: "Despensa",
      forma: "Efectivo",
      descripcion: "Despensa fija Q1"
    });
  }

  // 2) Celular en cada quincena
  nuevos.push({
    fecha,
    quincena: qna,
    monto: 500,
    categoria: "Celular",
    forma: "Efectivo",
    descripcion: "Celular fijo quincena"
  });

  // 3) Camiones: 32.20 por día de trabajo
  const totalCamiones = 32.20 * diasTrabajo;
  if (totalCamiones > 0) {
    nuevos.push({
      fecha,
      quincena: qna,
      monto: Number(totalCamiones.toFixed(2)),
      categoria: "Camiones",
      forma: "Efectivo",
      descripcion: `Camiones ${diasTrabajo} días`
    });
  }

  // 4) Diezmo sobre ingreso BASE de la quincena (Q1 o Q2)
  const cfg = leerConfig(); // ya existe arriba en el archivo
  const ingresoBaseQna = qna === "Q1"
    ? (cfg.ingresoQ1 || 0)
    : (cfg.ingresoQ2 || 0);

  const diezmoBase = ingresoBaseQna * 0.10;
  if (diezmoBase > 0) {
    nuevos.push({
      fecha,
      quincena: qna,
      monto: Number(diezmoBase.toFixed(2)),
      categoria: "Diezmo",
      forma: "Efectivo",
      descripcion: "Diezmo 10% ingreso base quincena"
    });
  }

  if (!nuevos.length) {
    alert("No hay nada que agregar");
    return;
  }

  nuevos.forEach((g) => gastos.push(g));
  guardarGastos(gastos);
  renderTodo();

  alert(
    `Se agregaron ${nuevos.length} gastos fijos para ${qna}.\n` +
    `Incluye: Despensa (si es Q1), Celular, Camiones y Diezmo sobre ingreso base.`
  );
}


// ================== CÁLCULO DE INGRESOS POR QUINCENA ==================

function calcularIngresosPorQuincena() {
  const cfg = leerConfig();
  const extras = leerIngresosExtra();

  let baseQ1 = cfg.ingresoQ1 || 0;
  let baseQ2 = cfg.ingresoQ2 || 0;
  let extraQ1 = 0;
  let extraQ2 = 0;

  extras.forEach((e) => {
    if (e.quincena === "Q1") extraQ1 += e.monto;
    if (e.quincena === "Q2") extraQ2 += e.monto;
  });

  return {
    baseQ1,
    baseQ2,
    extraQ1,
    extraQ2,
    totalQ1: baseQ1 + extraQ1,
    totalQ2: baseQ2 + extraQ2,
  };
}

// ================== RENDER PRINCIPAL ==================

function renderTodo() {
  const gastos = leerGastos();
  const ingresos = calcularIngresosPorQuincena();

  const tbody = document.getElementById("tabla-gastos");
  if (!tbody) return;
  tbody.innerHTML = "";

  let gastoQ1 = 0;
  let gastoQ2 = 0;

  gastos.forEach((g) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.fecha}</td>
      <td>${g.quincena}</td>
      <td>${g.categoria}</td>
      <td>${g.monto.toFixed(2)}</td>
      <td>${g.forma}</td>
      <td>${g.descripcion || ""}</td>
    `;
    tbody.appendChild(tr);

    if (g.quincena === "Q1") gastoQ1 += g.monto;
    if (g.quincena === "Q2") gastoQ2 += g.monto;
  });

  const resumen = document.getElementById("resumen");
  if (!resumen) return;

  const disponibleQ1 = ingresos.totalQ1 - gastoQ1;
  const disponibleQ2 = ingresos.totalQ2 - gastoQ2;
  const totalMes = gastoQ1 + gastoQ2;

  const texto = [
    `Q1 → Ingreso base: $${ingresos.baseQ1.toFixed(2)} | Extra: $${ingresos.extraQ1.toFixed(2)} | Ingreso total: $${ingresos.totalQ1.toFixed(2)}`,
    `    Gasto Q1: $${gastoQ1.toFixed(2)} | Disponible Q1: $${disponibleQ1.toFixed(2)}`,
    ``,
    `Q2 → Ingreso base: $${ingresos.baseQ2.toFixed(2)} | Extra: $${ingresos.extraQ2.toFixed(2)} | Ingreso total: $${ingresos.totalQ2.toFixed(2)}`,
    `    Gasto Q2: $${gastoQ2.toFixed(2)} | Disponible Q2: $${disponibleQ2.toFixed(2)}`,
    ``,
    `Total gastado mes: $${totalMes.toFixed(2)}`
  ].join("\n");

  resumen.textContent = texto;
}

// ================== LÓGICA DEL FORMULARIO DE GASTOS ==================

function onSubmitGasto(e) {
  e.preventDefault();

  const campoMonto = document.getElementById("monto");
  const campoCategoria = document.getElementById("categoria");
  const campoForma = document.getElementById("forma");
  const campoFecha = document.getElementById("fecha");
  const campoDescripcion = document.getElementById("descripcion");

  const categoria = campoCategoria.value;
  const forma = campoForma.value;
  const fecha = campoFecha.value;
  const descripcion = campoDescripcion.value.trim();

  if (!categoria || !forma || !fecha) {
    alert("Llena los campos obligatorios");
    return;
  }

  let monto = 0;

  if (categoria === "Diezmo") {
    // Forzar 10% del ingreso total de la quincena
    monto = calcularDiezmoParaFecha(fecha);
  } else {
    monto = parseFloat(campoMonto.value || "0");
    if (!monto) {
      alert("Pon un monto para el gasto");
      return;
    }
  }

  const quincena = calcularQuincena(fecha);

  const nuevo = {
    fecha,
    quincena,
    monto,
    categoria,
    forma,
    descripcion,
  };

  const gastos = leerGastos();
  gastos.push(nuevo);
  guardarGastos(gastos);

  // Limpiar campos para siguiente registro
  if (categoria === "Diezmo") {
    campoMonto.value = monto.toFixed(2); // se queda visible el 10%
  } else {
    campoMonto.value = "";
  }
  campoDescripcion.value = "";

  renderTodo();
}

// ================== DIEZMO (10% DEL INGRESO) ==================

function calcularDiezmoParaFecha(fechaISO) {
  const quincena = calcularQuincena(fechaISO);
  const ingresos = calcularIngresosPorQuincena();
  const ingresoQuincena =
    quincena === "Q1" ? ingresos.totalQ1 : ingresos.totalQ2;
  const diezmo = ingresoQuincena * 0.1;
  return diezmo;
}

function actualizarMontoSiDiezmo() {
  const campoCategoria = document.getElementById("categoria");
  const campoFecha = document.getElementById("fecha");
  const campoMonto = document.getElementById("monto");

  if (!campoCategoria || !campoFecha || !campoMonto) return;

  if (campoCategoria.value === "Diezmo" && campoFecha.value) {
    const diezmo = calcularDiezmoParaFecha(campoFecha.value);
    campoMonto.value = diezmo.toFixed(2);
    campoMonto.readOnly = true;
  } else {
    campoMonto.readOnly = false;
    campoMonto.value = "";
  }
}

// ================== EXPORTAR CSV ==================

function exportarCSV() {
  const gastos = leerGastos();
  if (!gastos.length) {
    alert("No hay datos para exportar");
    return;
  }

  let csv = "fecha,quincena,monto,categoria,forma,descripcion\n";
  gastos.forEach((g) => {
    const fila = [
      g.fecha,
      g.quincena,
      g.monto.toFixed(2),
      g.categoria,
      g.forma,
      (g.descripcion || "").replace(/,/g, " "),
    ];
    csv += fila.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gastos_quincena.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
