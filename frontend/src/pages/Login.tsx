import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-navy-900">
            IQ
          </div>
          <span className="font-display text-lg font-bold text-white">InventiQ</span>
        </div>

        <div className="relative max-w-md">
          <ShoppingBasket size={40} className="mb-6 text-brand-300" />
          <h2 className="font-display text-3xl font-bold leading-tight text-white text-balance">
            Todo tu bazar, ordenado en un solo lugar.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Inventario, ventas, compras y caja diaria — sin cuadernos ni hojas de cálculo sueltas.
          </p>
        </div>

        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} InventiQ</p>
      </div>

      <div className="flex items-center justify-center bg-ink-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-navy-900">
              IQ
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">InventiQ</h1>
          </div>

          <h1 className="mb-1 hidden font-display text-2xl font-bold text-ink-900 lg:block">Bienvenido de vuelta</h1>
          <p className="mb-6 hidden text-sm text-ink-500 lg:block">Ingresa con tu cuenta para continuar.</p>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
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
