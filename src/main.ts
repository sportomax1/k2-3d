import "./styles.css";
import "@babylonjs/loaders/glTF";
import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Material,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Quaternion,
  Scalar,
  Scene,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Game canvas not found");

const statusElement = document.querySelector<HTMLElement>("#status");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const helpPanel = document.querySelector<HTMLElement>("#help-panel");
const helpToggle = document.querySelector<HTMLButtonElement>("#help-toggle");
const waveButton = document.querySelector<HTMLButtonElement>("#wave-button");
const jumpButton = document.querySelector<HTMLButtonElement>("#jump-button");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
const joystickZone = document.querySelector<HTMLElement>("#joystick-zone");
const joystickKnob = document.querySelector<HTMLElement>("#joystick-knob");
const zoneChip = document.querySelector<HTMLElement>("#zone-chip");
const characterButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-character]")];

const engine = new Engine(canvas, true, { antialias: true, stencil: true, powerPreference: "high-performance" });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.52, 0.76, 0.94, 1);

const camera = new ArcRotateCamera("camera", -Math.PI / 2, 1.08, 8.2, new Vector3(0, 1.2, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 3.2;
camera.upperRadiusLimit = 18;
camera.lowerBetaLimit = 0.5;
camera.upperBetaLimit = 1.45;
camera.wheelDeltaPercentage = 0.01;
camera.panningSensibility = 0;
camera.angularSensibilityX = 2400;
camera.angularSensibilityY = 2400;
camera.inertia = 0.82;

const ambient = new HemisphericLight("ambient", new Vector3(0.2, 1, 0.1), scene);
ambient.intensity = 0.88;
ambient.groundColor = new Color3(0.22, 0.29, 0.34);
const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.35), scene);
sun.position = new Vector3(35, 50, -28);
sun.intensity = 2.15;
const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.darkness = 0.25;

function material(name: string, color: Color3, emissive?: Color3): StandardMaterial {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(0.03, 0.03, 0.03);
  if (emissive) value.emissiveColor = emissive;
  return value;
}

const grass = material("grass", new Color3(0.16, 0.45, 0.24));
const sand = material("sand", new Color3(0.66, 0.56, 0.38));
const stone = material("stone", new Color3(0.35, 0.39, 0.42));
const wood = material("wood", new Color3(0.31, 0.18, 0.09));
const water = material("water", new Color3(0.05, 0.34, 0.63), new Color3(0.02, 0.12, 0.22));
water.alpha = 0.88;

const ground = MeshBuilder.CreateGround("world", { width: 220, height: 220, subdivisions: 4 }, scene);
ground.material = grass;
ground.receiveShadows = true;

function addTree(x: number, z: number, scale = 1): void {
  const trunk = MeshBuilder.CreateCylinder("trunk", { height: 3 * scale, diameterTop: 0.35 * scale, diameterBottom: 0.65 * scale, tessellation: 8 }, scene);
  trunk.position.set(x, 1.5 * scale, z);
  trunk.material = wood;
  const crown = MeshBuilder.CreateIcoSphere("crown", { radius: 1.6 * scale, subdivisions: 2 }, scene);
  crown.position.set(x, 3.7 * scale, z);
  crown.scaling.y = 1.25;
  crown.material = material(`leaf-${x}-${z}`, new Color3(0.08 + (Math.abs(x) % 5) * 0.018, 0.32 + (Math.abs(z) % 4) * 0.025, 0.15));
  [trunk, crown].forEach((mesh) => shadows.addShadowCaster(mesh));
}

function addRock(x: number, z: number, scale = 1): void {
  const rock = MeshBuilder.CreateIcoSphere("rock", { radius: scale, subdivisions: 1 }, scene);
  rock.position.set(x, scale * 0.55, z);
  rock.scaling.set(1.35, 0.72, 1);
  rock.rotation.set(scale * 0.2, x * 0.07, z * 0.05);
  rock.material = stone;
  shadows.addShadowCaster(rock);
}

function addHouse(x: number, z: number, color: Color3): void {
  const body = MeshBuilder.CreateBox("house", { width: 5, depth: 4.5, height: 3.3 }, scene);
  body.position.set(x, 1.65, z);
  body.material = material(`house-${x}`, color);
  const roof = MeshBuilder.CreateCylinder("roof", { diameter: 6.2, height: 5.2, tessellation: 3 }, scene);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(x, 4.1, z);
  roof.scaling.z = 0.8;
  roof.material = material(`roof-${x}`, new Color3(0.34, 0.11, 0.08));
  [body, roof].forEach((mesh) => shadows.addShadowCaster(mesh));
}

