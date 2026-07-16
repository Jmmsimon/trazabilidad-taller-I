"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link2,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { IconCircleFilled } from "@tabler/icons-react";

// ── Types ──────────────────────────────────────────────────────────────

type SemaforoColor = "rojo" | "naranja" | "amarillo" | "verde";
type AuditStatus = "not_started" | "processing" | "completed" | "error";

interface AuditItemResult {
  id: string;
  titulo: string;
  estado_backlog: string;
  tiene_evidencia: boolean;
  evidencia: string | null;
  score_item: number;
  nota: string | null;
}

interface AuditResult {
  audit_status: AuditStatus;
  semaforo: SemaforoColor | null;
  porcentaje_correspondencia: number;
  audit_results: AuditItemResult[];
  desviaciones: string[];
  reporte_texto: string;
  backlog_items_count: number;
  error: string | null;
}

interface BacklogAuditorProps {
  proyectoId: string;
  repoUrl: string | null;
  initialAudit?: any;
}

// ── Semáforo Config ───────────────────────────────────────────────────

const SEMAFORO_CONFIG: Record<
  SemaforoColor,
  { label: string; description: string; glow: string; bg: string; border: string; text: string }
> = {
  rojo: {
    label: "ROJO — Proyecto en riesgo crítico",
    description: "El proyecto está abandonado o muy desfasado. El código no corresponde al backlog o el estudiante no ha avanzado.",
    glow: "shadow-red-500/30",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
  naranja: {
    label: "NARANJA — Avance insuficiente",
    description: "El estudiante ha avanzado algo, pero está significativamente desfasado respecto al backlog planificado.",
    glow: "shadow-orange-500/30",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  amarillo: {
    label: "AMARILLO — Avance parcial",
    description: "El estudiante presenta avances sólidos pero le faltan algunos entregables para completar el backlog.",
    glow: "shadow-yellow-500/30",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
  },
  verde: {
    label: "VERDE — Proyecto acorde al backlog",
    description: "El código del repositorio corresponde al backlog documentado. El estudiante lleva un avance real y consistente.",
    glow: "shadow-emerald-500/30",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
};

const SEMAFORO_EMOJI: Record<SemaforoColor, React.ReactNode> = {
  rojo: <IconCircleFilled className="w-8 h-8 text-red-500" />,
  naranja: <IconCircleFilled className="w-8 h-8 text-orange-500" />,
  amarillo: <IconCircleFilled className="w-8 h-8 text-yellow-500" />,
  verde: <IconCircleFilled className="w-8 h-8 text-emerald-500" />,
};

const STROKE_COLOR: Record<SemaforoColor, string> = {
  rojo: "#ef4444",
  naranja: "#f97316",
  amarillo: "#eab308",
  verde: "#10b981",
};

// ── Progress Ring ─────────────────────────────────────────────────────

function ProgressRing({ pct, color }: { pct: number; color: SemaforoColor }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="68" cy="68" r={radius}
          fill="none"
          stroke={STROKE_COLOR[color]}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-800">{Math.round(pct)}%</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avance</span>
      </div>
    </div>
  );
}

// ── Audit Item Row ────────────────────────────────────────────────────

function AuditItemRow({ item }: { item: AuditItemResult }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor =
    item.score_item >= 80
      ? "text-emerald-600 bg-emerald-50"
      : item.score_item >= 50
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";

  const evidenciaIcon = item.tiene_evidencia ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
  ) : item.estado_backlog === "To Do" ? (
    <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />
  ) : (
    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
  );

  const estadoBadge: Record<string, string> = {
    Done: "bg-emerald-100 text-emerald-700",
    "In Progress": "bg-blue-100 text-blue-700",
    "To Do": "bg-slate-100 text-slate-600",
  };

  return (
    <div className="border border-slate-150 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        {evidenciaIcon}
        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{item.titulo}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
            estadoBadge[item.estado_backlog] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {item.estado_backlog}
        </span>
        <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${scoreColor}`}>
          {Math.round(item.score_item)}%
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2"
          >
            {item.evidencia && (
              <div className="flex items-start gap-2">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <code className="text-xs text-indigo-700 font-mono break-all">{item.evidencia}</code>
              </div>
            )}
            {item.nota && (
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600">{item.nota}</p>
              </div>
            )}
            {!item.evidencia && !item.nota && (
              <p className="text-xs text-slate-400 italic">Sin detalles adicionales.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────



function formatApiError(payload: unknown, status: number): string {
  if (!payload || typeof payload !== "object") return `HTTP ${status}`;
  const err = payload as { detail?: unknown; error?: unknown };
  const detail = err.detail ?? err.error;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: string }).msg) : String(d)))
      .join("; ");
  }
  return `HTTP ${status}`;
}

export function BacklogAuditor({ proyectoId, repoUrl, initialAudit }: BacklogAuditorProps) {
  const [inputMode, setInputMode] = useState<"csv" | "notion">("csv");
  const [csvText, setCsvText] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [auditStatus, setAuditStatus] = useState<AuditStatus>(initialAudit?.audit_status || "not_started");
  const [result, setResult] = useState<AuditResult | null>(
    (initialAudit?.audit_status === "completed" || initialAudit?.audit_status === "error") ? initialAudit : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(initialAudit?.error || null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAuditStatus(initialAudit?.audit_status || "not_started");
    setResult(
      initialAudit?.audit_status === "completed" || initialAudit?.audit_status === "error"
        ? initialAudit
        : null
    );
    setErrorMsg(initialAudit?.error || null);
  }, [proyectoId]); // reset al cambiar de proyecto

  const startPolling = useCallback(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/profesor/proyectos/${proyectoId}/backlog-audit/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: AuditResult = await res.json();
        setResult(data);
        if (data.audit_status === "completed" || data.audit_status === "error") {
          setAuditStatus(data.audit_status);
          if (data.error) setErrorMsg(data.error);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };
    poll();
    pollingRef.current = setInterval(poll, 3500);
  }, [proyectoId]);

  const handleFile = (file: File) => {
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      setErrorMsg("Por ahora sube CSV (exporta Excel como CSV UTF-8). El .xlsx no se lee directamente.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      setCsvText(text.replace(/^\uFEFF/, ""));
      setErrorMsg(null);
    };
    reader.readAsText(file, "UTF-8");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    setResult(null);
    setAuditStatus("processing");

    const body: Record<string, string> = {};
    if (inputMode === "csv") {
      if (!csvText.trim()) {
        setErrorMsg("Debes subir un CSV o pegar el contenido del backlog.");
        setAuditStatus("not_started");
        return;
      }
      body.backlog_csv = csvText;
    } else {
      if (!notionUrl.trim()) {
        setErrorMsg("Debes ingresar la URL pública de Notion.");
        setAuditStatus("not_started");
        return;
      }
      body.backlog_notion_url = notionUrl.trim();
    }

    try {
      const res = await fetch(`/api/profesor/proyectos/${proyectoId}/backlog-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(payload, res.status));
      }
      startPolling();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al iniciar la auditoría.";
      setErrorMsg(message);
      setAuditStatus("error");
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setAuditStatus("not_started");
    setResult(null);
    setErrorMsg(null);
    setCsvText("");
    setNotionUrl("");
  };

  const semConfig = result?.semaforo ? SEMAFORO_CONFIG[result.semaforo] : null;

  return (
    <div className="space-y-6">
      {/* ── Input Section ── */}
      {(auditStatus === "not_started" || auditStatus === "error") && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Auditoría de Avances — Semáforo de Progreso
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sube el backlog (CSV/Notion) y el agente sincerado compara ítem a ítem con el código del repo.
            </p>
            <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 font-semibold">
              Solo reporte docente: no modifica el Kanban ni el dashboard del estudiante.
              El Kanban lo actualiza el botón Analizar (tracking compartido).
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            {(["csv", "notion"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  inputMode === mode
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {mode === "csv" ? "📄 Subir CSV / Excel" : "🔗 URL Notion"}
              </button>
            ))}
          </div>

          {/* CSV Upload */}
          {inputMode === "csv" && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all
                  ${
                    isDragging
                      ? "border-indigo-400 bg-indigo-50"
                      : csvText
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
              >
                <Upload className={`w-6 h-6 ${csvText ? "text-emerald-500" : "text-slate-400"}`} />
                {csvText ? (
                  <p className="text-xs text-emerald-600 font-semibold">
                    ✓ Backlog cargado — {csvText.split("\n").length - 1} filas detectadas
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-600">
                      Arrastra tu CSV aquí o haz clic para seleccionarlo
                    </p>
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      CSV UTF-8. Columnas: id, titulo, tipo, estado, sprint
                      <br />
                      Estados: To Do / Por Hacer / In Progress / Done / Hecho — separador , o ;
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={4}
                className="w-full text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder={"titulo,tipo,estado,sprint\nLogin de usuario,HU,Done,1\nCRUD de productos,HU,In Progress,1\nTests unitarios,TA,To Do,2"}
              />
            </div>
          )}

          {/* Notion URL */}
          {inputMode === "notion" && (
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                URL Pública de Notion
              </label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  value={notionUrl}
                  onChange={(e) => setNotionUrl(e.target.value)}
                  placeholder="https://www.notion.so/tu-backlog-publico"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                La página debe ser pública: Share → Publish to Web en Notion.
              </p>
            </div>
          )}

          {/* Repo info */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <GitBranch className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Repositorio GitHub</p>
              {repoUrl ? (
                <a href={repoUrl} target="_blank" rel="noreferrer"
                   className="text-xs text-indigo-600 font-mono truncate block hover:underline">
                  {repoUrl}
                </a>
              ) : (
                <p className="text-xs text-red-500">Sin URL configurada. Configúrala primero en el proyecto.</p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{errorMsg}</p>
            </div>
          )}

          <button
            id="btn-ejecutar-auditoria"
            onClick={handleSubmit}
            disabled={!repoUrl}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Ejecutar Auditoría de Avances
          </button>
        </motion.section>
      )}

      {/* ── Processing ── */}
      {auditStatus === "processing" && (
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700">Auditoría sincerada en curso...</p>
            <p className="text-xs text-slate-400 mt-1">
              Parseo CSV → lectura profunda del repo → match ítem↔código → semáforo
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {[
              "Parseando backlog (CSV/Notion)...",
              "Leyendo árbol y snippets de GitHub...",
              "Cruzando cada ítem con evidencia real...",
              "Calculando semáforo y desviaciones...",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400 shrink-0" />
                {step}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Esto no altera el Kanban del alumno.
          </p>
        </motion.section>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {auditStatus === "completed" && result && semConfig && result.semaforo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Semáforo Card */}
            <section
              className={`${semConfig.bg} ${semConfig.border} border rounded-2xl p-6 shadow-lg space-y-4`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <ProgressRing pct={result.porcentaje_correspondencia} color={result.semaforo} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <span className="text-3xl">{SEMAFORO_EMOJI[result.semaforo]}</span>
                    <span className={`text-sm font-black ${semConfig.text}`}>
                      {SEMAFORO_CONFIG[result.semaforo].label}
                    </span>
                  </div>
                  <p className={`text-xs ${semConfig.text} opacity-80`}>
                    {semConfig.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
                    <div className="text-center">
                      <p className={`text-2xl font-black ${semConfig.text}`}>{result.backlog_items_count}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Ítems backlog</p>
                    </div>
                    <div className="w-px bg-slate-200" />
                    <div className="text-center">
                      <p className={`text-2xl font-black text-emerald-600`}>
                        {result.audit_results.filter(r => r.tiene_evidencia).length}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Con evidencia</p>
                    </div>
                    <div className="w-px bg-slate-200" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-red-600">{result.desviaciones.length}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Desviaciones</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desviaciones */}
              {result.desviaciones.length > 0 && (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Desviaciones detectadas
                  </p>
                  {result.desviaciones.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg px-3 py-2">
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{d}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Items Table */}
            {result.audit_results.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Detalle ítem a ítem del Backlog
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Con código</span>
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Sin código</span>
                    <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-slate-400" /> Pendiente</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {result.audit_results.map((item) => (
                    <AuditItemRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Executive Report */}
            {result.reporte_texto && (
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Reporte Ejecutivo del Agente
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {result.reporte_texto}
                </p>
              </section>
            )}

            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva auditoría
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      {auditStatus === "error" && result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Error en la auditoría</p>
            <p className="text-xs text-red-600 mt-1">{result.error}</p>
            <button onClick={handleReset} className="mt-3 text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer">
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
