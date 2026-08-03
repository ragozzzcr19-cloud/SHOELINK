import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Upload, Image as ImageIcon, Package, ClipboardList, Trash2, Loader2, CheckCircle2, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
`;

const GENEROS = ["MUJER", "HOMBRE", "UNISEX", "JR"];
const BADGES = [
  { id: "disponible", label: "Disponible", hint: "Aparece igual que el resto del catálogo" },
  { id: "nuevo", label: "Nuevo ingreso", hint: "Se marca con una etiqueta “Nuevo”" },
  { id: "proximamente", label: "Próximamente", hint: "Visible pero sin botón de pedido aún" },
  { id: "oculto", label: "Oculto", hint: "No aparece en el catálogo hasta activarlo" },
];

const STORAGE_KEY = "panel_modelos_encargo_v1";

// Alias aceptados por columna, para no obligar un formato exacto de archivo
const COLUMN_ALIASES = {
  codigo: ["codigo", "código", "codigofab", "codigo fab", "cod"],
  marca: ["marca", "nombremarca", "nombre marca"],
  modelo: ["modelo", "descripcion", "descripción", "nombre", "nombremodelo"],
  genero: ["genero", "género"],
  disciplina: ["disciplina", "descdisciplina", "desc disciplina"],
  color: ["color"],
  precio: ["precio", "venta", "preciodeventa", "precio de venta"],
  cantidad: ["cantidad", "cant", "dispo", "dispotec", "dispo tec"],
  imagen: ["imagen", "imagenurl", "imagen url", "foto", "foto url"],
};

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapRowToModel(rawRow) {
  const normalized = {};
  for (const key of Object.keys(rawRow)) {
    normalized[normalizeHeader(key)] = rawRow[key];
  }
  const pick = (field) => {
    for (const alias of COLUMN_ALIASES[field]) {
      if (normalized[alias] !== undefined && normalized[alias] !== "") return normalized[alias];
    }
    return "";
  };
  return {
    codigo: String(pick("codigo") || "").trim(),
    marca: String(pick("marca") || "").trim(),
    modelo: String(pick("modelo") || "").trim(),
    genero: String(pick("genero") || "").trim().toUpperCase() || "UNISEX",
    disciplina: String(pick("disciplina") || "").trim(),
    color: String(pick("color") || "").trim(),
    precio: Number(pick("precio")) || 0,
    cantidad: Number(pick("cantidad")) || 0,
    imageDataUrl: String(pick("imagen") || "").trim() || null,
  };
}

const emptyForm = {
  codigo: "",
  marca: "",
  modelo: "",
  genero: "MUJER",
  disciplina: "",
  color: "",
  precio: "",
  cantidad: "",
  badge: "disponible",
  imageDataUrl: null,
};

function currency(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₡0";
  return "₡" + Math.round(v).toLocaleString("es-CR");
}

function StampMark({ text, tone, show }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "48%",
        left: "50%",
        transform: `translate(-50%, -50%) rotate(-11deg) scale(${show ? 1 : 0.6})`,
        opacity: show ? 1 : 0,
        transition: "opacity 220ms ease, transform 220ms ease",
        pointerEvents: "none",
        border: `3px solid ${tone}`,
        borderRadius: 8,
        padding: "6px 18px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: 2,
        color: tone,
        background: "rgba(255,255,255,0.72)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

function LabelTag({ form, stamp }) {
  const hasImage = !!form.imageDataUrl;
  return (
    <div
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "1px solid #DDD8CE",
        borderRadius: 4,
        boxShadow: "0 1px 0 #DDD8CE, 0 8px 24px -12px rgba(23,25,28,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 4,
          background:
            "repeating-linear-gradient(90deg, #17191C 0 10px, transparent 10px 20px)",
          opacity: 0.15,
        }}
      />
      <div style={{ padding: "18px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: 1.5,
              color: "#6B6A66",
              textTransform: "uppercase",
            }}
          >
            Etiqueta de caja
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: "#17191C",
              fontWeight: 600,
            }}
          >
            {form.codigo || "COD-000000"}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            height: 168,
            borderRadius: 3,
            border: "1px dashed #DDD8CE",
            background: "#F5F3EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {hasImage ? (
            <img
              src={form.imageDataUrl}
              alt="Vista previa del modelo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#B5B2A8" }}>
              <ImageIcon size={28} strokeWidth={1.5} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontFamily: "Inter", fontSize: 12 }}>Sin foto todavía</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontFamily: "'Roboto Slab', serif",
              fontWeight: 700,
              fontSize: 20,
              color: "#17191C",
              lineHeight: 1.15,
            }}
          >
            {form.modelo || "Nombre del modelo"}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 12.5,
              color: "#6B6A66",
              marginTop: 2,
            }}
          >
            {[form.marca, form.genero, form.color].filter(Boolean).join("  ·  ") || "Marca · Género · Color"}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #EDEAE3",
            paddingTop: 12,
          }}
        >
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#6B6A66", letterSpacing: 1 }}>
              PRECIO
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color: "#17191C" }}>
              {form.precio ? currency(form.precio) : "₡0"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#6B6A66", letterSpacing: 1 }}>
              DISCIPLINA
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 13, color: "#17191C", fontWeight: 600 }}>
              {form.disciplina || "—"}
            </div>
          </div>
        </div>
      </div>

      <StampMark text="INVENTARIO" tone="#204E4A" show={stamp === "inventario"} />
      <StampMark text="POR ENCARGO" tone="#B15027" show={stamp === "encargo"} />
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontFamily: "Inter",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#3A3A38",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ display: "block", fontFamily: "Inter", fontSize: 11, color: "#8A8880", marginTop: 4 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  borderRadius: 6,
  border: "1px solid #DDD8CE",
  background: "#FFFFFF",
  fontFamily: "Inter",
  fontSize: 13.5,
  color: "#17191C",
  outline: "none",
};

export default function PanelModelos() {
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState("inventario"); // inventario | encargo
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [stamp, setStamp] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Carga masiva por archivo
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const bulkFileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (!cancelled && res && res.value) {
          setEntries(JSON.parse(res.value));
        }
      } catch (e) {
        if (!cancelled) setStorageError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!result) setStorageError(true);
      else setStorageError(false);
    } catch (e) {
      setStorageError(true);
    }
  }, []);

  const update = (key) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageDataUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3200);
  };

  const validate = (requireQty) => {
    if (!form.codigo.trim()) return "Falta el código del modelo.";
    if (!form.modelo.trim()) return "Falta el nombre del modelo.";
    if (!form.precio || Number(form.precio) <= 0) return "Poné un precio válido.";
    if (requireQty && (!form.cantidad || Number(form.cantidad) <= 0))
      return "Poné la cantidad que entra a inventario.";
    return null;
  };

  const submit = async (kind) => {
    const err = validate(kind === "inventario");
    if (err) {
      showToast(err);
      return;
    }
    setStamp(kind);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...form,
      precio: Number(form.precio),
      cantidad: kind === "inventario" ? Number(form.cantidad) : 0,
      sumaInventario: kind === "inventario",
      badgeLabel: BADGES.find((b) => b.id === form.badge)?.label || "Disponible",
      creadoEl: new Date().toISOString(),
    };
    const next = [entry, ...entries];
    setEntries(next);
    await persist(next);

    window.setTimeout(() => {
      setStamp(null);
      setForm(emptyForm);
      showToast(
        kind === "inventario"
          ? `“${entry.modelo}” agregado y sumado a inventario (+${entry.cantidad}).`
          : `“${entry.modelo}” agregado por encargo — no se sumó a inventario.`
      );
    }, 650);
  };

  const removeEntry = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await persist(next);
  };

  const handleBulkFile = (file) => {
    if (!file) return;
    setBulkError("");
    setBulkParsing(true);
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const modelos = rows.map(mapRowToModel).filter((m) => m.codigo || m.modelo);
        if (modelos.length === 0) {
          setBulkError("No encontré filas con código o modelo. Revisá los encabezados del archivo (Codigo, Marca, Modelo, Genero, Disciplina, Color, Precio, Cantidad).");
        }
        setBulkRows(modelos);
      } catch (err) {
        setBulkError("No pude leer el archivo. Verificá que sea un .xlsx o .csv válido.");
        setBulkRows([]);
      } finally {
        setBulkParsing(false);
      }
    };
    reader.onerror = () => {
      setBulkError("No pude leer el archivo.");
      setBulkParsing(false);
    };
    reader.readAsBinaryString(file);
  };

  const clearBulk = () => {
    setBulkRows([]);
    setBulkFileName("");
    setBulkError("");
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
  };

  const commitBulk = async (kind) => {
    if (bulkRows.length === 0) return;
    const nowIso = new Date().toISOString();
    const nuevos = bulkRows.map((m) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...m,
      sumaInventario: kind === "inventario",
      cantidad: kind === "inventario" ? Number(m.cantidad) || 0 : 0,
      badge: kind === "encargo" ? "disponible" : "disponible",
      badgeLabel: "Disponible",
      creadoEl: nowIso,
    }));
    const next = [...nuevos, ...entries];
    setEntries(next);
    await persist(next);
    showToast(
      kind === "inventario"
        ? `${nuevos.length} modelo(s) subidos y sumados a inventario.`
        : `${nuevos.length} modelo(s) subidos por encargo — no se sumaron a inventario ni al resumen por marca.`
    );
    clearBulk();
  };

  // Resumen por marca: SOLO cuenta lo que suma inventario.
  // Los modelos "por encargo" quedan fuera de este resumen a propósito.
  const resumenMarca = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!e.sumaInventario) continue; // por encargo no cuenta acá
      const marca = (e.marca || "Sin marca").trim() || "Sin marca";
      const prev = map.get(marca) || { marca, modelos: 0, unidades: 0 };
      prev.modelos += 1;
      prev.unidades += Number(e.cantidad) || 0;
      map.set(marca, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.unidades - a.unidades);
  }, [entries]);

  return (
    <div style={{ background: "#F5F3EF", minHeight: "100%", fontFamily: "Inter" }}>
      <style>{FONTS}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 64px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11.5,
                letterSpacing: 2,
                color: "#B15027",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Administrador · Modelos
            </div>
            <h1
              style={{
                fontFamily: "'Roboto Slab', serif",
                fontWeight: 800,
                fontSize: 34,
                color: "#17191C",
                margin: 0,
              }}
            >
              Agregar modelo nuevo
            </h1>
            <p style={{ fontFamily: "Inter", fontSize: 14, color: "#6B6A66", marginTop: 6, maxWidth: 520 }}>
              Subí un modelo por encargo sin tocar el inventario, o agregalo directo a stock. Vos decidís cómo aparece en el catálogo.
            </p>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600, color: "#204E4A" }}>
                {entries.filter((e) => e.sumaInventario).length}
              </div>
              <div style={{ fontFamily: "Inter", fontSize: 11, color: "#8A8880" }}>en inventario</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600, color: "#B15027" }}>
                {entries.filter((e) => !e.sumaInventario).length}
              </div>
              <div style={{ fontFamily: "Inter", fontSize: 11, color: "#8A8880" }}>por encargo</div>
            </div>
          </div>
        </div>

        {storageError && (
          <div
            style={{
              marginTop: 18,
              padding: "10px 14px",
              borderRadius: 6,
              background: "#F5E4D9",
              color: "#8A3F1C",
              fontFamily: "Inter",
              fontSize: 12.5,
            }}
          >
            No se pudo guardar en el almacenamiento del navegador. Los modelos que agregues se van a ver en esta sesión, pero podrían no quedar guardados para la próxima vez.
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 28, marginTop: 28 }}>
          {/* Left: image + live label */}
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                cursor: "pointer",
                border: "1.5px dashed #C9C4B8",
                borderRadius: 8,
                padding: "18px",
                textAlign: "center",
                background: "#FFFFFF",
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Upload size={20} strokeWidth={1.5} style={{ color: "#B15027" }} />
              <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#17191C", marginTop: 6 }}>
                Subir foto del modelo
              </div>
              <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#8A8880", marginTop: 2 }}>
                Arrastrá una imagen o hacé clic para elegirla
              </div>
            </div>

            <LabelTag form={form} stamp={stamp} />
          </div>

          {/* Right: form */}
          <div style={{ background: "#FFFFFF", border: "1px solid #DDD8CE", borderRadius: 8, padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Código de modelo">
                <input style={inputStyle} placeholder="Ej. U9060BLK-D" value={form.codigo} onChange={update("codigo")} />
              </Field>
              <Field label="Marca">
                <input style={inputStyle} placeholder="Ej. New Balance" value={form.marca} onChange={update("marca")} />
              </Field>

              <Field label="Nombre del modelo" hint="Cómo se va a ver en el catálogo">
                <input style={inputStyle} placeholder="Ej. 9060" value={form.modelo} onChange={update("modelo")} />
              </Field>
              <Field label="Disciplina">
                <input style={inputStyle} placeholder="Ej. Lifestyle, Running" value={form.disciplina} onChange={update("disciplina")} />
              </Field>

              <Field label="Género">
                <select style={inputStyle} value={form.genero} onChange={update("genero")}>
                  {GENEROS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color">
                <input style={inputStyle} placeholder="Ej. Black (001)" value={form.color} onChange={update("color")} />
              </Field>

              <Field label="Precio de venta">
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  placeholder="₡"
                  value={form.precio}
                  onChange={update("precio")}
                />
              </Field>
              <Field
                label="Cantidad inicial"
                hint={mode === "encargo" ? "No aplica: por encargo no suma inventario" : "Unidades que entran a stock"}
              >
                <input
                  style={{ ...inputStyle, opacity: mode === "encargo" ? 0.45 : 1 }}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.cantidad}
                  disabled={mode === "encargo"}
                  onChange={update("cantidad")}
                />
              </Field>
            </div>

            {/* Aparición en catálogo */}
            <div style={{ marginTop: 22 }}>
              <span style={{ display: "block", fontFamily: "Inter", fontSize: 12.5, fontWeight: 600, color: "#3A3A38", marginBottom: 8 }}>
                ¿Cómo querés que aparezca en el catálogo?
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {BADGES.map((b) => {
                  const active = form.badge === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, badge: b.id }))}
                      title={b.hint}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 20,
                        border: `1px solid ${active ? "#17191C" : "#DDD8CE"}`,
                        background: active ? "#17191C" : "#FFFFFF",
                        color: active ? "#FFFFFF" : "#3A3A38",
                        fontFamily: "Inter",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode switch */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                borderRadius: 8,
                border: "1px solid #DDD8CE",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("inventario")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 10px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 700,
                  background: mode === "inventario" ? "#E4EEEC" : "#FFFFFF",
                  color: mode === "inventario" ? "#204E4A" : "#8A8880",
                  borderRight: "1px solid #DDD8CE",
                }}
              >
                <Package size={16} /> Stock regular
              </button>
              <button
                type="button"
                onClick={() => setMode("encargo")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 10px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter",
                  fontSize: 13,
                  fontWeight: 700,
                  background: mode === "encargo" ? "#F5E4D9" : "#FFFFFF",
                  color: mode === "encargo" ? "#B15027" : "#8A8880",
                }}
              >
                <ClipboardList size={16} /> Por encargo
              </button>
            </div>

            {mode === "encargo" && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 13px",
                  borderRadius: 6,
                  background: "#F5E4D9",
                  color: "#8A3F1C",
                  fontFamily: "Inter",
                  fontSize: 12.5,
                }}
              >
                Este modelo se guarda para mostrarlo en el catálogo, pero <strong>no suma unidades al inventario</strong>.
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => submit("inventario")}
                style={{
                  flex: "1 1 240px",
                  padding: "13px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#204E4A",
                  color: "#FFFFFF",
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Package size={16} />
                Agregar y sumar a inventario
              </button>
              <button
                type="button"
                onClick={() => submit("encargo")}
                style={{
                  flex: "1 1 240px",
                  padding: "13px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #B15027",
                  background: "#FFFFFF",
                  color: "#B15027",
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ClipboardList size={16} />
                Agregar por encargo (sin inventario)
              </button>
            </div>
          </div>
        </div>

        {/* Subir archivo con varios modelos nuevos */}
        <div style={{ marginTop: 28, background: "#FFFFFF", border: "1px solid #DDD8CE", borderRadius: 8, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: 18, color: "#17191C", margin: 0 }}>
                Subir archivo con modelos nuevos
              </h2>
              <p style={{ fontFamily: "Inter", fontSize: 12.5, color: "#6B6A66", marginTop: 4, maxWidth: 520 }}>
                Un .xlsx o .csv con columnas Código, Marca, Modelo, Género, Disciplina, Color, Precio y Cantidad. Elegís
                abajo si ese archivo entra como stock regular o como encargo — la condición aplica a todas las filas del
                archivo.
              </p>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleBulkFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => bulkFileInputRef.current?.click()}
            style={{
              cursor: "pointer",
              border: "1.5px dashed #C9C4B8",
              borderRadius: 8,
              padding: "20px",
              textAlign: "center",
              background: "#F5F3EF",
              marginTop: 16,
            }}
          >
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => handleBulkFile(e.target.files?.[0])}
            />
            <FileSpreadsheet size={22} strokeWidth={1.5} style={{ color: "#B15027" }} />
            <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#17191C", marginTop: 6 }}>
              {bulkFileName || "Arrastrá el archivo o hacé clic para elegirlo"}
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#8A8880", marginTop: 2 }}>.xlsx, .xls o .csv</div>
          </div>

          {bulkParsing && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, color: "#8A8880", fontFamily: "Inter", fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Leyendo archivo...
            </div>
          )}

          {bulkError && (
            <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 6, background: "#F5E4D9", color: "#8A3F1C", fontFamily: "Inter", fontSize: 12.5 }}>
              {bulkError}
            </div>
          )}

          {bulkRows.length > 0 && !bulkParsing && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, color: "#17191C" }}>
                  {bulkRows.length} modelo(s) encontrados en “{bulkFileName}”
                </span>
                <button
                  onClick={clearBulk}
                  style={{ background: "none", border: "none", color: "#8A8880", cursor: "pointer", fontFamily: "Inter", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <X size={13} /> Quitar archivo
                </button>
              </div>

              <div style={{ marginTop: 10, maxHeight: 180, overflowY: "auto", border: "1px solid #EDEAE3", borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F5F3EF", position: "sticky", top: 0 }}>
                      {["Código", "Marca", "Modelo", "Género", "Color", "Precio", "Cantidad"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#6B6A66", fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0, 8).map((m, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #EDEAE3" }}>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.codigo || "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.marca || "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.modelo || "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.genero || "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.color || "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.precio ? currency(m.precio) : "—"}</td>
                        <td style={{ padding: "6px 10px", color: "#17191C" }}>{m.cantidad || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bulkRows.length > 8 && (
                  <div style={{ padding: "6px 10px", fontFamily: "Inter", fontSize: 11, color: "#8A8880" }}>
                    y {bulkRows.length - 8} más...
                  </div>
                )}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => commitBulk("inventario")}
                  style={{
                    flex: "1 1 240px", padding: "13px 16px", borderRadius: 8, border: "none",
                    background: "#204E4A", color: "#FFFFFF", fontFamily: "Inter", fontWeight: 700, fontSize: 13.5,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <Package size={16} />
                  Subir y sumar a inventario ({bulkRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => commitBulk("encargo")}
                  style={{
                    flex: "1 1 240px", padding: "13px 16px", borderRadius: 8, border: "1.5px solid #B15027",
                    background: "#FFFFFF", color: "#B15027", fontFamily: "Inter", fontWeight: 700, fontSize: 13.5,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <ClipboardList size={16} />
                  Subir por encargo — no suma estadística ({bulkRows.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumen por marca — excluye por encargo a propósito */}
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: 18, color: "#17191C", margin: 0 }}>
              Resumen por marca
            </h2>
            <span style={{ fontFamily: "Inter", fontSize: 11.5, color: "#8A8880" }}>
              Solo inventario — los modelos por encargo no se cuentan acá
            </span>
          </div>

          {resumenMarca.length === 0 ? (
            <div
              style={{
                border: "1px dashed #DDD8CE",
                borderRadius: 8,
                padding: "20px",
                textAlign: "center",
                color: "#8A8880",
                fontFamily: "Inter",
                fontSize: 13,
                background: "#FFFFFF",
              }}
            >
              Todavía no hay modelos sumados a inventario.
            </div>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #DDD8CE", borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 160px",
                  padding: "10px 16px",
                  background: "#F5F3EF",
                  borderBottom: "1px solid #DDD8CE",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: 0.5,
                  color: "#6B6A66",
                  textTransform: "uppercase",
                }}
              >
                <span>Marca</span>
                <span style={{ textAlign: "right" }}>Modelos</span>
                <span style={{ textAlign: "right" }}>Unidades</span>
              </div>
              {resumenMarca.map((r, i) => (
                <div
                  key={r.marca}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 160px",
                    padding: "11px 16px",
                    borderBottom: i === resumenMarca.length - 1 ? "none" : "1px solid #EDEAE3",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: 13.5, fontWeight: 600, color: "#17191C" }}>{r.marca}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#3A3A38", textAlign: "right" }}>
                    {r.modelos}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#204E4A",
                      textAlign: "right",
                    }}
                  >
                    {r.unidades}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: 18, color: "#17191C", marginBottom: 14 }}>
            Modelos agregados
          </h2>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8A8880", fontFamily: "Inter", fontSize: 13 }}>
              <Loader2 size={16} className="animate-spin" /> Cargando...
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                border: "1px dashed #DDD8CE",
                borderRadius: 8,
                padding: "28px 20px",
                textAlign: "center",
                color: "#8A8880",
                fontFamily: "Inter",
                fontSize: 13,
                background: "#FFFFFF",
              }}
            >
              Todavía no agregaste ningún modelo. Los que sumes van a aparecer acá.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDD8CE",
                    borderRadius: 8,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => removeEntry(e.id)}
                    title="Quitar"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: "1px solid #DDD8CE",
                      background: "#FFFFFF",
                      color: "#8A8880",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>

                  <div style={{ height: 130, background: "#F5F3EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {e.imageDataUrl ? (
                      <img src={e.imageDataUrl} alt={e.modelo} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <ImageIcon size={22} style={{ color: "#C9C4B8" }} />
                    )}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        display: "inline-block",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        padding: "2px 7px",
                        borderRadius: 4,
                        marginBottom: 6,
                        color: e.sumaInventario ? "#204E4A" : "#B15027",
                        background: e.sumaInventario ? "#E4EEEC" : "#F5E4D9",
                      }}
                    >
                      {e.sumaInventario ? `+${e.cantidad} INVENTARIO` : "POR ENCARGO"}
                    </div>
                    <div style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: 15, color: "#17191C" }}>
                      {e.modelo || "Sin nombre"}
                    </div>
                    <div style={{ fontFamily: "Inter", fontSize: 11.5, color: "#8A8880", marginTop: 2 }}>
                      {e.codigo} · {e.marca}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: "#17191C", marginTop: 8 }}>
                      {currency(e.precio)}
                    </div>
                    <div style={{ fontFamily: "Inter", fontSize: 10.5, color: "#8A8880", marginTop: 4 }}>
                      Catálogo: {e.badgeLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 22,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#17191C",
            color: "#FFFFFF",
            padding: "11px 18px",
            borderRadius: 8,
            fontFamily: "Inter",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.5)",
            maxWidth: "88vw",
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0, color: "#8FD4C4" }} />
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: 6, background: "none", border: "none", color: "#8A8880", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
