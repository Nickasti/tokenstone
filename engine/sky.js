import * as THREE from 'three';

/* Cielo analitico: scattering singolo Rayleigh + Mie.
   Non e un gradiente. Lo spessore ottico viene calcolato separatamente
   per la direzione di vista e per quella del sole, quindi al tramonto
   il blu viene rimosso dalla luce solare prima che raggiunga la scena. */

const KR = [0.62, 1.38, 3.05];   // coefficienti Rayleigh relativi (~1/lambda^4)
const KM = 0.021;
const PI = Math.PI;

const opticalDepth = y => Math.min(1 / (Math.max(y, 0) * 0.985 + 0.017), 62);
const rayPhase = c => 0.75 * (1 + c * c);
function miePhase(c) {
  const g = 0.76, gg = g * g;
  return 1.5 * ((1 - gg) * (1 + c * c)) / ((2 + gg) * Math.pow(Math.max(1e-4, 1 + gg - 2 * g * c), 1.5));
}

/* La stessa matematica lato JS, per derivare i colori delle luci
   invece di sceglierli a mano. */
export function skySample(dir, sun) {
  const odV = opticalDepth(dir[1]), odS = opticalDepth(sun[1]);
  const c = dir[0] * sun[0] + dir[1] * sun[1] + dir[2] * sun[2];
  return [0, 1, 2].map(i => {
    const att = Math.exp(-KR[i] * odS * 0.118);
    const sca = 1 - Math.exp(-KR[i] * odV * 0.118);
    const mie = (1 - Math.exp(-KM * odV)) * miePhase(c) * 1.15;
    return att * (sca * rayPhase(c) * 1.55 + mie);
  });
}
export const sunAtten = sun => KR.map(k => Math.exp(-k * opticalDepth(sun[1]) * 0.118));

/* Posizione solare reale. Declinazione, equazione del tempo,
   angolo orario: la stessa procedura di un almanacco nautico.
   solar viene dal world.json del mondo: latitudine e longitudine in gradi,
   fuso orario in ore, giorno dell'anno. */
export function solarPosition(hour, solar) {
  const lat = solar.lat * PI / 180;
  const decl = 23.44 * PI / 180 * Math.sin(2 * PI * (284 + solar.dayOfYear) / 365);
  const B = 2 * PI * (solar.dayOfYear - 81) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lst = hour + (4 * (solar.lon - 15 * solar.tz) + eot) / 60;
  const H = (lst - 12) * 15 * PI / 180;
  const alt = Math.asin(Math.sin(decl) * Math.sin(lat) + Math.cos(decl) * Math.cos(lat) * Math.cos(H));
  let az = Math.acos(Math.min(1, Math.max(-1,
    (Math.sin(decl) * Math.cos(lat) - Math.cos(decl) * Math.sin(lat) * Math.cos(H)) / Math.cos(alt))));
  if (H > 0) az = 2 * PI - az;
  return { alt, az, dir: [Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az)] };
}

const FRAG = `
uniform vec3 sunDir; uniform float gain; varying vec3 vD;
const vec3 KR = vec3(0.62, 1.38, 3.05);
const float KM = 0.021;
float od(float y){ return min(1.0 / (max(y, 0.0) * 0.985 + 0.017), 62.0); }
float rayPhase(float c){ return 0.75 * (1.0 + c * c); }
float miePhase(float c){
  float g = 0.76, gg = g * g;
  return 1.5 * ((1.0 - gg) * (1.0 + c * c)) / ((2.0 + gg) * pow(max(1e-4, 1.0 + gg - 2.0 * g * c), 1.5));
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec3 d = normalize(vD);
  float odV = od(d.y), odS = od(sunDir.y);
  float c = dot(d, sunDir);
  vec3 att = exp(-KR * odS * 0.118);
  vec3 sca = 1.0 - exp(-KR * odV * 0.118);
  float mie = (1.0 - exp(-KM * odV)) * miePhase(c);
  vec3 col = att * (sca * rayPhase(c) * 1.55 + vec3(mie) * 1.15);
  col += att * smoothstep(0.99965, 0.99992, c) * 26.0;          // disco solare
  col = mix(col, col * 0.28 + vec3(0.028, 0.026, 0.023), smoothstep(0.0, -0.09, d.y));
  gl_FragColor = vec4(pow(aces(col * gain), vec3(1.0 / 2.2)), 1.0);
}`;

export class Sky {
  constructor(scene, renderer) {
    this.renderer = renderer;
    this.scene = scene;
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { sunDir: { value: new THREE.Vector3(0, .4, -1) }, gain: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: FRAG
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1400, 40, 24), this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    try {
      this.pmrem = new THREE.PMREMGenerator(renderer);
      this.pmrem.compileCubemapShader();
      this.cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
      this.cubeCam = new THREE.CubeCamera(1, 3000, this.cubeRT);
    } catch (e) { this.pmrem = null; }
    this.envTex = null;
  }

  setSun(dir) { this.material.uniforms.sunDir.value.set(dir[0], dir[1], dir[2]); }

  follow(camera) { this.mesh.position.copy(camera.position); }

  /* Il cielo analitico renderizzato in cubemap e passato al PMREM:
     illuminazione basata su immagine, generata a runtime. */
  bakeIBL() {
    if (!this.pmrem || !this.cubeCam) return;
    try {
      const hidden = [];
      this.scene.children.forEach(o => {
        if (o !== this.mesh && o.visible && (o.isMesh || o.isGroup)) { hidden.push(o); o.visible = false; }
      });
      this.cubeCam.position.set(0, 60, 0);
      this.cubeCam.update(this.renderer, this.scene);
      hidden.forEach(o => o.visible = true);
      if (this.envTex) this.envTex.dispose();
      this.envTex = this.pmrem.fromCubemap(this.cubeRT.texture).texture;
      this.scene.environment = this.envTex;
    } catch (e) { /* IBL opzionale: se fallisce, restano le luci analitiche */ }
  }

  /* INNESTO: HDRI al posto del cielo analitico.
     Perdi lo slider dell'ora, guadagni una sorgente misurata. */
  async useHDRI(url) {
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const tex = await new RGBELoader().loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const env = this.pmrem.fromEquirectangular(tex).texture;
    this.scene.environment = env;
    this.scene.background = env;
    this.mesh.visible = false;
    tex.dispose();
  }
}
