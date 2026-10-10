import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { LogoIQ } from '@/components/ui/LogoIQ';

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo iniciar sesión'));
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 15%, rgba(255,90,46,0.30), transparent 45%), radial-gradient(circle at 85% 75%, rgba(255,90,46,0.18), transparent 40%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <LogoIQ size={36} className="rounded-xl ring-1 ring-white/15" />
          <span className="font-display text-lg font-bold text-white">InventiQ</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight text-white text-balance">
            Todo tu bazar, ordenado en un solo lugar.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Vende rápido, controla tu stock y cierra el día sin cuadernos ni hojas de cálculo sueltas.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ink-300">
            {[
              { icon: Receipt, texto: 'Punto de venta con lector de código de barras' },
              { icon: Package, texto: 'Stock al día y alertas de lo que se acaba' },
              { icon: Wallet, texto: 'Caja del día: gastos y cuadre cuando tú quieras' },
            ].map(({ icon: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-brand-400 ring-1 ring-white/10">
                  <Icono size={16} />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} InventiQ</p>
      </div>

      <div className="flex items-center justify-center bg-ink-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <LogoIQ size={52} className="mb-3 rounded-2xl" />
            <h1 className="font-display text-xl font-bold text-ink-900">InventiQ</h1>
          </div>

          <h1 className="mb-1 hidden font-display text-2xl font-bold text-ink-900 lg:block">Bienvenido de vuelta</h1>
          <p className="mb-6 hidden text-sm text-ink-500 lg:block">Ingresa con tu cuenta para continuar.</p>

          <form onSubmit={handleSubmit} className="animar-entrada rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_8px_30px_rgba(20,20,20,0.06)]">
            <div className="mb-4">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inventiq.pe"
              />
            </div>
            <div className="mb-5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-danger-bg px-3 py-2 text-sm text-red-danger">{error}</div>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
