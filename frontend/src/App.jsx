// ============================================================
// ArchivaCloud P-12 — Gestor Documental con Amazon S3
// Archivo único: App.jsx
// Stack: React 19 + Vite + axios (sin librerías de UI externas)
// Formatos: DOCX, ODT, RTF — Máximo 14 MB
// ============================================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const API = "http://localhost:8000";

// MIME types permitidos para las extensiones válidas (SEC-03)
const MIME_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
};

// Extensiones permitidas — usadas en validación frontend (SEC-03)
const ALLOWED_EXTENSIONS = ["docx", "odt", "rtf"];

// Límite de tamaño: 14 MB en bytes (SEC-04)
const MAX_FILE_SIZE = 14 * 1024 * 1024;

// Configuración de reintentos automáticos para la subida
const MAX_UPLOAD_RETRIES = 2;

// Duración del toast antes de desaparecer (ms)
const TOAST_DURATION = 4500;

// Delay del debounce para el input de renombrar (ms)
const DEBOUNCE_DELAY = 300;

// ============================================================
// PALETA DE COLORES — TEMA OSCURO PROFESIONAL
// ============================================================

const C = {
  // Fondos
  bg: "#0b0e14",
  bgCard: "#131720",
  bgSurface: "#1a1f2e",
  bgHover: "#1e2538",
  bgInput: "#0f1219",

  // Bordes
  border: "#232a3b",
  borderFocus: "#4a6cf7",
  borderDrag: "#4a6cf7",

  // Textos
  text: "#e2e8f0",
  textSoft: "#8892a8",
  textMuted: "#5a6478",

  // Acentos
  accent: "#4a6cf7",
  accentHover: "#5b7dff",
  accentGlow: "rgba(74, 108, 247, 0.15)",
  accentGlowStrong: "rgba(74, 108, 247, 0.3)",

  // Estados
  success: "#22c55e",
  successBg: "rgba(34, 197, 94, 0.1)",
  successBorder: "rgba(34, 197, 94, 0.3)",
  danger: "#ef4444",
  dangerBg: "rgba(239, 68, 68, 0.1)",
  dangerBorder: "rgba(239, 68, 68, 0.3)",
  dangerHover: "#dc2626",
  warning: "#f59e0b",
  warningBg: "rgba(245, 158, 11, 0.1)",
  warningBorder: "rgba(245, 158, 11, 0.3)",

  // Colores por tipo de archivo
  docxColor: "#2b5797",
  odtColor: "#00a651",
  rtfColor: "#7c3aed",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.6)",
};

// ============================================================
// INYECCIÓN DE ANIMACIONES CSS (keyframes)
// No es posible hacer keyframes con inline styles,
// así que los inyectamos una vez al montar la app.
// ============================================================

