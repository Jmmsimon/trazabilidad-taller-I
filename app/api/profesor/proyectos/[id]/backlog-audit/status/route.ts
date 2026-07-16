import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const res = await fetch(
      `${BACKEND_URL}/profesor/proyectos/${id}/backlog-audit/status`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Error proxying GET backlog-audit/status ${id}:`, error);
    return NextResponse.json(
      { error: "No se pudo conectar con el backend de auditoría" },
      { status: 500 }
    );
  }
}
