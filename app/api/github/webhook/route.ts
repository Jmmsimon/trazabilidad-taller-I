import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendResponse = await fetch(`${BACKEND_URL}/github/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Error forwarding webhook" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying github webhook:", error);
    return NextResponse.json({ error: "Error de conexión con el backend de IA" }, { status: 500 });
  }
}
