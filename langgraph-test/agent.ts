import { Annotation, StateGraph } from "@langchain/langgraph";

// 1. EL ESTADO: La información que viaja
const ProyectoState = Annotation.Root({
  descripcion: Annotation<string>(),
  stack: Annotation<string[]>(),
  esAprobado: Annotation<boolean>(),
  feedback: Annotation<string>(),
  faseActual: Annotation<string>(),
});

// 2. AGENTE 1: Planificador (Revisa que la idea tenga sentido)
async function agentePlanificador(state: typeof ProyectoState.State) {
  const tieneSentido = state.descripcion.length > 20;
  return {
    faseActual: "Revisión Técnica",
    feedback: tieneSentido ? "Idea clara." : "La idea es muy corta.",
    esAprobado: tieneSentido
  };
}

// 3. AGENTE 2: Revisor Técnico (Revisa el stack)
async function agenteRevisor(state: typeof ProyectoState.State) {
  const tieneStack = state.stack && state.stack.length > 0;
  return {
    faseActual: "Visto Bueno",
    feedback: tieneStack ? state.feedback + " Stack correcto." : state.feedback + " Falta definir el stack.",
    esAprobado: state.esAprobado && tieneStack
  };
}

// 4. EL ENRUTADOR: Decide a dónde va
function decidirRuta(state: typeof ProyectoState.State) {
  // Si el planificador lo reprueba, termina ahí. Si lo aprueba, pasa al revisor.
  if (!state.esAprobado) {
    return "__end__";
  }
  return "revisor";
}

// 5. CONSTRUIMOS EL GRAFO
const workflow = new StateGraph(ProyectoState)
  .addNode("planificador", agentePlanificador)
  .addNode("revisor", agenteRevisor)
  .addEdge("__start__", "planificador")
  // Usamos el enrutador condicional
  .addConditionalEdges("planificador", decidirRuta)
  .addEdge("revisor", "__end__");

// Exportamos el grafo para que la interfaz de LangGraph Studio lo pueda leer
export const graph = workflow.compile();