function createWorld(): void {
  const trail = MeshBuilder.CreateGround("trail", { width: 8, height: 105 }, scene);
  trail.position.y = 0.015;
  trail.rotation.y = 0.28;
  trail.material = sand;

  for (let i = 0; i < 58; i += 1) {
    const angle = i * 2.31;
    const radius = 18 + (i % 10) * 7;
    addTree(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.75 + (i % 4) * 0.16);
  }

  for (let i = 0; i < 32; i += 1) {
    const angle = i * 1.73;
    const radius = 12 + (i % 8) * 8;
    addRock(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.35 + (i % 4) * 0.22);
  }

  const lake = MeshBuilder.CreateCylinder("lake", { diameter: 34, height: 0.12, tessellation: 64 }, scene);
  lake.position.set(-48, 0.02, 28);
  lake.material = water;

  const island = MeshBuilder.CreateCylinder("island", { diameter: 9, height: 0.45, tessellation: 48 }, scene);
  island.position.set(-48, 0.18, 28);
  island.material = sand;
  addTree(-48, 28, 1.3);

  for (let i = 0; i < 5; i += 1) {
    const step = MeshBuilder.CreateBox("bridge", { width: 3.6, height: 0.28, depth: 4.4 }, scene);
    step.position.set(-25 - i * 4.4, 0.25, 28);
    step.material = wood;
    shadows.addShadowCaster(step);
  }

  addHouse(42, -22, new Color3(0.66, 0.34, 0.2));
  addHouse(50, -16, new Color3(0.22, 0.48, 0.68));
  addHouse(39, -10, new Color3(0.63, 0.55, 0.22));
  addHouse(54, -4, new Color3(0.42, 0.6, 0.34));

  for (let i = 0; i < 7; i += 1) {
    const peak = MeshBuilder.CreateCylinder("mountain", { diameterBottom: 16 + i * 1.5, diameterTop: 0, height: 16 + i * 3, tessellation: 8 }, scene);
    peak.position.set(-62 + i * 8, (16 + i * 3) / 2 - 0.2, -58 - (i % 2) * 7);
    peak.material = stone;
    shadows.addShadowCaster(peak);
  }

  const portal = MeshBuilder.CreateTorus("portal", { diameter: 6, thickness: 0.28, tessellation: 64 }, scene);
  portal.position.set(0, 3.2, 52);
  portal.rotation.x = Math.PI / 2;
  portal.material = material("portal-material", new Color3(0.08, 0.38, 0.75), new Color3(0.05, 0.3, 0.85));
  shadows.addShadowCaster(portal);
}
createWorld();

const player = new TransformNode("player", scene);
let characterRoot: TransformNode | null = null;
let characterMeshes: AbstractMesh[] = [];
let animationGroups: AnimationGroup[] = [];
let currentAnimation: AnimationGroup | null = null;
let currentAnimationName = "";
let fallbackCharacter: Mesh | null = null;
let activeStyle = "sky";
const originalMaterials = new Map<AbstractMesh, Material>();

function setStatus(text: string): void { if (statusElement) statusElement.textContent = text; }
function findAnimation(...names: string[]): AnimationGroup | null {
  return animationGroups.find((group) => names.some((name) => group.name.toLowerCase().includes(name))) ?? null;
}
function playAnimation(name: "idle" | "walk" | "run" | "jump" | "wave"): void {
  if (currentAnimationName === name && currentAnimation?.isPlaying) return;
  const next = name === "idle" ? findAnimation("idle", "breath")
    : name === "walk" ? findAnimation("walk")
    : name === "run" ? findAnimation("run", "jog") ?? findAnimation("walk")
    : name === "jump" ? findAnimation("jump")
    : findAnimation("wave", "samba", "dance");
  if (!next) return;
  currentAnimation?.stop();
  next.start(name !== "jump" && name !== "wave", 1, next.from, next.to, false);
  currentAnimation = next;
  currentAnimationName = name;
}

