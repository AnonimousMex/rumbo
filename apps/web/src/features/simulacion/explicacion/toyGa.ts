/**
 * Versión de juguete del algoritmo genético de Rumbo, para explicarlo en clase:
 * 6 envíos, 3 vehículos, un mapa de 10 × 10 km. Usa EXACTAMENTE la misma idea
 * que el motor real (dispatchService/src/geneticAlgorithm): gen = (envío,
 * vehículo), el orden de los genes es el orden de visita, aptitud = costo.
 */

export interface Punto {
  x: number;
  y: number;
}

export interface Vehiculo {
  id: number;
  nombre: string;
  medio: 'motocicleta' | 'camioneta' | 'bicicleta';
  color: string;
  base: Punto;
  kmPorMin: number;
  costoKm: number;
  pesoMax: number;
  capacidad: number;
  alcanceViajeKm: number;
}

export interface EnvioToy {
  id: number;
  nombre: string;
  origen: Punto;
  destino: Punto;
  pesoKg: number;
  limiteMin: number;
}

export interface Gen {
  e: number;
  v: number;
}

export type Cromosoma = Gen[];

export const VEHICULOS: Vehiculo[] = [
  { id: 0, nombre: 'Moto', medio: 'motocicleta', color: '#F97316', base: { x: 18, y: 86 }, kmPorMin: 0.6, costoKm: 4, pesoMax: 15, capacidad: 3, alcanceViajeKm: 99 },
  { id: 1, nombre: 'Camioneta', medio: 'camioneta', color: '#6366F1', base: { x: 50, y: 92 }, kmPorMin: 0.45, costoKm: 7, pesoMax: 500, capacidad: 4, alcanceViajeKm: 99 },
  { id: 2, nombre: 'Bici', medio: 'bicicleta', color: '#22C55E', base: { x: 82, y: 82 }, kmPorMin: 0.3, costoKm: 2, pesoMax: 5, capacidad: 2, alcanceViajeKm: 3.6 },
];

export const ENVIOS: EnvioToy[] = [
  { id: 0, nombre: 'E1', origen: { x: 20, y: 62 }, destino: { x: 34, y: 32 }, pesoKg: 2, limiteMin: 30 },
  { id: 1, nombre: 'E2', origen: { x: 45, y: 72 }, destino: { x: 70, y: 56 }, pesoKg: 12, limiteMin: 45 },
  { id: 2, nombre: 'E3', origen: { x: 62, y: 40 }, destino: { x: 85, y: 22 }, pesoKg: 1, limiteMin: 35 },
  { id: 3, nombre: 'E4', origen: { x: 30, y: 46 }, destino: { x: 14, y: 16 }, pesoKg: 25, limiteMin: 70 },
  { id: 4, nombre: 'E5', origen: { x: 76, y: 66 }, destino: { x: 56, y: 14 }, pesoKg: 4, limiteMin: 50 },
  { id: 5, nombre: 'E6', origen: { x: 42, y: 26 }, destino: { x: 64, y: 30 }, pesoKg: 0.5, limiteMin: 40 },
];

export const PENALIZACION = { porViolacion: 100, porMinutoTarde: 5, minutosPorParada: 2 };

/** 1 unidad del mapa = 100 m (el mapa mide 10 × 10 km). */
export const km = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y) / 10;

// ---------- Aleatoriedad reproducible ----------
export function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;
const int = (r: Rng, n: number) => Math.floor(r() * n);

