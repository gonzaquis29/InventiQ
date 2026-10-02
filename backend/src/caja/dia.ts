// El negocio opera en Lima (UTC−5, sin horario de verano): un "día" va de 00:00 a 23:59 hora local.
const ZONA = 'America/Lima';
const OFFSET = '-05:00';

export function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(
    new Date(),
  );
}

export function esFechaValida(fecha: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(new Date(`${fecha}T00:00:00${OFFSET}`).getTime())
  );
}

export function rangoDia(fecha: string) {
  const desde = new Date(`${fecha}T00:00:00${OFFSET}`);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { desde, hasta };
}
