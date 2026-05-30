import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  try {
    const res = await fetch(
      `${BACKEND_URL}/proyectos/${id}/backlog/${itemId}/corregir`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(
      `Error proxying POST /proyectos/${id}/backlog/${itemId}/corregir:`,
      error
    );
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor" },
      { status: 500 }
    );
  }
}
