/**
 * Agrega al proveedor de mapas los lugares del catálogo que todavía no existen,
 * sin borrar nada más. Uso: npm run db:lugares
 */
import '../packages/shared/src/config/loadEnv.js';
import { PrismaClient } from '../services/mapsService/src/generated/prisma/index.js';
import { lugaresSeed, zonasSeed } from '../services/mapsService/prisma/seedData.js';
import { haversineKm } from '../services/mapsService/src/geo/geoMath.js';

const maps = new PrismaClient();

function zonaDe(lat: number, lng: number): string {
  let best = zonasSeed[0];
  let ratio = Infinity;
  for (const zona of zonasSeed.filter((z) => z.id !== 'periferia')) {
    const r = haversineKm({ lat, lng }, { lat: zona.centroLat, lng: zona.centroLng }) / zona.radioKm;
    if (r < ratio) {
      ratio = r;
      best = zona;
    }
  }
  return ratio <= 1.6 ? best.id : 'periferia';
}

const existentes = new Set((await maps.lugar.findMany({ select: { nombre: true } })).map((l) => l.nombre));
const faltantes = lugaresSeed.filter(([nombre]) => !existentes.has(nombre));
await maps.lugar.createMany({
  data: faltantes.map(([nombre, tipo, direccion, colonia, cp, lat, lng]) => ({ nombre, tipo, direccion, colonia, cp, lat, lng, zonaId: zonaDe(lat, lng) })),
});
console.log(`✓ ${faltantes.length} lugares agregados · total ${await maps.lugar.count()}`);
await maps.$disconnect();
