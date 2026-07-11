"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, CheckCircle2, Copy, ExternalLink, Calendar, Cpu, Layers } from "lucide-react";
import { RadarChart } from "../../dashboard/estudiante/components/RadarChart";

interface Competencia {
  id: string;
  nombre: string;
  nivel: "basico" | "intermedio" | "avanzado";
  adquirida: boolean;
}

interface PortfolioData {
  proyectoId: string;
  alumnoNombre: string;
  tema: string;
  descripcion: string;
  stack: string[];
  tracking: {
    score_integridad: number;
    reporte_competencias: {
      porcentaje_adquirido: number;
      competencias: Competencia[];
    };
    estado_repo: {
      ci_status: string;
      demo_url: string | null;
    };
  };
  hitos: Array<{
    semana: number;
    nombre: string;
    validado: boolean;
  }>;
  digitalSignature: string;
}

export default function PortfolioPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`/api/proyectos/${id}/portfolio`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el portafolio público o el proyecto no existe.");
        }
        const dataJson: PortfolioData = await res.json();
        setData(dataJson);
      } catch (err: any) {
        setError(err.message || "Error al cargar portafolio.");
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [id]);

  const handleCopySignature = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.digitalSignature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cargando Portafolio Académico...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center gap-4 p-4 text-center">
        <Shield className="w-12 h-12 text-red-500 animate-bounce" />
        <h1 className="text-lg font-bold text-slate-800">Portafolio No Disponible</h1>
        <p className="text-xs text-slate-500 max-w-md">{error || "El proyecto solicitado no existe o no tiene datos de trazabilidad completados."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden py-10 sm:py-16">
      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50/70 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-50/70 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
        
        {/* Certificate Header Badge */}
        <div className="flex items-center justify-between border border-slate-200/80 bg-white/80 backdrop-blur rounded-2xl px-6 py-4 shadow-sm flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Portafolio Certificado e Inmutable — Trazabilidad AI
            </span>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase rounded-lg border border-emerald-250 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verificado por Docente
          </span>
        </div>

        {/* Project Profile Summary */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                PROYECTO CAPSTONE
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight pt-1">
                {data.tema}
              </h1>
              <p className="text-sm font-semibold text-slate-500">
                Estudiante: <strong className="text-slate-800">{data.alumnoNombre}</strong>
              </p>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-650 leading-relaxed text-justify">
              {data.descripcion}
            </p>

            <div className="space-y-2 pt-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Stack Tecnológico Validado
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.stack.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-slate-600 text-[11px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {data.tracking.estado_repo.demo_url && (
              <div className="pt-4">
                <a
                  href={data.tracking.estado_repo.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Visitar Aplicación en Vivo
                </a>
              </div>
            )}
          </div>

          {/* Integrity Score */}
          <div className="border border-slate-200/80 bg-slate-50/50 rounded-2xl p-6 text-center space-y-3 h-full flex flex-col justify-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-500" /> Score de Trazabilidad
            </h3>
            <div className="py-2">
              <div className="text-5xl font-black text-indigo-600 leading-none">
                {data.tracking.score_integridad}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                / 100 Puntos
              </div>
            </div>
            <p className="text-[10px] text-slate-550 leading-relaxed max-w-[200px] mx-auto">
              Métrica de consistencia semántica generada por auditoría automática de commits en Git.
            </p>
          </div>
        </div>

        {/* Competencies & Roadmap Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Radar Chart (Competencies) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-indigo-500" /> Radar de Competencias Académicas
            </h3>
            {data.tracking.reporte_competencias.competencias && data.tracking.reporte_competencias.competencias.length >= 3 ? (
              <div className="flex justify-center py-4 bg-slate-50/40 rounded-2xl border border-slate-100">
                <RadarChart competencias={data.tracking.reporte_competencias.competencias} />
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-10 italic">
                Sin datos de competencias suficientes para graficar.
              </p>
            )}
            <div className="pt-2">
              <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-sm mx-auto">
                Este radar evalúa el dominio de competencias en backend, frontend, testing, devops y control de versiones alineados al código real.
              </p>
            </div>
          </div>

          {/* Validated Weekly Milestones */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-indigo-500" /> Avance Semanal Validado (Roadmap)
            </h3>
            
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {data.hitos.map((hito, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    hito.validado
                      ? "bg-emerald-50/30 border-emerald-100 text-emerald-900"
                      : "bg-slate-50/50 border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      hito.validado ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                    }`}>
                      Sem {hito.semana}
                    </span>
                    <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">{hito.nombre}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    hito.validado ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-slate-100 border border-slate-200 text-slate-400"
                  }`}>
                    {hito.validado ? "Validado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Certificate Seal box at the bottom */}
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              Certificado SHA-256 Inmutable
            </h4>
            <p className="text-xs text-slate-350 leading-relaxed font-semibold">
              Firma digital de consistencia académica que garantiza que las competencias y el avance mostrados corresponden íntegramente a repositorios y commits verificados por IA.
            </p>
            <div className="font-mono text-[9px] text-indigo-300 select-all break-all pt-1">
              Firma: {data.digitalSignature}
            </div>
          </div>
          
          <button
            onClick={handleCopySignature}
            className="flex-shrink-0 py-2.5 px-5 bg-slate-800 hover:bg-slate-755 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-4 h-4 text-emerald-400" /> {copied ? "Copiado" : "Copiar Firma"}
          </button>
        </div>

      </div>
    </div>
  );
}
