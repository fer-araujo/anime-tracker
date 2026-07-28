"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
      <h2 className="text-xl font-semibold text-white mb-2">Algo salió mal</h2>
      <p className="text-white/50 text-sm mb-6">Ocurrió un error inesperado.</p>
      <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-[filter] cursor-pointer">Reintentar</button>
    </div>
  );
}
