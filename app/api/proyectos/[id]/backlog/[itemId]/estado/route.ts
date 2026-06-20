import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();
    const res = await fetch(
      `${BACKEND_URL}/proyectos/${id}/backlog/${itemId}/estado`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Error proxying backlog estado update:", error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor" },
      { status: 500 }
    );
  }
}
