import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, Crown, Dices, FlaskConical, Play, RotateCcw, Shuffle, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { number } from '@/lib/format';
import { ChromosomeRow, GeneBox, ToyMap, VehicleLegend } from '../explicacion/ToyVisuals';
import {
  ENVIOS,
  PENALIZACION,
  VEHICULOS,
  costo,
  cromosomaAleatorio,
  cruceOxPasos,
  decodificar,
  evaluar,
  evolucionar,
  km,
  mutar,
  rng,
  torneo,
  type Cromosoma,
  type Generacion,
  type TipoMutacion,
} from '../explicacion/toyGa';

const PASOS = ['El problema', 'El cromosoma', 'Decodificar', 'Aptitud', 'Selección', 'Cruce OX', 'Mutación', 'Evolución'];
const money = (v: number) => `$${number(v, 0)}`;
const azar = () => rng(Math.floor(Math.random() * 1e9));

function Seccion({ numero, titulo, idea, children }: { numero: number; titulo: string; idea: ReactNode; children: ReactNode }) {
  return (
    <Card className="animate-fade-up">
      <CardBody className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Paso {numero} de {PASOS.length}</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-100">{titulo}</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-300">{idea}</p>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

/**
 * Explicación interactiva del algoritmo genético con un ejemplo pequeño
 * (6 envíos, 3 vehículos), pensada para presentarla paso a paso.
 */
export function ExplicacionCromosomaPage() {
  const [paso, setPaso] = useState(0);
  const [cromosoma, setCromosoma] = useState<Cromosoma>(() => cromosomaAleatorio(rng(7)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
      if (event.key === 'ArrowRight') setPaso((p) => Math.min(PASOS.length - 1, p + 1));
      if (event.key === 'ArrowLeft') setPaso((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        eyebrow="Laboratorio · explicación"
        title="¿Cómo funciona un cromosoma?"
        subtitle="Un ejemplo pequeño (6 envíos, 3 vehículos) con la misma lógica del algoritmo real. Avanza con los botones o con las flechas ← → del teclado."
        actions={
          <Link to="/panel/simulacion">
            <Button variant="secondary">
              <FlaskConical className="h-4 w-4" /> Ir al laboratorio real
            </Button>
          </Link>
        }
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {PASOS.map((nombre, i) => (
          <button
            key={nombre}
            onClick={() => setPaso(i)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              i === paso ? 'border-brand-500 bg-brand-500 text-white' : i < paso ? 'border-brand-500/25 bg-brand-500/10 text-brand-300' : 'border-ink-600/70 bg-ink-800 text-slate-400',
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{i + 1}</span>
            {nombre}
          </button>
        ))}
      </div>

      {paso === 0 && <PasoProblema />}
      {paso === 1 && <PasoCromosoma cromosoma={cromosoma} onNuevo={() => setCromosoma(cromosomaAleatorio(azar()))} />}
      {paso === 2 && <PasoDecodificar cromosoma={cromosoma} />}
      {paso === 3 && <PasoAptitud cromosoma={cromosoma} />}
      {paso === 4 && <PasoSeleccion />}
      {paso === 5 && <PasoCruce />}
      {paso === 6 && <PasoMutacion cromosoma={cromosoma} onAplicar={setCromosoma} />}
      {paso === 7 && <PasoEvolucion />}

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>
          <ArrowLeft className="h-4 w-4" /> {paso > 0 ? PASOS[paso - 1] : 'Anterior'}
        </Button>
        <Button disabled={paso === PASOS.length - 1} onClick={() => setPaso(paso + 1)}>
          {paso < PASOS.length - 1 ? PASOS[paso + 1] : 'Fin'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PasoProblema() {
  return (
    <Seccion
      numero={1}
      titulo="El problema: ¿quién lleva cada envío y en qué orden?"
      idea="Hay 6 envíos y 3 vehículos. Cada vehículo tiene reglas distintas (peso, capacidad, alcance). Hay que decidir a la vez la asignación y el orden de la ruta: con 6 envíos ya son más de 500,000 combinaciones; con 30 envíos, más que átomos en la Tierra. Por eso se usa un algoritmo genético."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <ToyMap />
          <p className="text-xs text-slate-400">Cuadros = base de cada vehículo · círculo blanco = recoger · círculo naranja = entregar · la flecha punteada une recogida y entrega.</p>
        </div>
        <div className="min-w-0 space-y-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="py-1.5">Envío</th>
                <th>Peso</th>
                <th>Viaje</th>
                <th>Debe llegar antes de</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {ENVIOS.map((e) => (
                <tr key={e.id} className="text-slate-200">
                  <td className="py-1.5 font-bold">{e.nombre}</td>
                  <td>{e.pesoKg} kg</td>
                  <td>{km(e.origen, e.destino).toFixed(1)} km</td>
                  <td>{e.limiteMin} min</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="py-1.5">Vehículo</th>
                <th>Peso máx.</th>
                <th>Capacidad</th>
                <th>$/km</th>
                <th>Regla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {VEHICULOS.map((v) => (
                <tr key={v.id} className="text-slate-200">
                  <td className="py-1.5 font-bold" style={{ color: v.color }}>
                    V{v.id + 1} {v.nombre}
                  </td>
                  <td>{v.pesoMax} kg</td>
                  <td>{v.capacidad} envíos</td>
                  <td>${v.costoKm}</td>
                  <td className="text-xs">{v.medio === 'bicicleta' ? `viajes ≤ ${v.alcanceViajeKm} km` : v.medio === 'camioneta' ? 'cara pero carga todo' : 'rápida y barata'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Seccion>
  );
}

function PasoCromosoma({ cromosoma, onNuevo }: { cromosoma: Cromosoma; onNuevo: () => void }) {
  return (
    <Seccion
      numero={2}
      titulo="Un cromosoma = un plan completo de entregas"
      idea="El cromosoma es una lista de genes. Cada gen es un par (envío, vehículo): dice quién lleva ese envío. La posición en la lista es el orden de visita. Cada envío aparece exactamente una vez, por eso el cromosoma es una permutación."
    >
      <div className="rounded-2xl bg-ink-900 p-4">
        <ChromosomeRow cromosoma={cromosoma} />
      </div>
      <VehicleLegend />
      <div className="grid gap-4 md:grid-cols-2">
        <Notice tone="info">
          Se lee de izquierda a derecha. Ejemplo: el gen #1 es <strong>{ENVIOS[cromosoma[0].e].nombre}</strong> en la <strong>{VEHICULOS[cromosoma[0].v].nombre}</strong>: es lo primero que hace ese vehículo.
        </Notice>
        <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
          {`// Así se ve en el código (geneticAlgorithm/gaTypes.ts)\n[${cromosoma.map((g) => `{ e: ${g.e}, v: ${g.v} }`).join(', ')}]`}
        </pre>
      </div>
      <Button variant="secondary" onClick={onNuevo}>
        <Dices className="h-4 w-4" /> Otro cromosoma al azar
      </Button>
    </Seccion>
  );
}

function PasoDecodificar({ cromosoma }: { cromosoma: Cromosoma }) {
  const rutas = decodificar(cromosoma);
  const evaluacion = useMemo(() => evaluar(cromosoma), [cromosoma]);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Seccion
      numero={3}
      titulo="Decodificar: del cromosoma a las rutas"
      idea="Se recorren los genes en orden y se agrupan por vehículo. Cada vehículo sale de su base, va a recoger su primer envío, lo entrega, va por el siguiente… Así una lista plana se convierte en un plan de rutas."
    >
      <div className="rounded-2xl bg-ink-900 p-4">
        <ChromosomeRow cromosoma={cromosoma} size="sm" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-3">
          {VEHICULOS.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-2xl border p-3" style={{ borderColor: `${v.color}55`, backgroundColor: `${v.color}0D` }}>
              <span className="w-28 shrink-0 text-sm font-bold" style={{ color: v.color }}>
                V{v.id + 1} {v.nombre}
              </span>
              <span className="text-xs font-semibold text-slate-400">Base</span>
              {rutas[v.id].length === 0 && <span className="text-xs text-slate-400">— sin envíos —</span>}
              {rutas[v.id].map((e) => (
                <span key={e} className="flex items-center gap-2" onMouseEnter={() => setHover(e)} onMouseLeave={() => setHover(null)}>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <GeneBox gen={{ e, v: v.id }} size="sm" resaltado={hover === e} />
                </span>
              ))}
            </div>
          ))}
          <p className="text-xs text-slate-400">Pasa el cursor sobre un envío para verlo en el mapa.</p>
        </div>
        <ToyMap evaluacion={evaluacion} resaltarEnvio={hover} />
      </div>
    </Seccion>
  );
}

function PasoAptitud({ cromosoma }: { cromosoma: Cromosoma }) {
  const ev = useMemo(() => evaluar(cromosoma), [cromosoma]);
  const tardias = ev.rutas.flatMap((r) => r.paradas.filter((p) => p.minutosTarde > 0).map((p) => ({ ...p, vehiculo: r.vehiculo })));
  return (
    <Seccion
      numero={4}
      titulo="Aptitud: ¿qué tan bueno es este plan?"
      idea="Se simula cada ruta y se calcula un costo. Menor costo = mejor cromosoma. Las reglas rotas no se prohíben: se castigan con un costo enorme para que la evolución las elimine sola."
    >
      <pre className="overflow-x-auto rounded-xl bg-ink-900 p-3 font-mono text-xs text-slate-200">
        {`costo = Σ km × $/km del vehículo  +  ${PENALIZACION.porMinutoTarde} × minutos tarde  +  ${PENALIZACION.porViolacion} × reglas rotas`}
      </pre>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="py-1.5">Vehículo</th>
                <th>Ruta</th>
                <th className="text-right">Km</th>
                <th className="text-right">Min</th>
                <th className="text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {ev.rutas.map((r) => (
                <tr key={r.vehiculo} className="text-slate-200">
                  <td className="py-2 font-bold" style={{ color: VEHICULOS[r.vehiculo].color }}>
                    {VEHICULOS[r.vehiculo].nombre}
                  </td>
                  <td className="text-xs">{r.paradas.map((p) => ENVIOS[p.envio].nombre).join(' → ') || '—'}</td>
                  <td className="text-right tabular-nums">{r.km.toFixed(1)}</td>
                  <td className="text-right tabular-nums">{Math.round(r.minutos)}</td>
                  <td className="text-right tabular-nums">{money(r.costoOperativo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-xl bg-ink-900 px-3 py-2">
            <span>Costo operativo</span>
            <strong>{money(ev.costoOperativo)}</strong>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-3 py-2">
            <div className="flex justify-between text-amber-300">
              <span>Castigo por llegar tarde</span>
              <strong>{money(ev.castigoTardanza)}</strong>
            </div>
            {tardias.map((t) => (
              <p key={t.envio} className="text-xs text-amber-300">
                {ENVIOS[t.envio].nombre} llega {Math.round(t.minutosTarde)} min tarde
              </p>
            ))}
          </div>
          <div className="rounded-xl bg-rose-500/10 px-3 py-2">
            <div className="flex justify-between text-rose-300">
              <span>Castigo por reglas rotas</span>
              <strong>{money(ev.castigoViolaciones)}</strong>
            </div>
            {ev.violaciones.map((v, i) => (
              <p key={i} className="text-xs text-rose-300">
                {v.motivo}
              </p>
            ))}
          </div>
          <div className="flex justify-between rounded-xl bg-ink-900 px-3 py-3 text-white">
            <span className="font-semibold">Aptitud (costo total)</span>
            <strong className="text-lg">{money(ev.total)}</strong>
          </div>
        </div>
      </div>
    </Seccion>
  );
}

function PasoSeleccion() {
  const [poblacion, setPoblacion] = useState<Cromosoma[]>(() => Array.from({ length: 8 }, (_, i) => cromosomaAleatorio(rng(100 + i))));
  const [resultado, setResultado] = useState<{ indices: number[]; ganador: number } | null>(null);
  return (
    <Seccion
      numero={5}
      titulo="Selección por torneo: ¿quién tiene hijos?"
      idea="Se eligen 3 individuos al azar y gana el de menor costo; ese será un padre. Los buenos tienen más oportunidades, pero los demás no desaparecen de inmediato: eso mantiene la diversidad."
    >
      <div className="grid gap-2 md:grid-cols-2">
        {poblacion.map((c, i) => {
          const elegido = resultado?.indices.includes(i);
          const ganador = resultado?.ganador === i;
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 p-2.5 transition-all duration-300',
                ganador ? 'border-amber-400 bg-amber-500/10' : elegido ? 'border-brand-400 bg-brand-500/10' : 'border-ink-700 bg-ink-800',
                resultado && !elegido && 'opacity-40',
              )}
            >
              <span className="w-6 text-center text-xs font-bold text-slate-400">{ganador ? <Crown className="h-5 w-5 text-amber-500" /> : `#${i + 1}`}</span>
              <div className="min-w-0 flex-1">
                <ChromosomeRow cromosoma={c} size="sm" numerar={false} />
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-100">{money(costo(c))}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setResultado(torneo(poblacion, 3, azar()))}>
          <Shuffle className="h-4 w-4" /> Hacer un torneo
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPoblacion(Array.from({ length: 8 }, () => cromosomaAleatorio(azar())));
            setResultado(null);
          }}
        >
          <Dices className="h-4 w-4" /> Nueva población
        </Button>
      </div>
      {resultado && (
        <Notice tone="success">
          Compitieron #{resultado.indices.map((i) => i + 1).join(', #')}. Gana el #{resultado.ganador + 1} con {money(costo(poblacion[resultado.ganador]))}: es el de menor costo de los tres.
        </Notice>
      )}
    </Seccion>
  );
}

function PasoCruce() {
  const [padres, setPadres] = useState<[Cromosoma, Cromosoma]>(() => [cromosomaAleatorio(rng(21)), cromosomaAleatorio(rng(34))]);
  const [segmento, setSegmento] = useState<[number, number]>([1, 3]);
  const [pasoCruce, setPasoCruce] = useState(0);
  const pasos = useMemo(() => cruceOxPasos(padres[0], padres[1], segmento[0], segmento[1]), [padres, segmento]);
  const actual = pasos[Math.min(pasoCruce, pasos.length - 1)];
  const completo = pasoCruce >= pasos.length - 1;
  const hijo = completo ? actual.hijo.map((g) => ({ e: g!.e, v: g!.v })) : null;

  const nuevoSegmento = () => {
    const r = azar();
    let i = Math.floor(r() * 6);
    let j = Math.floor(r() * 6);
    if (i > j) [i, j] = [j, i];
    setSegmento([i, j]);
    setPasoCruce(0);
  };

  return (
    <Seccion
      numero={6}
      titulo="Cruce por orden (OX): mezclar dos padres sin perder envíos"
      idea="El hijo copia un segmento del padre A tal cual (con sus vehículos). Después se recorre el padre B y se colocan, en su orden y con su vehículo, los envíos que faltan. Así ningún envío se repite ni se pierde; un cruce simple de un punto sí podría duplicarlos."
    >
      <div className="space-y-4 overflow-x-auto">
        <div>
          <p className="mb-1 text-xs font-bold text-slate-400">PADRE A · {money(costo(padres[0]))} · el segmento resaltado pasa tal cual</p>
          <div className="flex flex-wrap gap-2">
            {padres[0].map((g, i) => (
              <GeneBox key={i} gen={g} posicion={i} resaltado={i >= segmento[0] && i <= segmento[1]} apagado={!(i >= segmento[0] && i <= segmento[1])} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-slate-400">PADRE B · {money(costo(padres[1]))} · aporta el resto en su orden</p>
          <div className="flex flex-wrap gap-2">
            {padres[1].map((g, i) => (
              <GeneBox key={i} gen={g} posicion={i} resaltado={actual.tomadoDeB === i} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-brand-500/25 bg-brand-500/10 p-3">
          <p className="mb-1 text-xs font-bold text-brand-300">
            HIJO {hijo ? `· ${money(costo(hijo))}` : `· paso ${pasoCruce + 1} de ${pasos.length}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {actual.hijo.map((g, i) => (
              <GeneBox key={i} gen={g} posicion={i} vacio={!g} origen={g?.de} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPasoCruce((p) => p + 1)} disabled={completo}>
          <StepForward className="h-4 w-4" /> Siguiente paso
        </Button>
        <Button variant="secondary" onClick={() => setPasoCruce(pasos.length - 1)} disabled={completo}>
          Completar
        </Button>
        <Button variant="secondary" onClick={nuevoSegmento}>
          <Shuffle className="h-4 w-4" /> Otro segmento
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPadres([cromosomaAleatorio(azar()), cromosomaAleatorio(azar())]);
            setPasoCruce(0);
          }}
        >
          <Dices className="h-4 w-4" /> Otros padres
        </Button>
      </div>
      {hijo && (
        <Notice tone="info">
          El hijo tiene los 6 envíos una sola vez. Cuesta {money(costo(hijo))}
          {costo(hijo) < Math.min(costo(padres[0]), costo(padres[1])) ? ': ¡mejor que sus dos padres!' : '; no siempre mejora, por eso hay selección.'}
        </Notice>
      )}
    </Seccion>
  );
}

const MUTACIONES: Array<{ tipo: TipoMutacion; nombre: string; idea: string }> = [
  { tipo: 'reasignacion', nombre: 'Reasignación', idea: 'cambia el vehículo de un envío' },
  { tipo: 'intercambio', nombre: 'Intercambio', idea: 'intercambia dos posiciones' },
  { tipo: 'inversion', nombre: 'Inversión', idea: 'invierte un tramo' },
  { tipo: 'reubicacion', nombre: 'Reubicación', idea: 'mueve un envío a otra posición' },
];

function PasoMutacion({ cromosoma, onAplicar }: { cromosoma: Cromosoma; onAplicar: (c: Cromosoma) => void }) {
  const [res, setRes] = useState<{ antes: Cromosoma; despues: Cromosoma; cambiados: number[]; descripcion: string } | null>(null);
  return (
    <Seccion
      numero={7}
      titulo="Mutación: pequeños cambios al azar"
      idea="Después del cruce, algunos hijos (25–30 %) sufren una mutación. Evita que todos los individuos terminen iguales y permite explorar soluciones que el cruce solo nunca encontraría."
    >
      <div className="flex flex-wrap gap-2">
        {MUTACIONES.map((m) => (
          <Button
            key={m.tipo}
            variant="secondary"
            onClick={() => {
              const base = res?.despues ?? cromosoma;
              const { resultado, cambiados, descripcion } = mutar(base, m.tipo, azar());
              setRes({ antes: base, despues: resultado, cambiados, descripcion });
            }}
          >
            {m.nombre} <span className="hidden text-xs font-normal text-slate-400 sm:inline">· {m.idea}</span>
          </Button>
        ))}
      </div>
      {res ? (
        <div className="space-y-4 overflow-x-auto">
          <div>
            <p className="mb-1 text-xs font-bold text-slate-400">ANTES · {money(costo(res.antes))}</p>
            <ChromosomeRow cromosoma={res.antes} resaltados={res.cambiados} />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-slate-400">DESPUÉS · {money(costo(res.despues))}</p>
            <ChromosomeRow cromosoma={res.despues} resaltados={res.cambiados} />
          </div>
          <Notice tone={costo(res.despues) < costo(res.antes) ? 'success' : 'warning'}>
            {res.descripcion} {costo(res.despues) < costo(res.antes) ? 'Esta vez mejoró.' : 'Esta vez empeoró: la selección se encargará de descartarlo.'}
          </Notice>
          <Button variant="ghost" onClick={() => onAplicar(res.despues)}>
            Usar este cromosoma en los pasos 2–4
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-ink-900 p-4">
          <ChromosomeRow cromosoma={cromosoma} />
          <p className="mt-2 text-xs text-slate-400">Elige una mutación para ver qué genes cambian.</p>
        </div>
      )}
    </Seccion>
  );
}

function PasoEvolucion() {
  const [semilla, setSemilla] = useState(7);
  const [historia, setHistoria] = useState<Generacion[]>([]);
  const [indice, setIndice] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const correr = (s: number) => {
    window.clearInterval(timer.current);
    const h = evolucionar(s);
    setHistoria(h);
    setIndice(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setIndice(i);
      if (i >= h.length - 1) window.clearInterval(timer.current);
    }, 160);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);

  const actual = historia[indice];
  const ev = actual ? evaluar(actual.mejor) : null;
  const datos = historia.slice(0, indice + 1).map((g) => ({ gen: g.numero, mejor: Math.round(g.mejorCosto), promedio: Math.round(g.promedio) }));

  return (
    <Seccion
      numero={8}
      titulo="Evolución: repetir selección, cruce y mutación"
      idea="Se crea una población de 24 cromosomas al azar y se repite: los 2 mejores pasan intactos (elitismo), el resto nace de torneos, cruces y mutaciones. Generación tras generación el costo baja y los individuos se parecen cada vez más (la población converge)."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => correr(semilla)}>
          <Play className="h-4 w-4" /> {historia.length ? 'Repetir' : 'Evolucionar 40 generaciones'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const s = Math.floor(Math.random() * 99999);
            setSemilla(s);
            correr(s);
          }}
        >
          <RotateCcw className="h-4 w-4" /> Otra población inicial
        </Button>
        {actual && (
          <span className="rounded-full bg-ink-700/60 px-3 py-1 text-xs font-bold text-slate-300">
            Generación {actual.numero} / 40 · mejor {money(actual.mejorCosto)}
          </span>
        )}
      </div>
      {actual && ev ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#243652" vertical={false} />
                  <XAxis dataKey="gen" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={48} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} labelFormatter={(g) => `Generación ${g}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="stepAfter" dataKey="mejor" name="Mejor costo" stroke="#FF5A1F" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="promedio" name="Promedio de la población" stroke="#94A3B8" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-slate-400">MEJOR CROMOSOMA HASTA AHORA</p>
              <ChromosomeRow cromosoma={actual.mejor} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-slate-400">LOS 5 MEJORES DE ESTA GENERACIÓN (mira cómo se van pareciendo)</p>
              <div className="space-y-1.5">
                {actual.poblacion.slice(0, 5).map((ind, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <ChromosomeRow cromosoma={ind.c} size="sm" numerar={false} />
                    <span className="text-xs font-bold tabular-nums text-slate-300">{money(ind.costo)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <ToyMap evaluacion={ev} />
            <p className="text-xs text-slate-400">
              Rutas del mejor plan · {ev.violaciones.length} reglas rotas · costo {money(ev.total)}
            </p>
          </div>
        </div>
      ) : (
        <Notice tone="info">Presiona «Evolucionar» para ver cómo la población mejora generación por generación.</Notice>
      )}
    </Seccion>
  );
}
