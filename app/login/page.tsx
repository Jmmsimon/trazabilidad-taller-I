"use client";

import React, { useState } from "react";
import { IconNetwork } from "@tabler/icons-react";

export default function LoginPage() {
  const [email, setEmail] = useState("docente@universidad.edu");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Iniciando sesión con:", { email, password });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-gray-100">
      <div className="w-full max-w-[380px] bg-[#18181B] rounded-2xl border border-[#27272A] p-8 shadow-2xl flex flex-col items-center">
        
        {/* Ícono Principal */}
        <div className="w-14 h-14 bg-[#6D63E0]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#6D63E0]/30">
          <IconNetwork className="text-[#6D63E0] w-7 h-7" stroke={1.5} />
        </div>

        {/* Título y Subtítulo */}
        <h1 className="text-xl font-semibold mb-1 tracking-tight text-white">Sistema de Trazabilidad</h1>
        <p className="text-sm text-gray-400 mb-8 text-center">
          Ingresa tus credenciales para acceder a la plataforma académica
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400 block" htmlFor="email">
              Correo Institucional
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="docente@universidad.edu"
              className="w-full bg-black/50 border border-[#27272A] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#6D63E0] focus:ring-1 focus:ring-[#6D63E0] transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400 block" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-[#27272A] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#6D63E0] focus:ring-1 focus:ring-[#6D63E0] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#6D63E0] hover:bg-[#5b52cc] text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
          >
            Ingresar
          </button>
        </form>

        {/* Botones de Roles */}
        <div className="w-full mt-8 pt-6 border-t border-[#27272A] flex justify-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#4a3f9e]/30 text-[#b5aef5] border border-[#6D63E0]/20">
            Soy alumno
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/30">
            Soy docente
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-200 text-gray-900 border border-gray-300">
            Escuela
          </span>
        </div>
        
      </div>
    </div>
  );
}
