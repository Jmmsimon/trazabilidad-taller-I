// langgraph-test/test.ts
import { graph } from "./agent";

async function probarAgentes() {
  console.log("🚀 Iniciando el flujo multi-agente...\n");

  // Simulamos lo que el alumno escribiría en el frontend
  const estadoInicial = {
    descripcion: "Sistema de trazabilidad que se integra con MAFLO para el área de mantenimiento, vinculando reportes con órdenes de servicio.",
    stack: ["React", "NestJS", "PostgreSQL"],
    faseActual: "Inicio",
    esAprobado: true,
    feedback: ""
  };

  console.log("📥 Datos de entrada:", estadoInicial, "\n");

  // Ejecutamos el grafo (pasa por el Planificador y luego por el Revisor)
  const resultadoFinal = await graph.invoke(estadoInicial);

  console.log("✅ Resultado después de pasar por los agentes:");
  console.log(JSON.stringify(resultadoFinal, null, 2));
}

probarAgentes();
