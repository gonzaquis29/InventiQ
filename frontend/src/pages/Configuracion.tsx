import { useState } from 'react';
import { Tag, Award, Ruler } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/Card';
import { CatalogoSimple } from '@/components/configuracion/CatalogoSimple';

const TABS = [
  {
    key: 'categorias',
    label: 'Categorías',
    icon: Tag,
    endpoint: '/categorias',
    descripcion: 'Se usan para clasificar productos en Inventario. Bórralas solo si ningún producto las usa.',
  },
  {
    key: 'marcas',
    label: 'Marcas',
    icon: Award,
    endpoint: '/marcas',
    descripcion: 'Sugerencias al escribir la marca de un producto. Se registran solas al guardar un producto con una marca nueva.',
  },
  {
    key: 'unidades',
    label: 'Unidades de compra',
    icon: Ruler,
    endpoint: '/unidades-medida',
    descripcion:
      'Presets rápidos al agregar una unidad alternativa a un producto (ej. "docena" = 12). Deja el equivalente vacío si varía según el producto (ej. "caja"). La equivalencia real de cada producto se configura en su propia ficha, en Inventario.',
    conFactor: true,
  },
] as const;

export default function Configuracion() {
  const [activa, setActiva] = useState<(typeof TABS)[number]['key']>('categorias');
  const tab = TABS.find((t) => t.key === activa) ?? TABS[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Configuración</h1>
        <p className="text-sm text-ink-500">Catálogos que usa el resto del sistema — agrega, renombra o elimina sin tocar código.</p>
      </div>

      <div className="mb-4 flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiva(t.key)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activa === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <CatalogoSimple
            key={tab.key}
            endpoint={tab.endpoint}
            descripcion={tab.descripcion}
            conFactor={'conFactor' in tab ? tab.conFactor : false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