export function cromosomaAleatorio(r: Rng): Cromosoma {
  const orden = ENVIOS.map((e) => e.id);
  for (let i = orden.length - 1; i > 0; i -= 1) {
    const j = int(r, i + 1);
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden.map((e) => ({ e, v: int(r, VEHICULOS.length) }));
}

// ---------- Decodificación y aptitud ----------
export interface Parada {
  envio: number;
  llegadaMin: number;
  minutosTarde: number;
}

export interface RutaDecodificada {
  vehiculo: number;
  paradas: Parada[];
  km: number;
  minutos: number;
  costoOperativo: number;
  puntos: Punto[];
}

export interface Violacion {
  envio: number | null;
  vehiculo: number;
  motivo: string;
}

export interface Evaluacion {
  rutas: RutaDecodificada[];
  violaciones: Violacion[];
  costoOperativo: number;
  castigoTardanza: number;
  castigoViolaciones: number;
  total: number;
}

/** Paso 1: agrupar los genes por vehículo respetando su orden. */
export function decodificar(c: Cromosoma): number[][] {
  const rutas: number[][] = VEHICULOS.map(() => []);
  c.forEach((gen) => rutas[gen.v].push(gen.e));
  return rutas;
}

/** Paso 2: simular cada ruta y sumar costo + castigos. Menor = mejor. */
export function evaluar(c: Cromosoma): Evaluacion {
  const secuencias = decodificar(c);
  const violaciones: Violacion[] = [];
  let castigoTardanza = 0;
  const rutas = secuencias.map((secuencia, v) => {
    const veh = VEHICULOS[v];
    let pos = veh.base;
    let reloj = 0;
    let recorrido = 0;
    const paradas: Parada[] = [];
    const puntos: Punto[] = [veh.base];
    for (const e of secuencia) {
      const envio = ENVIOS[e];
      const ida = km(pos, envio.origen);
      const viaje = km(envio.origen, envio.destino);
      recorrido += ida + viaje;
      reloj += (ida + viaje) / veh.kmPorMin + 2 * PENALIZACION.minutosPorParada;
      const tarde = Math.max(0, reloj - envio.limiteMin);
      castigoTardanza += tarde * PENALIZACION.porMinutoTarde;
      if (envio.pesoKg > veh.pesoMax) violaciones.push({ envio: e, vehiculo: v, motivo: `${envio.nombre} pesa ${envio.pesoKg} kg y la ${veh.nombre.toLowerCase()} carga máx. ${veh.pesoMax} kg` });
      if (viaje > veh.alcanceViajeKm) violaciones.push({ envio: e, vehiculo: v, motivo: `${envio.nombre} recorre ${viaje.toFixed(1)} km: fuera del alcance de la ${veh.nombre.toLowerCase()}` });
      paradas.push({ envio: e, llegadaMin: reloj, minutosTarde: tarde });
      puntos.push(envio.origen, envio.destino);
      pos = envio.destino;
    }
    if (secuencia.length > veh.capacidad) {
      violaciones.push({ envio: null, vehiculo: v, motivo: `La ${veh.nombre.toLowerCase()} lleva ${secuencia.length} envíos y su capacidad es ${veh.capacidad}` });
    }
    return { vehiculo: v, paradas, km: recorrido, minutos: reloj, costoOperativo: recorrido * veh.costoKm, puntos };
  });
  const costoOperativo = rutas.reduce((s, r) => s + r.costoOperativo, 0);
  const castigoViolaciones = violaciones.length * PENALIZACION.porViolacion;
  return { rutas, violaciones, costoOperativo, castigoTardanza, castigoViolaciones, total: costoOperativo + castigoTardanza + castigoViolaciones };
}

export const costo = (c: Cromosoma) => evaluar(c).total;

// ---------- Operadores ----------
export function torneo(poblacion: Cromosoma[], k: number, r: Rng) {
  const elegidos = new Set<number>();
  while (elegidos.size < Math.min(k, poblacion.length)) elegidos.add(int(r, poblacion.length));
  const indices = [...elegidos];
  const ganador = indices.reduce((mejor, i) => (costo(poblacion[i]) < costo(poblacion[mejor]) ? i : mejor), indices[0]);
  return { indices, ganador };
}

export interface PasoCruce {
  hijo: Array<(Gen & { de: 'A' | 'B' }) | null>;
  tomadoDeB: number | null;
}

/** Cruce por orden (OX) paso a paso: primero el segmento de A, luego el resto en el orden de B. */
export function cruceOxPasos(a: Cromosoma, b: Cromosoma, inicio: number, fin: number): PasoCruce[] {
  const n = a.length;
  const hijo: PasoCruce['hijo'] = new Array(n).fill(null);
  const usados = new Set<number>();
  for (let i = inicio; i <= fin; i += 1) {
    hijo[i] = { ...a[i], de: 'A' };
    usados.add(a[i].e);
  }
  const pasos: PasoCruce[] = [{ hijo: [...hijo], tomadoDeB: null }];
  let cursor = (fin + 1) % n;
  for (let k = 0; k < n; k += 1) {
    const idxB = (fin + 1 + k) % n;
    const gen = b[idxB];
    if (usados.has(gen.e)) continue;
    hijo[cursor] = { ...gen, de: 'B' };
    usados.add(gen.e);
    cursor = (cursor + 1) % n;
    pasos.push({ hijo: [...hijo], tomadoDeB: idxB });
  }
  return pasos;
}

export const cruceOx = (a: Cromosoma, b: Cromosoma, r: Rng): Cromosoma => {
  let i = int(r, a.length);
  let j = int(r, a.length);
  if (i > j) [i, j] = [j, i];
  return cruceOxPasos(a, b, i, j).at(-1)!.hijo.map((g) => ({ e: g!.e, v: g!.v }));
};

export type TipoMutacion = 'intercambio' | 'inversion' | 'reasignacion' | 'reubicacion';

export function mutar(c: Cromosoma, tipo: TipoMutacion, r: Rng): { resultado: Cromosoma; cambiados: number[]; descripcion: string } {
  const g = c.map((x) => ({ ...x }));
  const n = g.length;
  let i = int(r, n);
  let j = int(r, n);
  while (j === i) j = int(r, n);
  if (tipo === 'intercambio') {
    [g[i], g[j]] = [g[j], g[i]];
    return { resultado: g, cambiados: [i, j], descripcion: `Se intercambiaron las posiciones ${i + 1} y ${j + 1}: cambia el orden de visita.` };
  }
  if (tipo === 'inversion') {
    if (i > j) [i, j] = [j, i];
    const tramo = g.slice(i, j + 1).reverse();
    g.splice(i, tramo.length, ...tramo);
    return { resultado: g, cambiados: Array.from({ length: j - i + 1 }, (_, k) => i + k), descripcion: `Se invirtió el tramo de la posición ${i + 1} a la ${j + 1} (como un 2-opt).` };
  }
  if (tipo === 'reasignacion') {
    const antes = g[i].v;
    let nuevo = int(r, VEHICULOS.length);
    while (nuevo === antes) nuevo = int(r, VEHICULOS.length);
    g[i] = { ...g[i], v: nuevo };
    return { resultado: g, cambiados: [i], descripcion: `${ENVIOS[g[i].e].nombre} pasa de ${VEHICULOS[antes].nombre} a ${VEHICULOS[nuevo].nombre}.` };
  }
  const [gen] = g.splice(i, 1);
  g.splice(j, 0, gen);
  return { resultado: g, cambiados: [j], descripcion: `${ENVIOS[gen.e].nombre} se movió de la posición ${i + 1} a la ${j + 1}.` };
}

// ---------- Evolución completa ----------
export interface Generacion {
  numero: number;
  mejor: Cromosoma;
  mejorCosto: number;
  promedio: number;
  poblacion: Array<{ c: Cromosoma; costo: number }>;
}

export function evolucionar(semilla: number, generaciones = 40, tamano = 24): Generacion[] {
  const r = rng(semilla);
  let poblacion = Array.from({ length: tamano }, () => cromosomaAleatorio(r));
  let mejor = poblacion.reduce((m, c) => (costo(c) < costo(m) ? c : m));
  const historia: Generacion[] = [];
  const registrar = (numero: number) => {
    const ordenada = poblacion.map((c) => ({ c, costo: costo(c) })).sort((a, b) => a.costo - b.costo);
    historia.push({
      numero,
      mejor,
      mejorCosto: costo(mejor),
      promedio: ordenada.reduce((s, x) => s + x.costo, 0) / ordenada.length,
      poblacion: ordenada,
    });
  };
  registrar(0);
  for (let gen = 1; gen <= generaciones; gen += 1) {
    const ordenada = [...poblacion].sort((a, b) => costo(a) - costo(b));
    const siguiente = ordenada.slice(0, 2).map((c) => c.map((g) => ({ ...g })));
    while (siguiente.length < tamano) {
      const a = poblacion[torneo(poblacion, 3, r).ganador];
      const b = poblacion[torneo(poblacion, 3, r).ganador];
      let hijo = r() < 0.85 ? cruceOx(a, b, r) : a.map((g) => ({ ...g }));
      if (r() < 0.3) {
        const tipos: TipoMutacion[] = ['reasignacion', 'intercambio', 'inversion', 'reubicacion'];
        hijo = mutar(hijo, tipos[int(r, tipos.length)], r).resultado;
      }
      siguiente.push(hijo);
    }
    poblacion = siguiente;
    const candidato = poblacion.reduce((m, c) => (costo(c) < costo(m) ? c : m));
    if (costo(candidato) < costo(mejor)) mejor = candidato;
    registrar(gen);
  }
  return historia;
}
