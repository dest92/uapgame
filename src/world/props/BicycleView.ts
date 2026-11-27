import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry, Vector3, type Material } from 'three/webgpu';

const WHEEL_R = 0.34;
const WHEELBASE = 1.05;

/** Bicicleta procedural (cuadro, ruedas con rayos, asiento, manubrio). Solo visual. */
export class BicycleView {
  readonly root = new Group();
  private readonly tilt = new Group();
  private readonly wheels: Group[] = [];

  constructor(frameColor = '#1f5fae') {
    const frame = new MeshStandardMaterial({ color: frameColor, roughness: 0.35, metalness: 0.6 });
    const dark = new MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.8 });
    const steel = new MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 0.9 });
    const tube = (a: Vector3, b: Vector3, r: number, mat: Material): Mesh => {
      const len = a.distanceTo(b);
      const m = new Mesh(new CylinderGeometry(r, r, len, 8), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
      m.castShadow = true;
      return m;
    };
    const rear = new Vector3(0, WHEEL_R, -WHEELBASE / 2);
    const front = new Vector3(0, WHEEL_R, WHEELBASE / 2);
    const bb = new Vector3(0, 0.3, -0.05);
    const seat = new Vector3(0, 0.88, -0.22);
    const head = new Vector3(0, 0.92, 0.38);
    const bar = new Vector3(0, 1.02, 0.33);
    this.tilt.add(
      tube(rear, bb, 0.018, frame), tube(rear, seat, 0.016, frame), tube(bb, seat, 0.022, frame),
      tube(bb, head, 0.024, frame), tube(seat.clone().setY(0.82), head, 0.022, frame), tube(head, front, 0.018, steel),
      tube(head, bar, 0.02, steel), tube(new Vector3(-0.28, 1.02, 0.33), new Vector3(0.28, 1.02, 0.33), 0.016, dark),
      tube(seat, seat.clone().add(new Vector3(0, 0.06, 0)), 0.014, steel),
    );
    const saddle = new Mesh(new CylinderGeometry(0.07, 0.11, 0.05, 10), dark);
    saddle.position.copy(seat).add(new Vector3(0, 0.08, 0.02));
    saddle.scale.set(1, 1, 1.9);
    this.tilt.add(saddle);
    for (const c of [rear, front]) {
      const w = new Group();
      w.position.copy(c);
      const tire = new Mesh(new TorusGeometry(WHEEL_R, 0.028, 8, 32), dark);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      w.add(tire);
      for (let i = 0; i < 6; i++) {
        const spoke = new Mesh(new CylinderGeometry(0.004, 0.004, WHEEL_R * 2, 4), steel);
        spoke.rotation.x = (i / 6) * Math.PI;
        w.add(spoke);
      }
      this.wheels.push(w);
      this.tilt.add(w);
    }
    this.root.add(this.tilt);
  }

  sync(x: number, y: number, z: number, heading: number, lean: number, wheelAngle: number): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = heading;
    this.tilt.rotation.z = -lean;
    for (const w of this.wheels) w.rotation.x = wheelAngle;
  }
}
