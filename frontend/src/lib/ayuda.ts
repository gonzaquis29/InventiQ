export interface AyudaPagina {
  resumen: string;
  pasos: string[];
}

/** Textos de "¿Cómo funciona?" de cada pantalla. Escritos para alguien que usa el sistema por primera vez. */
export const AYUDA = {
  inicio: {
    resumen: 'Tu punto de partida: lo más importante del día de un vistazo.',
    pasos: [
      'Usa los accesos rápidos para vender, ver la caja del día o agregar productos.',
      'Si aparece el aviso naranja, hay productos por acabarse: tócalo para verlos.',
      'Abajo ves las últimas ventas registradas.',
    ],
  },
  pos: {
    resumen: 'Aquí registras cada venta. Siempre está disponible, no necesitas abrir caja.',
    pasos: [
      'Escanea el código de barras con la pistola o escribe el nombre del producto.',
      'Toca el producto para agregarlo al carrito. Ahí puedes cambiar cantidad, unidad o precio.',
      'Elige cómo pagó el cliente: efectivo, tarjeta, Yape/Plin o mixto (parte y parte).',
      'Pulsa "Cobrar". Si pagó en efectivo, escribe con cuánto pagó y verás el vuelto.',
    ],
  },
  ventas: {
    resumen: 'El historial de todas las ventas registradas.',
    pasos: [
      'Toca una venta para ver qué se vendió y reimprimir su comprobante.',
      'Si una venta se registró por error, ábrela y anúlala: el stock vuelve al inventario.',
    ],
  },
  inventario: {
    resumen: 'Todos tus productos con su precio y stock actual.',
    pasos: [
      'Busca por nombre, código, marca o categoría. No importa si escribes con o sin tildes.',
      'Los productos en naranja tienen stock bajo: conviene reponerlos.',
      'Toca un producto para editarlo, ver su historial de movimientos o ajustar el stock.',
      'Con "Importar" puedes cargar muchos productos a la vez desde un archivo CSV/Excel.',
    ],
  },
  compras: {
    resumen: 'Registra la mercadería que te llega de tus proveedores.',
    pasos: [
      'Pulsa "Nueva compra", elige el proveedor y agrega los productos con su cantidad y costo.',
      'Al guardar, el stock sube solo y se actualiza el precio de compra de cada producto.',
    ],
  },
  proveedores: {
    resumen: 'La lista de a quién le compras mercadería.',
    pasos: [
      'Agrega un proveedor con su nombre y, si quieres, su contacto y RUC.',
      'Si ya no le compras, desactívalo en vez de borrarlo: así no pierdes su historial de compras.',
    ],
  },
  caja: {
    resumen: 'Cuánto dinero entró hoy y si el efectivo cuadra. No hay que abrir ni cerrar nada.',
    pasos: [
      'Arriba ves lo vendido hoy, separado por cómo pagaron los clientes.',
      '"Efectivo esperado" es cuánto efectivo debería haber: lo vendido en efectivo menos los gastos.',
      'Si pagas algo con la plata de las ventas (delivery, pasajes, un proveedor), regístralo como gasto.',
      'Cuando quieras, cuenta el efectivo y pulsa "Cuadrar efectivo": te dirá si cuadra, falta o sobra.',
    ],
  },
  reportes: {
    resumen: 'Cómo va el negocio en el tiempo: ventas, ganancias, inventario y caja.',
    pasos: [
      'Elige una pestaña y el rango de fechas que quieres revisar.',
      'Pasa el mouse sobre los gráficos para ver el detalle de cada barra o punto.',
      'Con "Exportar CSV" descargas el reporte para abrirlo en Excel.',
    ],
  },
  configuracion: {
    resumen: 'Las listas que usa el resto del sistema.',
    pasos: [
      'Categorías y marcas sirven para ordenar y buscar productos en Inventario.',
      'Las unidades de compra (caja, paquete, docena…) se usan al registrar compras.',
      'Solo puedes borrar un elemento si ningún producto lo está usando.',
      'En «Usuarios» creas las cuentas del equipo y eliges si son Administrador o Vendedor.',
    ],
  },
  auditoria: {
    resumen: 'El historial de lo que se hizo en el sistema: quién, qué y cuándo.',
    pasos: [
      'Cada venta, anulación, ajuste de stock, compra, gasto y cambio de usuarios queda registrado solo.',
      'Filtra por tipo de acción o por fecha para encontrar algo puntual.',
      'Los intentos de ingreso fallidos también aparecen, por si alguien intenta entrar sin permiso.',
    ],
  },
} satisfies Record<string, AyudaPagina>;

export type AyudaKey = keyof typeof AYUDA;