const CSS_ANIMATIONS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  @keyframes acSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes acSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-12px); }
  }
  @keyframes acFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes acFadeInUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes acPulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.8; }
  }
  @keyframes acShimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes acSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes acProgressStripe {
    0%   { background-position: 0 0; }
    100% { background-position: 40px 0; }
  }
  @keyframes acScaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes acDropBounce {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes acGlow {
    0%, 100% { box-shadow: 0 0 15px rgba(74, 108, 247, 0.15); }
    50%      { box-shadow: 0 0 25px rgba(74, 108, 247, 0.3); }
  }
`;

// ============================================================
// HOOK: useDebounce — retrasa la actualización de un valor
// Uso: evitar llamadas excesivas al cambiar el nombre
// ============================================================

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ============================================================
// HOOK: useToast — sistema de notificaciones toast
// Tipos: "success", "error", "warning", "info"
// ============================================================

function useToast() {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = "info") => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Programar la salida con animación
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Eliminar del DOM después de la animación de salida
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return { toasts, addToast, removeToast };
}

// ============================================================
// UTILIDADES
// ============================================================

/** Formatea bytes a unidades legibles */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Obtiene la extensión de un nombre de archivo */
function getExtension(name) {
  if (!name) return "";
  return name.split(".").pop().toLowerCase();
}

/**
 * Sanitiza el nombre del archivo para que sea compatible con el backend.
 * La regex del backend solo permite: letras, números, _, -, . y espacios.
 * Reemplaza cualquier otro carácter (paréntesis, corchetes, etc.) por _
 */
function sanitizeFileName(name) {
  if (!name) return name;
  const ext = getExtension(name);
  // Separar nombre base de la extensión
  const baseName = name.substring(0, name.length - ext.length - 1);
  // Reemplazar caracteres no permitidos por _
  const sanitized = baseName.replace(/[^\w\-. ]/g, "_");
  // Eliminar guiones bajos duplicados consecutivos
  const cleaned = sanitized.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `${cleaned}.${ext}`;
}

/** Formatea una fecha ISO a formato legible */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Clasifica errores HTTP en mensajes amigables para el usuario.
 * SEC: No expone detalles internos del servidor.
 */
function getErrorMessage(error, context = "operación") {
  if (axios.isCancel(error)) return "Operación cancelada";
  if (!error.response) return `Error de conexión al ${context}. Verifica tu red.`;
  const status = error.response.status;
  if (status === 400) return `Solicitud inválida en ${context}`;
  if (status === 404) return `Recurso no encontrado`;
  if (status === 409) return `Conflicto: el archivo ya existe con ese nombre`;
  if (status === 413) return `El archivo excede el tamaño permitido (14 MB)`;
  if (status === 429) return `Demasiadas solicitudes. Intenta en un momento.`;
  if (status >= 500) return `Error del servidor. Intenta más tarde.`;
  return `Error inesperado en ${context}`;
}

// ============================================================
// COMPONENTE: FileIcon — Ícono SVG según extensión
// ============================================================

function FileIcon({ extension, size = 32 }) {
  const ext = extension?.toLowerCase();
  const colors = {
    docx: { primary: C.docxColor, label: "W", name: "DOCX" },
    odt: { primary: C.odtColor, label: "O", name: "ODT" },
    rtf: { primary: C.rtfColor, label: "R", name: "RTF" },
  };
  const config = colors[ext] || { primary: C.textMuted, label: "?", name: "?" };

  return (
    <div
      style={{
        width: size,
        height: size + 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* Ícono de documento con esquina doblada */}
      <svg width={size * 0.75} height={size * 0.85} viewBox="0 0 24 28" fill="none">
        <path
          d="M2 3C2 1.89543 2.89543 1 4 1H16L22 7V25C22 26.1046 21.1046 27 20 27H4C2.89543 27 2 26.1046 2 25V3Z"
          fill={config.primary}
          fillOpacity="0.15"
          stroke={config.primary}
          strokeWidth="1.5"
        />
        <path
          d="M16 1L22 7H18C16.8954 7 16 6.10457 16 5V1Z"
          fill={config.primary}
          fillOpacity="0.3"
        />
        <text
          x="12"
          y="19"
          textAnchor="middle"
          fill={config.primary}
          fontSize="9"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {config.label}
        </text>
      </svg>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: config.primary,
          letterSpacing: "0.5px",
          lineHeight: 1,
        }}
      >
        {config.name}
      </span>
    </div>
  );
}

// ============================================================
// COMPONENTE: ProgressBar — Barra de progreso con animación
// ============================================================

function ProgressBar({ progress, retryCount }) {
  return (
    <div style={{ width: "100%", marginTop: 16 }}>
      {/* Texto de estado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 13,
          color: C.textSoft,
        }}
      >
        <span>
          {progress < 100
            ? `Subiendo archivo${retryCount > 0 ? ` (reintento ${retryCount}/${MAX_UPLOAD_RETRIES})` : ""}...`
            : "Procesando..."}
        </span>
        <span style={{ fontWeight: 600, color: C.accent }}>{Math.round(progress)}%</span>
      </div>

      {/* Contenedor de la barra */}
      <div
        style={{
          width: "100%",
          height: 6,
          background: C.bgSurface,
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Barra de progreso con efecto de rayas animadas */}
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${C.accent}, ${C.accentHover})`,
            borderRadius: 3,
            transition: "width 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Rayas animadas */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)",
              backgroundSize: "20px 20px",
              animation: "acProgressStripe 0.8s linear infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: SkeletonRow — Fila de esqueleto para carga
// ============================================================

function SkeletonRow() {
  const shimmerBg = `linear-gradient(90deg, ${C.bgSurface} 25%, ${C.bgHover} 50%, ${C.bgSurface} 75%)`;
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div
            style={{
              height: i === 1 ? 18 : 14,
              width: i === 1 ? "70%" : i === 4 ? "40%" : "50%",
              background: shimmerBg,
              backgroundSize: "200% 100%",
              borderRadius: 4,
              animation: "acShimmer 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ============================================================
// COMPONENTE: ConfirmModal — Modal de confirmación elegante
// Reemplaza el confirm() nativo del navegador
// ============================================================

function ConfirmModal({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, danger }) {
  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.overlay,
        backdropFilter: "blur(4px)",
        animation: "acFadeIn 0.2s ease",
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "32px 28px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          animation: "acScaleIn 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono de advertencia */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: danger ? C.dangerBg : C.warningBg,
            border: `1px solid ${danger ? C.dangerBorder : C.warningBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 22,
          }}
        >
          {danger ? "⚠️" : "❓"}
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: C.text,
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: C.textSoft,
            textAlign: "center",
            margin: "0 0 28px",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: C.bgSurface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.textSoft,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = C.bgHover;
              e.target.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = C.bgSurface;
              e.target.style.color = C.textSoft;
            }}
          >
            {cancelText || "Cancelar"}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px 16px",
              background: danger ? C.danger : C.accent,
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = danger ? C.dangerHover : C.accentHover;
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = danger ? C.danger : C.accent;
              e.target.style.transform = "translateY(0)";
            }}
          >
            {confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: ToastContainer — Contenedor de notificaciones
// ============================================================

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  const getToastStyle = (type) => {
    const map = {
      success: { bg: C.successBg, border: C.successBorder, color: C.success, icon: "✓" },
      error: { bg: C.dangerBg, border: C.dangerBorder, color: C.danger, icon: "✕" },
      warning: { bg: C.warningBg, border: C.warningBorder, color: C.warning, icon: "!" },
      info: { bg: C.accentGlow, border: "rgba(74,108,247,0.3)", color: C.accent, icon: "ℹ" },
    };
    return map[type] || map.info;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
        width: "calc(100% - 40px)",
      }}
    >
      {toasts.map((toast) => {
        const s = getToastStyle(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              background: C.bgCard,
              border: `1px solid ${s.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              animation: toast.exiting
                ? "acSlideOut 0.3s ease forwards"
                : "acSlideIn 0.3s ease",
              cursor: "pointer",
            }}
            onClick={() => onRemove(toast.id)}
          >
            {/* Ícono circular */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: s.bg,
                border: `1px solid ${s.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: s.color,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {s.icon}
            </div>
            <p
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 1.5,
                color: C.text,
                margin: 0,
              }}
            >
              {toast.message}
            </p>
            {/* Botón cerrar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(toast.id);
              }}
              style={{
                background: "none",
                border: "none",
                color: C.textMuted,
                cursor: "pointer",
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// COMPONENTE: SortHeader — Encabezado de columna con ordenamiento
// ============================================================

function SortHeader({ label, sortKey, currentSort, onSort, align = "left" }) {
  const isActive = currentSort.key === sortKey;
  const arrow = isActive ? (currentSort.dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: "12px 16px",
        textAlign: align,
        borderBottom: `1px solid ${C.border}`,
        color: isActive ? C.accent : C.textSoft,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        cursor: "pointer",
        userSelect: "none",
        transition: "color 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{ color: C.accent, marginLeft: 2 }}>{arrow}</span>
    </th>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: App
// ============================================================

export default function App() {
  // --- Estado principal ---
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true); // estado de carga para skeleton
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [dragging, setDragging] = useState(false);

  // --- Estado de renombrado ---
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const debouncedNewName = useDebounce(newName, DEBOUNCE_DELAY);

  // --- Estado de ordenamiento ---
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  // --- Estado del modal de confirmación ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: null,
  });

  // --- Sistema de toast ---
  const { toasts, addToast, removeToast } = useToast();

  // --- Refs ---
  const abortControllerRef = useRef(null); // AbortController para cancelar subidas
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0); // Contador para drag enter/leave anidados

  // ============================================================
  // EFECTO: Inyectar animaciones CSS al montar
  // ============================================================

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS_ANIMATIONS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ============================================================
  // EFECTO: Cargar archivos al montar
  // ============================================================

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // FUNCIONES: Obtener archivos del bucket
  // ============================================================

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/files`);
      setFiles(res.data.files || []);
    } catch (err) {
      addToast(getErrorMessage(err, "carga de archivos"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // ============================================================
  // FUNCIÓN: Validar archivo antes de subir (SEC-03, SEC-04)
  // ============================================================

  const validateFile = useCallback(
    (file) => {
      const ext = getExtension(file.name);

      // SEC-03: Validar extensión
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        addToast(
          `Formato no permitido (.${ext}). Solo se aceptan: DOCX, ODT, RTF`,
          "error"
        );
        return false;
      }

      // SEC-04: Validar tamaño (14 MB)
      if (file.size > MAX_FILE_SIZE) {
        addToast(
          `El archivo (${formatSize(file.size)}) supera el límite de 14 MB`,
          "error"
        );
        return false;
      }

      // Validar que el archivo no esté vacío
      if (file.size === 0) {
        addToast("El archivo está vacío", "error");
        return false;
      }

      return true;
    },
    [addToast]
  );

  // ============================================================
  // FUNCIÓN: Subir archivo con presigned URL
  // Incluye: barra de progreso real, retry automático,
  // AbortController para cancelación
  // ============================================================

  const uploadFile = useCallback(
    async (file, attempt = 0) => {
      const ext = getExtension(file.name);
      const contentType = MIME_TYPES[ext] || file.type;

      // Solo crear AbortController en el primer intento
      if (attempt === 0) {
        const controller = new AbortController();
        abortControllerRef.current = controller;
      }
      const signal = abortControllerRef.current?.signal;

      // Sanitizar nombre: remueve paréntesis y otros caracteres no permitidos por el backend
      const safeName = sanitizeFileName(file.name);

      const requestBody = {
        fileName: safeName,
        fileType: contentType,
        fileSize: file.size,
      };

      try {

        // Paso 1: Obtener presigned URL del backend
        const { data } = await axios.post(
          `${API}/api/upload/presigned-url`,
          requestBody,
          { signal }
        );



        // Paso 2: Subir directamente a S3 con presigned URL
        await axios.put(data.presignedUrl, file, {
          headers: { "Content-Type": contentType },
          signal,
          // onUploadProgress: barra de progreso real
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setUploadProgress(pct);
            }
          },
        });

        // Éxito — limpiar estado
        addToast(`"${file.name}" subido correctamente`, "success");
        setUploading(false);
        setUploadProgress(0);
        setRetryCount(0);
        abortControllerRef.current = null;
        fetchFiles();
      } catch (err) {


        // Si fue cancelado, no reintentar
        if (axios.isCancel(err)) {
          addToast("Subida cancelada", "warning");
          setUploading(false);
          setUploadProgress(0);
          setRetryCount(0);
          abortControllerRef.current = null;
          return;
        }

        // Retry automático si no se superó el máximo
        if (attempt < MAX_UPLOAD_RETRIES) {
          const nextAttempt = attempt + 1;
          setRetryCount(nextAttempt);
          addToast(
            `Error en la subida. Reintentando (${nextAttempt}/${MAX_UPLOAD_RETRIES})...`,
            "warning"
          );
          // Esperar 1s antes de reintentar
          await new Promise((r) => setTimeout(r, 1000));
          return uploadFile(file, nextAttempt);
        }

        // Máximo de reintentos alcanzado — limpiar estado
        // Si es 422, mostrar detalles de validación del backend
        if (err.response?.status === 422) {
          const detail = err.response.data?.detail;
          let validationMsg = "Error de validación del servidor";
          if (Array.isArray(detail)) {
            // Pydantic v2 devuelve array de errores
            validationMsg = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join("; ");
          } else if (typeof detail === "string") {
            validationMsg = detail;
          }

          addToast(validationMsg, "error");
        } else {
          addToast(getErrorMessage(err, "subida"), "error");
        }

        setUploading(false);
        setUploadProgress(0);
        setRetryCount(0);
        abortControllerRef.current = null;
      }
    },
    [addToast, fetchFiles]
  );

  // ============================================================
  // HANDLER: Procesar archivo seleccionado o arrastrado
  // ============================================================

  const processFile = useCallback(
    (file) => {
      if (!file || uploading) return;
      if (!validateFile(file)) return;

      setUploading(true);
      setUploadProgress(0);
      setRetryCount(0);
      uploadFile(file);
    },
    [uploading, validateFile, uploadFile]
  );

  // Handler para input de archivo
  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      processFile(file);
      // Resetear input para permitir re-seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFile]
  );

  // ============================================================
  // HANDLERS: Drag & Drop
  // ============================================================

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      dragCounterRef.current = 0;

      const file = e.dataTransfer?.files?.[0];
      processFile(file);
    },
    [processFile]
  );

  // ============================================================
  // HANDLER: Cancelar subida en progreso
  // ============================================================

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // ============================================================
  // HANDLER: Eliminar archivo (con modal de confirmación)
  // ============================================================

  const handleDelete = useCallback(
    (name) => {
      setConfirmModal({
        isOpen: true,
        title: "Eliminar archivo",
        message: `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            await axios.delete(`${API}/api/files/${encodeURIComponent(name)}`);
            addToast(`"${name}" eliminado correctamente`, "success");
            fetchFiles();
          } catch (err) {
            addToast(getErrorMessage(err, "eliminación"), "error");
          }
        },
      });
    },
    [addToast, fetchFiles]
  );

  // ============================================================
  // HANDLER: Renombrar archivo
  // Usa el valor debounced para evitar requests mientras se escribe
  // ============================================================

  const handleRename = useCallback(
    async (oldName) => {
      const trimmed = debouncedNewName.trim();
      if (!trimmed) {
        addToast("El nombre no puede estar vacío", "warning");
        return;
      }

      // La extensión se preserva automáticamente del archivo original
      const originalExt = getExtension(oldName);
      const fullNewName = `${trimmed}.${originalExt}`;

      try {
        await axios.post(`${API}/api/files/${encodeURIComponent(oldName)}/rename`, {
          newName: fullNewName,
        });
        addToast(`Renombrado: "${oldName}" → "${fullNewName}"`, "success");
        setRenaming(null);
        setNewName("");
        fetchFiles();
      } catch (err) {
        addToast(getErrorMessage(err, "renombrado"), "error");
      }
    },
    [debouncedNewName, addToast, fetchFiles]
  );

  // ============================================================
  // HANDLER: Ordenamiento de columnas
  // ============================================================

  const handleSort = useCallback((key) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  }, []);

  // ============================================================
  // MEMO: Lista de archivos ordenada — evita reordenar en cada render
  // ============================================================

  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") {
        cmp = (a.name || "").localeCompare(b.name || "", "es");
      } else if (sort.key === "size") {
        cmp = (a.size || 0) - (b.size || 0);
      } else if (sort.key === "lastModified") {
        cmp = new Date(a.lastModified || 0) - new Date(b.lastModified || 0);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [files, sort]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "32px 20px 48px",
        minHeight: "100vh",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* === TOASTS === */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* === MODAL DE CONFIRMACIÓN === */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Cancelar"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        danger
      />

      {/* ============================================================
          HEADER
          ============================================================ */}
      <header
        style={{
          marginBottom: 32,
          animation: "acFadeInUp 0.5s ease",
        }}
      >
        {/* Logotipo y badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 8,
          }}
        >
          {/* Ícono de nube */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentHover})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: `0 4px 16px ${C.accentGlowStrong}`,
            }}
          >
            ☁️
          </div>
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: C.text,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              ArchivaCloud{" "}
              <span style={{ color: C.accent, fontWeight: 300 }}>P-12</span>
            </h1>
            <p
              style={{
                fontSize: 13,
                color: C.textMuted,
                margin: 0,
                letterSpacing: "0.2px",
              }}
            >
              Gestor documental · Amazon S3 · us-east-1
            </p>
          </div>
        </div>

        {/* Badges de formatos soportados */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { ext: "DOCX", color: C.docxColor },
            { ext: "ODT", color: C.odtColor },
            { ext: "RTF", color: C.rtfColor },
          ].map(({ ext, color }) => (
            <span
              key={ext}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                color: color,
                background: `${color}15`,
                border: `1px solid ${color}30`,
                letterSpacing: "0.5px",
              }}
            >
              {ext}
            </span>
          ))}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 500,
              color: C.textMuted,
              background: C.bgSurface,
              border: `1px solid ${C.border}`,
            }}
          >
            máx 14 MB
          </span>
        </div>
      </header>

      {/* ============================================================
          ZONA DE SUBIDA — DRAG & DROP
          ============================================================ */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? C.borderDrag : C.border}`,
          borderRadius: 16,
          padding: uploading ? "28px 24px" : "40px 24px",
          textAlign: "center",
          marginBottom: 32,
          background: dragging ? C.accentGlow : C.bgCard,
          transition: "all 0.3s ease",
          animation: dragging ? "acDropBounce 0.3s ease" : "acFadeInUp 0.6s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Efecto de brillo sutil en hover */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${C.accentGlowStrong}, transparent)`,
            opacity: dragging ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />

        {uploading ? (
          /* ---- ESTADO: Subiendo ---- */
          <div>
            <div
              style={{
                width: 40,
                height: 40,
                margin: "0 auto 12px",
                border: `3px solid ${C.border}`,
                borderTopColor: C.accent,
                borderRadius: "50%",
                animation: "acSpin 0.8s linear infinite",
              }}
            />
            <ProgressBar progress={uploadProgress} retryCount={retryCount} />
            <button
              onClick={cancelUpload}
              style={{
                marginTop: 16,
                padding: "8px 20px",
                background: "transparent",
                border: `1px solid ${C.dangerBorder}`,
                borderRadius: 8,
                color: C.danger,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = C.dangerBg;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              Cancelar subida
            </button>
          </div>
        ) : (
          /* ---- ESTADO: Esperando archivo ---- */
          <div>
            {/* Ícono de upload */}
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: C.accentGlow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: C.text,
                margin: "0 0 6px",
              }}
            >
              {dragging
                ? "Suelta el archivo aquí"
                : "Arrastra un archivo o haz clic para seleccionar"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: C.textMuted,
                margin: "0 0 20px",
              }}
            >
              Formatos: DOCX, ODT, RTF · Tamaño máximo: 14 MB
            </p>

            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.odt,.rtf"
              onChange={handleFileInput}
              style={{ display: "none" }}
              id="file-upload-input"
            />
            <label
              htmlFor="file-upload-input"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 28px",
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentHover})`,
                color: "#fff",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.25s ease",
                boxShadow: `0 4px 12px ${C.accentGlowStrong}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 6px 20px ${C.accentGlowStrong}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 12px ${C.accentGlowStrong}`;
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Seleccionar archivo
            </label>
          </div>
        )}
      </div>

      {/* ============================================================
          TABLA DE ARCHIVOS
          ============================================================ */}
      <div
        style={{
          background: C.bgCard,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          animation: "acFadeInUp 0.7s ease",
        }}
      >
        {/* Header de la tabla */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: C.text,
                margin: 0,
              }}
            >
              Archivos
            </h2>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: C.accent,
                background: C.accentGlow,
              }}
            >
              {loading ? "..." : files.length}
            </span>
          </div>

          {/* Botón de refrescar */}
          <button
            onClick={fetchFiles}
            disabled={loading}
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 14px",
              color: C.textSoft,
              fontSize: 12,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = C.bgHover;
                e.currentTarget.style.borderColor = C.accent;
                e.currentTarget.style.color = C.text;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.bgSurface;
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.textSoft;
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: loading ? "acSpin 1s linear infinite" : "none",
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Actualizar
          </button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: C.bgSurface }}>
                <SortHeader label="Archivo" sortKey="name" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Tamaño" sortKey="size" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Modificado" sortKey="lastModified" currentSort={sort} onSort={handleSort} />
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    borderBottom: `1px solid ${C.border}`,
                    color: C.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Estado de carga: skeleton */}
              {loading &&
                [1, 2, 3, 4].map((i) => <SkeletonRow key={`skeleton-${i}`} />)}

              {/* Sin archivos */}
              {!loading && files.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "48px 16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          background: C.bgSurface,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                        }}
                      >
                        📁
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: C.textMuted,
                          margin: 0,
                        }}
                      >
                        No hay archivos en el bucket
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          margin: 0,
                          opacity: 0.7,
                        }}
                      >
                        Arrastra un archivo o usa el botón de subida
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Lista de archivos */}
              {!loading &&
                sortedFiles.map((f, idx) => {
                  const ext = getExtension(f.name);
                  const isRenaming = renaming === f.name;

                  return (
                    <tr
                      key={f.key || f.name}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        transition: "background 0.2s",
                        animation: `acFadeInUp ${0.3 + idx * 0.05}s ease`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.bgHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Nombre + ícono */}
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <FileIcon extension={ext} size={30} />
                          <span
                            style={{
                              color: C.text,
                              fontWeight: 500,
                              wordBreak: "break-all",
                            }}
                          >
                            {f.name}
                          </span>
                        </div>
                      </td>

                      {/* Tamaño */}
                      <td
                        style={{
                          padding: "14px 16px",
                          color: C.textSoft,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatSize(f.size)}
                      </td>

                      {/* Fecha de modificación */}
                      <td
                        style={{
                          padding: "14px 16px",
                          color: C.textMuted,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(f.lastModified)}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {isRenaming ? (
                          /* ---- Modo renombrar ---- */
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "center",
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                              <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRename(f.name);
                                  if (e.key === "Escape") {
                                    setRenaming(null);
                                    setNewName("");
                                  }
                                }}
                                placeholder="nuevo-nombre"
                                autoFocus
                                style={{
                                  padding: "0 10px",
                                  fontSize: 13,
                                  lineHeight: "32px",
                                  height: 32,
                                  boxSizing: "border-box",
                                  borderRadius: "6px 0 0 6px",
                                  border: `1px solid ${C.borderFocus}`,
                                  borderRight: "none",
                                  background: C.bgInput,
                                  color: C.text,
                                  width: 130,
                                  outline: "none",
                                  transition: "border-color 0.2s",
                                }}
                              />
                              {/* Extensión fija no editable */}
                              <span
                                style={{
                                  padding: "0 10px",
                                  fontSize: 13,
                                  lineHeight: "32px",
                                  height: 32,
                                  boxSizing: "border-box",
                                  borderRadius: "0 6px 6px 0",
                                  border: `1px solid ${C.borderFocus}`,
                                  background: C.bgSurface,
                                  color: C.textMuted,
                                  fontWeight: 500,
                                  userSelect: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                              >
                                .{getExtension(f.name)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRename(f.name)}
                              style={{
                                padding: "6px 12px",
                                background: C.accent,
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = C.accentHover;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = C.accent;
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setRenaming(null);
                                setNewName("");
                              }}
                              style={{
                                padding: "6px 12px",
                                background: C.bgSurface,
                                color: C.textSoft,
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = C.bgHover;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = C.bgSurface;
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          /* ---- Botones normales ---- */
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={() => {
                                setRenaming(f.name);
                                // Solo el nombre base, sin extensión
                                const baseName = f.name.substring(0, f.name.length - getExtension(f.name).length - 1);
                                setNewName(baseName);
                              }}
                              title="Renombrar archivo"
                              style={{
                                padding: "6px 14px",
                                background: C.warningBg,
                                color: C.warning,
                                border: `1px solid ${C.warningBorder}`,
                                borderRadius: 8,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 500,
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${C.warning}25`;
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = C.warningBg;
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Renombrar
                            </button>
                            <button
                              onClick={() => handleDelete(f.name)}
                              title="Eliminar archivo"
                              style={{
                                padding: "6px 14px",
                                background: C.dangerBg,
                                color: C.danger,
                                border: `1px solid ${C.dangerBorder}`,
                                borderRadius: 8,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 500,
                                transition: "all 0.2s",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${C.danger}25`;
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = C.dangerBg;
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer
        style={{
          marginTop: 32,
          textAlign: "center",
          fontSize: 12,
          color: C.textMuted,
          opacity: 0.6,
        }}
      >
        ArchivaCloud P-12 · Bucket: archivacloud-p12 · Región: us-east-1
      </footer>
    </div>
  );
}