function styleColors(style: string): [Color3, Color3] {
  if (style === "ember") return [new Color3(0.95, 0.24, 0.12), new Color3(1, 0.66, 0.16)];
  if (style === "forest") return [new Color3(0.08, 0.48, 0.27), new Color3(0.52, 0.82, 0.24)];
  return [new Color3(0.08, 0.48, 0.95), new Color3(0.42, 0.82, 1)];
}

function applyCharacterStyle(style: string): void {
  activeStyle = style;
  const [primary, accent] = styleColors(style);
  characterMeshes.forEach((mesh, index) => {
    if (!mesh.material) return;
    if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material);
    const clone = originalMaterials.get(mesh)?.clone(`${style}-${mesh.name}`);
    if (!clone) return;
    if (clone instanceof PBRMaterial) clone.albedoColor = index % 3 === 0 ? accent : primary;
    if (clone instanceof StandardMaterial) clone.diffuseColor = index % 3 === 0 ? accent : primary;
    mesh.material = clone;
  });
  if (fallbackCharacter?.material instanceof StandardMaterial) fallbackCharacter.material.diffuseColor = primary;
  characterButtons.forEach((button) => {
    const active = button.dataset.character === style;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setStatus(`${style[0].toUpperCase()}${style.slice(1)} selected`);
}

function createFallbackCharacter(): void {
  const [primary, accent] = styleColors(activeStyle);
  const body = MeshBuilder.CreateCapsule("fallback", { height: 1.55, radius: 0.38 }, scene);
  body.parent = player;
  body.position.y = 0.85;
  body.material = material("fallback-body", primary);
  fallbackCharacter = body;
  const head = MeshBuilder.CreateSphere("head", { diameter: 0.58, segments: 24 }, scene);
  head.parent = player;
  head.position.set(0, 1.62, 0.03);
  head.material = material("fallback-head", accent);
  [body, head].forEach((mesh) => shadows.addShadowCaster(mesh));
}

async function loadCharacter(): Promise<void> {
  try {
    const result = await SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "HVGirl.glb", scene);
    characterRoot = new TransformNode("character-root", scene);
    characterRoot.parent = player;
    characterRoot.scaling.setAll(0.1);
    characterRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);
    characterMeshes = result.meshes;
    characterMeshes.forEach((mesh) => {
      if (!mesh.parent) mesh.parent = characterRoot;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
    });
    animationGroups = result.animationGroups;
    animationGroups.forEach((group) => group.stop());
    applyCharacterStyle(activeStyle);
    playAnimation("idle");
  } catch (error) {
    console.error(error);
    createFallbackCharacter();
  }
}

const pressed = new Set<string>();
const touchInput = { x: 0, y: 0 };
let verticalVelocity = 0;
let grounded = true;
let actionLockedUntil = 0;
let lastTime = performance.now();

function requestJump(): void {
  if (!grounded) return;
  verticalVelocity = 6.8;
  grounded = false;
  actionLockedUntil = performance.now() + 620;
  playAnimation("jump");
}
function requestWave(): void {
  if (!grounded) return;
  actionLockedUntil = performance.now() + 1600;
  playAnimation("wave");
}
function resetPlayer(): void {
  player.position.set(0, 0, 0);
  player.rotationQuaternion = Quaternion.Identity();
  verticalVelocity = 0;
  grounded = true;
  camera.alpha = -Math.PI / 2;
  camera.beta = 1.08;
  camera.radius = 8.2;
  playAnimation("idle");
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
    pressed.add(key);
    event.preventDefault();
  }
  if (event.code === "Space") { requestJump(); event.preventDefault(); }
  if (key === "e") requestWave();
});
window.addEventListener("keyup", (event) => pressed.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => pressed.clear());

function setupJoystick(): void {
  if (!joystickZone || !joystickKnob) return;
  let activePointer: number | null = null;
  const update = (event: PointerEvent): void => {
    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.32;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > maxDistance) { dx = dx / distance * maxDistance; dy = dy / distance * maxDistance; }
    touchInput.x = dx / maxDistance;
    touchInput.y = -dy / maxDistance;
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  joystickZone.addEventListener("pointerdown", (event) => { activePointer = event.pointerId; joystickZone.setPointerCapture(event.pointerId); update(event); });
  joystickZone.addEventListener("pointermove", (event) => { if (event.pointerId === activePointer) update(event); });
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    touchInput.x = 0;
    touchInput.y = 0;
    joystickKnob.style.transform = "translate(-50%, -50%)";
  };
  joystickZone.addEventListener("pointerup", release);
  joystickZone.addEventListener("pointercancel", release);
}
setupJoystick();

