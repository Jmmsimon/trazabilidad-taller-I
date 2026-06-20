import { Users, BookOpen, UserCheck } from "lucide-react";

interface AdminMetricsProps {
  totalCount: number;
  estudiantesCount: number;
  docentesCount: number;
}

export function AdminMetrics({ totalCount, estudiantesCount, docentesCount }: AdminMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/50">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800">{totalCount}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Usuarios</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-blue-600">{estudiantesCount}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Estudiantes</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-600">{docentesCount}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Docentes</div>
        </div>
      </div>
    </div>
  );
}
