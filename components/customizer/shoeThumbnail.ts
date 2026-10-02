import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { applyPartColours, SHOE_LIGHTS } from "./shoeModel";
import { cachedShoeThumbnail, rememberShoeThumbnail } from "./thumbnailCache";

/** Thumbnail size in px: twice the Bag's 150 × 133 image box, for sharp high-DPI screens. */
const WIDTH = 300;
const HEIGHT = 266;

/** Thumbnails being made, so places showing the same design share one render. */
const pending = new Map<string, Promise<string>>();
/** Renders run one at a time, each in its own task, so the page stays responsive. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * One renderer for every thumbnail, made on first use and kept: the page never
 * holds more than this one WebGL context for thumbnails, however many rows
 * show one. Made again only if the browser has taken its context away.
 */
let renderer: WebGLRenderer | null = null;

function getRenderer() {
  if (renderer?.getContext().isContextLost()) {
    renderer.dispose();
    renderer = null;
  }
  if (!renderer) {
    // Off screen (never added to the page), transparent like the product cut-outs.
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(WIDTH, HEIGHT, false);
    // As the customiser's canvas (react-three-fiber's default), so colours match.
    renderer.toneMapping = ACESFilmicToneMapping;
  }
  return renderer;
}

/**
 * The lights, made once and added to the shoe for each render. The renderer
 * keeps state for every light it has seen and never lets it go, so new lights
 * per render would pile up.
 */
let lights: Object3D[] | null = null;

function getLights(): Object3D[] {
  if (!lights) {
    const { ambient, hemisphere, directional } = SHOE_LIGHTS;
    lights = [
      new AmbientLight(0xffffff, ambient),
      new HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity),
      ...directional.map(({ position, intensity }) => {
        const light = new DirectionalLight(0xffffff, intensity);
        light.position.fromArray(position);
        return light;
      }),
    ];
  }
  return lights;
}

/**
 * A side view of the outer side, toe to the left, as the product cut-outs:
 * the shoe runs along z with its outer side towards +x. Slightly from above,
 * and fitted to the image with a small margin.
 */
function frame(shoe: Object3D) {
  const box = new Box3().setFromObject(shoe);
  const centre = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const camera = new PerspectiveCamera(30, WIDTH / HEIGHT, 0.001, 100);
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360);
  const distance = 1.08 * Math.max(size.z / 2 / (halfHeight * camera.aspect), size.y / 2 / halfHeight) + size.x / 2;
  camera.position.copy(centre).addScaledVector(new Vector3(1, 0.18, 0).normalize(), distance);
  camera.lookAt(centre);
  return camera;
}

/**
 * Draws `shoe` in `hexByPart` and returns it as a PNG data URL. The scene may
 * be the one the customiser shows (react-three-fiber caches loaded models), so
 * everything changed here is put back before returning: its materials, and the
 * lights added for the render.
 */
function draw(shoe: Object3D, hexByPart: Readonly<Record<string, string>>) {
  const gl = getRenderer();
  const materials: [Mesh, Material | Material[]][] = [];
  shoe.traverse((object) => {
    if (object instanceof Mesh) materials.push([object, object.material]);
  });
  shoe.updateMatrixWorld(true);
  const camera = frame(shoe);
  const lights = getLights();
  shoe.add(...lights);
  try {
    applyPartColours(shoe, hexByPart);
    gl.render(shoe, camera);
    // Read straight after drawing, before the browser clears the canvas.
    const url = gl.domElement.toDataURL("image/png");
    // A context lost while drawing or reading gives a blank image: a failed
    // render, not one to keep. The next render makes a new renderer.
    if (gl.getContext().isContextLost()) throw new Error("The WebGL context was lost while drawing the thumbnail.");
    return url;
  } finally {
    shoe.remove(...lights);
    for (const [mesh, material] of materials) mesh.material = material;
  }
}

/**
 * The thumbnail for `key` (see thumbnailKey): from memory, or drawn from the
 * loaded `shoe` in `hexByPart`. Rejects if it can't be drawn (no WebGL, a lost
 * context, or the image can't be read); nothing is kept for a failed render, so
 * a later call tries again, and the renders queued after it still run.
 */
export function shoeThumbnail(key: string, shoe: Object3D, hexByPart: Readonly<Record<string, string>>) {
  const cached = cachedShoeThumbnail(key);
  if (cached) return Promise.resolve(cached);
  let job = pending.get(key);
  if (!job) {
    job = queue
      .catch(() => {})
      // Yield first, so a batch of rows doesn't block the page in one go.
      .then(() => new Promise((resolve) => setTimeout(resolve)))
      .then(() => {
        const url = draw(shoe, hexByPart);
        rememberShoeThumbnail(key, url);
        return url;
      })
      .finally(() => pending.delete(key));
    pending.set(key, job);
    queue = job;
  }
  return job;
}
