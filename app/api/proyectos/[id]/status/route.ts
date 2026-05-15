import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // En Next.js 15+, params debe ser esperado con await
    const { id } = await params;
    
    // Consultamos el estado al backend de Python (FastAPI)
    const backendResponse = await fetch(`http://localhost:8000/proyectos/${id}/status`, {
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ status: "error" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error polling Python backend:", error);
    return NextResponse.json({ error: "Error de conexión con el servidor de IA" }, { status: 500 });
  }
}
