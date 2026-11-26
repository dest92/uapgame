import type { GeoBBox } from '../../../shared/geo/types';
import { bboxToOverpass } from './bbox';

/** Consulta Overpass con todo lo que el mundo necesita (OSM-4). */
export function buildCampusQuery(bb: GeoBBox, timeoutSec = 90): string {
  const b = bboxToOverpass(bb);
  const selectors = [
    `nwr["building"]${b};`,
    `way["highway"]${b};`,
    `nwr["leisure"]${b};`,
    `nwr["landuse"]${b};`,
    `nwr["natural"]${b};`,
    `node["natural"="tree"]${b};`,
    `nwr["amenity"]${b};`,
    `nwr["office"]${b};`,
    `nwr["shop"]${b};`,
    `nwr["tourism"]${b};`,
    `nwr["man_made"]${b};`,
    `nwr["historic"]${b};`,
    `way["barrier"]${b};`,
  ];
  return `[out:json][timeout:${timeoutSec}];\n(\n  ${selectors.join('\n  ')}\n);\nout body;\n>;\nout skel qt;`;
}
