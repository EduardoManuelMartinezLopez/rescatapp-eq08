// Conversión de kilos rescatados a impacto estimado.
// IMPORTANTE: son ESTIMACIONES con promedios mundiales, no mediciones propias. La app las rotula así.
//
// Fuentes:
//  - CO2e: FAO (2013), "Food wastage footprint: Impacts on natural resources". El desperdicio de alimentos
//    genera ≈3.3 Gt de CO2e al año para ≈1.3 Gt de alimento comestible desperdiciado
//    (3.3 / 1.3 ≈ 2.5 kg de CO2e por kg). Promedio global, no específico de Oaxaca.
//  - Comida: WRAP (Reino Unido) recomienda 420 g como tamaño de una comida "promedio" para convertir
//    kilos de excedentes en comidas equivalentes (≈2,381 comidas por tonelada).
const KG_CO2E_POR_KG = 2.5;
const KG_POR_COMIDA = 0.42;

function impacto(kilos) {
  const k = Number(kilos) || 0;
  return {
    kilos: Math.round(k * 100) / 100,
    comidas_equivalentes: Math.round(k / KG_POR_COMIDA),
    co2e_evitado_kg: Math.round(k * KG_CO2E_POR_KG * 10) / 10,
  };
}

const FUENTES = {
  co2e: 'FAO (2013). Food wastage footprint: ≈3.3 Gt CO2e / ≈1.3 Gt de alimento ≈ 2.5 kg CO2e por kg. Promedio global (estimación).',
  comida: 'WRAP: 420 g por comida promedio (estimación).',
};

module.exports = { impacto, FUENTES, KG_CO2E_POR_KG, KG_POR_COMIDA };
