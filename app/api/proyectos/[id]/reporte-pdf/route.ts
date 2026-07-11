import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendResponse = await fetch(`${BACKEND_URL}/proyectos/${id}/reporte-pdf`, {
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Error al generar PDF" }, { status: backendResponse.status });
    }

    const pdfBuffer = await backendResponse.arrayBuffer();
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=reporte-trazabilidad-${id}.pdf`
      }
    });
  } catch (error) {
    console.error("Error proxying PDF:", error);
    return NextResponse.json({ error: "Error de conexión con el backend de IA" }, { status: 500 });
  }
}
