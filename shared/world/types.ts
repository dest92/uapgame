import type { BBox2, GeoPoint, Vec2 } from '../geo/types';
import type { HeightSource, RoofShape } from './buildingRules';
import type { AreaKind, RoadClass, Surface } from './featureRules';

export const WORLD_SCHEMA_VERSION = 1;

export type WallMaterial = 'brick' | 'plaster' | 'concrete' | 'glass' | 'stone' | 'metal';

export interface BuildingAppearance {
  readonly wallMaterial: WallMaterial;
  readonly wallColor: string;
  readonly roofColor: string;
  readonly trimColor: string;
  /** De dónde salió la apariencia: refs fotográficas o genérica. */
  readonly source: 'reference' | 'generic';
}

export interface BuildingData {
  /** `way/123` o `relation/456`. */
  readonly id: string;
  readonly name: string;
  readonly identified: boolean;
  readonly kind: string;
  readonly footprint: readonly Vec2[];
  readonly centroid: Vec2;
  readonly height: number;
  readonly minHeight: number;
  readonly levels: number;
  readonly heightSource: HeightSource;
  readonly roof: { readonly shape: RoofShape; readonly height: number };
  readonly appearance: BuildingAppearance;
  readonly entrance: { readonly position: Vec2; readonly normal: Vec2 };
  /** Ids de POIs con nombre ubicados dentro del footprint. */
  readonly poiIds: readonly string[];
}

export interface RoadData {
  readonly id: string;
  readonly class: RoadClass;
  readonly highway: string;
  readonly name?: string;
  readonly width: number;
  readonly surface: Surface;
  readonly points: readonly Vec2[];
}

export interface AreaData {
  readonly id: string;
  readonly kind: AreaKind;
  readonly name?: string;
  readonly sport?: string;
  readonly polygon: readonly Vec2[];
}

export type TreeSpecies = 'broadleaf' | 'conifer' | 'palm';

export interface TreeData {
  readonly id: string;
  readonly position: Vec2;
  readonly species: TreeSpecies;
}

export interface PoiData {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly position: Vec2;
  readonly tags: Readonly<Record<string, string>>;
}

export interface TerrainData {
  readonly kind: 'flat' | 'heightmap';
  /** Para `heightmap`: grilla regular en metros locales. */
  readonly grid?: {
    readonly originX: number;
    readonly originZ: number;
    readonly cellSize: number;
    readonly cols: number;
    readonly rows: number;
    readonly heights: readonly number[];
  };
  readonly source: string;
}

export interface WorldData {
  readonly version: number;
  readonly generatedAt: string;
  readonly attribution: string;
  readonly origin: GeoPoint;
  readonly bounds: BBox2;
  readonly campus: { readonly id: string; readonly name: string; readonly outline: readonly Vec2[] };
  readonly terrain: TerrainData;
  readonly buildings: readonly BuildingData[];
  readonly roads: readonly RoadData[];
  readonly areas: readonly AreaData[];
  readonly trees: readonly TreeData[];
  readonly pois: readonly PoiData[];
}
