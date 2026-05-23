import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(
      `${BACKEND}/proyectos/${id}/tracking/status`,
      {
        cache: 'no-store'
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Error proxying to backend tracking status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