helpToggle?.addEventListener("click", () => {
  helpPanel?.classList.toggle("collapsed");
  helpToggle.setAttribute("aria-expanded", String(!helpPanel?.classList.contains("collapsed")));
});
waveButton?.addEventListener("click", requestWave);
jumpButton?.addEventListener("click", requestJump);
resetButton?.addEventListener("click", resetPlayer);
characterButtons.forEach((button) => button.addEventListener("click", () => applyCharacterStyle(button.dataset.character ?? "sky")));

function movementInput(): Vector3 {
  let x = touchInput.x;
  let z = touchInput.y;
  if (pressed.has("a") || pressed.has("arrowleft")) x -= 1;
  if (pressed.has("d") || pressed.has("arrowright")) x += 1;
  if (pressed.has("w") || pressed.has("arrowup")) z += 1;
  if (pressed.has("s") || pressed.has("arrowdown")) z -= 1;
  const length = Math.hypot(x, z);
  if (length > 1) { x /= length; z /= length; }
  return new Vector3(x, 0, z);
}

function updateZone(): void {
  const { x, z } = player.position;
  const zone = x < -28 && z > 8 ? "Crystal Lake"
    : x > 27 && z < 2 ? "Trailside Village"
    : z < -38 ? "Stonepeak Mountains"
    : z > 35 ? "Portal Grove"
    : Math.abs(x) > 48 || Math.abs(z) > 48 ? "Deep Wilds"
    : "Sunrise Meadow";
  if (zoneChip && zoneChip.textContent !== zone) zoneChip.textContent = zone;
}

function updatePlayer(deltaSeconds: number): void {
  const input = movementInput();
  const moving = input.lengthSquared() > 0.01;
  const running = pressed.has("shift") || Math.abs(touchInput.x) + Math.abs(touchInput.y) > 1.35;

  if (moving) {
    const cameraForward = camera.getForwardRay().direction.clone();
    cameraForward.y = 0;
    cameraForward.normalize();
    const cameraRight = Vector3.Cross(Vector3.Up(), cameraForward).normalize();
    const direction = cameraRight.scale(input.x).add(cameraForward.scale(input.z)).normalize();
    const speed = running ? 6.2 : 3.25;
    player.position.addInPlace(direction.scale(speed * deltaSeconds));
    const targetYaw = Math.atan2(direction.x, direction.z);
    const currentYaw = player.rotationQuaternion?.toEulerAngles().y ?? 0;
    player.rotationQuaternion = Quaternion.FromEulerAngles(0, Scalar.LerpAngle(currentYaw, targetYaw, 1 - Math.exp(-12 * deltaSeconds)), 0);
    if (performance.now() > actionLockedUntil && grounded) playAnimation(running ? "run" : "walk");
  } else if (performance.now() > actionLockedUntil && grounded) playAnimation("idle");

  verticalVelocity -= 17.5 * deltaSeconds;
  player.position.y += verticalVelocity * deltaSeconds;
  if (player.position.y <= 0) {
    player.position.y = 0;
    verticalVelocity = 0;
    if (!grounded) {
      grounded = true;
      actionLockedUntil = 0;
      playAnimation(moving ? (running ? "run" : "walk") : "idle");
    }
  }

  if (fallbackCharacter) fallbackCharacter.position.y = 0.85 + (moving && grounded ? Math.sin(performance.now() * (running ? 0.014 : 0.009)) * 0.055 : 0);
  player.position.x = Scalar.Clamp(player.position.x, -102, 102);
  player.position.z = Scalar.Clamp(player.position.z, -102, 102);
  camera.target = Vector3.Lerp(camera.target, player.position.add(new Vector3(0, 1.15, 0)), 1 - Math.exp(-8 * deltaSeconds));
  updateZone();
}

async function start(): Promise<void> {
  await loadCharacter();
  setStatus("Explore five regions");
  loadingScreen?.classList.add("hidden");
  engine.runRenderLoop(() => {
    const now = performance.now();
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    updatePlayer(deltaSeconds);
    scene.render();
  });
}

void start();
window.addEventListener("resize", () => engine.resize());
