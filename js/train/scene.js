// The renderer, the scene and its light: a warm key light from the upper left with soft shadows that follow the camera,
// a cool sky fill, ACES tone mapping and a gentle warm fog toward the far end of the line. The sky itself is the page's
// CSS gradient behind a transparent canvas.
import { THREE } from './world.js';
import { DEFAULT_THEME } from './themes.js';

// soft: a software renderer (see isSoftware in js/screens/home.js): one pixel per CSS pixel and no shadow map.
export const PIXEL_RATIO_MAX = 1.5;

export function createRenderer(canvas, gl, soft = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, powerPreference: 'low-power' });
  // At most 1.5 device pixels per CSS pixel: a sharp picture at a third of the work of a 2.6x phone screen.
  renderer.setPixelRatio(soft ? 1 : Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !soft;
  renderer.shadowMap.type = THREE.PCFShadowMap; // cheap soft-edged shadows from a small map
  renderer.shadowMap.autoUpdate = true;
  renderer.localClippingEnabled = true; // the train is not drawn inside a start tunnel (js/screens/home3d.js)
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

// theme (js/train/themes.js): the fog and the light colours of the world being shown (the default is the original look).
export function createScene(soft = false, theme = DEFAULT_THEME) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
  const hemi = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(theme.sun, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  const sc = sun.shadow.camera;
  sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 2;
  sun.shadow.intensity = 0.72; // soft, never black
  scene.add(sun, sun.target);
  const camera = new THREE.PerspectiveCamera(35, 1, 2, 140);
  return {
    scene, camera, sun,
    // The key light and its tight shadow box follow the point the camera looks at.
    aimLight(x, z) { sun.position.set(x - 9, 18, z + 6); sun.target.position.set(x, 0, z - 3); sun.target.updateMatrixWorld(); },
  };
}
