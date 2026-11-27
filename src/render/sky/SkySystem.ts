import { Color, DirectionalLight, FogExp2, HemisphereLight, PMREMGenerator, Scene, Vector3, type PerspectiveCamera, type WebGPURenderer, type Texture } from 'three/webgpu';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js';
import type { GameSystem } from '../../core/loop/GameLoop';
import type { QualityProfile } from '../../domain/quality/QualityProfiles';
import { lightingForElevation, sunPosition } from '../../domain/sky/sunPosition';
import { sceneUniforms } from '../materials/nodes/sharedUniforms';

const LATITUDE = -32.07;
const DAY_OF_YEAR = 300; // fin de octubre: primavera en Entre Ríos.
const ENV_REFRESH_HOURS = 0.2;

const lerpColor = (a: string, b: string, t: number): Color => new Color(a).lerp(new Color(b), Math.max(0, Math.min(1, t)));

/**
 * Cielo físico + sol/luna + IBL + niebla (SKY-1..3). Controlado por la hora del día.
 * Las sombras usan cascadas (CSM) en calidad media/alta y una sola cámara que sigue al jugador en baja.
 */
export class SkySystem implements GameSystem {
  private readonly sky = new SkyMesh();
  private readonly envSky = new SkyMesh();
  private readonly envScene = new Scene();
  private readonly sun = new DirectionalLight('#fff4e5', 3);
  private readonly moon = new DirectionalLight('#9db4ff', 0);
  private readonly hemi = new HemisphereLight('#bcd6ff', '#5b5140', 0.35);
  private readonly fog = new FogExp2('#c9d8e4', 0.0014);
  private readonly pmrem: PMREMGenerator;
  private envTarget: { texture: Texture; dispose(): void } | null = null;
  private hour = 10.5;
  private envHour = -99;
  private csm: CSMShadowNode | null = null;
  private followTarget = new Vector3();

  constructor(
    private readonly renderer: WebGPURenderer,
    private readonly scene: Scene,
    private readonly camera: PerspectiveCamera,
  ) {
    this.pmrem = new PMREMGenerator(renderer);
    for (const s of [this.sky, this.envSky]) {
      s.scale.setScalar(4500);
      s.turbidity.value = 3.2;
      s.rayleigh.value = 1.4;
      s.mieCoefficient.value = 0.004;
      s.mieDirectionalG.value = 0.82;
      s.cloudCoverage.value = 0.32;
      s.cloudDensity.value = 0.45;
    }
    this.envScene.add(this.envSky);
    scene.add(this.sky, this.sun, this.sun.target, this.moon, this.moon.target, this.hemi);
    scene.fog = this.fog;
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
  }

  get timeOfDay(): number {
    return this.hour;
  }

  setTimeOfDay(hour: number): void {
    this.hour = ((hour % 24) + 24) % 24;
    this.apply();
  }

  /** QLT-1: tamaño de mapa, cascadas y distancia de sombras. */
  setQuality(q: QualityProfile): void {
    this.sun.castShadow = q.shadows;
    this.sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.csm?.dispose();
    if (q.cascades > 1) {
      this.csm = new CSMShadowNode(this.sun, { cascades: q.cascades, maxFar: q.shadowDistance, mode: 'practical', lightMargin: 120 });
      this.csm.fade = true;
      this.sun.shadow.shadowNode = this.csm;
    } else {
      this.csm = null;
      // Debe quedar `undefined` (no null): three usa la sombra estándar solo si el campo no está definido;
      // con null arma un shader inválido (geometría "estirada" en pantalla).
      delete (this.sun.shadow as { shadowNode?: unknown }).shadowNode;
      const cam = this.sun.shadow.camera;
      cam.left = cam.bottom = -q.shadowDistance / 2;
      cam.right = cam.top = q.shadowDistance / 2;
      cam.near = 1;
      cam.far = 600;
      cam.updateProjectionMatrix();
    }
    this.apply();
  }

  /** En calidad baja la sombra única sigue al jugador. */
  setFollowTarget(x: number, y: number, z: number): void {
    this.followTarget.set(x, y, z);
  }

  private apply(): void {
    const s = sunPosition(this.hour, LATITUDE, DAY_OF_YEAR);
    const mix = lightingForElevation(s.elevation);
    const d = new Vector3(s.direction.x, s.direction.y, s.direction.z);
    for (const sky of [this.sky, this.envSky]) sky.sunPosition.value.copy(d);

    this.sun.intensity = 2.6 * mix.sun;
    this.sun.color.copy(lerpColor('#fff3e0', '#ffae66', mix.golden));
    this.moon.intensity = 0.9 * mix.night;
    this.hemi.intensity = 0.12 + 0.3 * mix.sun + 0.45 * mix.night;
    this.hemi.color.copy(lerpColor('#3d5585', '#bcd6ff', mix.sun));
    this.hemi.groundColor.copy(lerpColor('#111418', '#5b5140', mix.sun));
    this.fog.color.copy(lerpColor('#0d1422', '#cbd9e3', mix.sun).lerp(new Color('#e3b48a'), mix.golden * 0.6));
    this.fog.density = 0.0007 + 0.0003 * mix.golden;
    this.scene.environmentIntensity = 0.06 + 0.5 * mix.sun;
    this.renderer.toneMappingExposure = 0.72 + 0.6 * mix.night;
    sceneUniforms.night.value = mix.night;

    if (Math.abs(this.hour - this.envHour) > ENV_REFRESH_HOURS) this.refreshEnvironment();
  }

  /** IBL: PMREM del cielo actual (se regenera solo si la hora cambió lo suficiente). */
  private refreshEnvironment(): void {
    this.envHour = this.hour;
    const next = this.pmrem.fromScene(this.envScene, 0.04) as unknown as { texture: Texture; dispose(): void };
    this.scene.environment = next.texture;
    this.envTarget?.dispose();
    this.envTarget = next;
  }

  update(): void {
    const s = sunPosition(this.hour, LATITUDE, DAY_OF_YEAR);
    const up = s.elevation > 0 ? s.direction : { x: -s.direction.x, y: -s.direction.y, z: -s.direction.z };
    const t = this.csm ? new Vector3() : this.followTarget;
    this.sun.target.position.copy(t);
    this.sun.position.set(t.x + up.x * 300, t.y + Math.max(0.05, up.y) * 300, t.z + up.z * 300);
    this.moon.position.set(-s.direction.x * 300, Math.max(0.3, -s.direction.y) * 300, -s.direction.z * 300);
    this.sky.position.copy(this.camera.position);
  }
}
