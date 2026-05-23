import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Enviamos la idea al backend de Python (FastAPI)
    const backendResponse = await fetch(`${BACKEND_URL}/proyectos/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idea: body.idea,
        stack: body.stack,
        nombre: body.nombre,
        alumnoId: body.alumnoId || "estudiante_demo"
      })
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json({ error: errorData.detail || "Error en el backend de Python" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error proxying to Python backend:", error);
    return NextResponse.json({ 
      error: "No se pudo conectar con el servidor de IA (Python)", 
      detalle: error.message,
      urlIntentada: `${BACKEND_URL}/proyectos/iniciar`
    }, { status: 500 });
  }
}
