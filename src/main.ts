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

type CharacterStyle = "power" | "runway" | "sport";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Game canvas not found");

const statusElement = document.querySelector<HTMLElement>("#status");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const helpPanel = document.querySelector<HTMLElement>("#help-panel");
const helpToggle = document.querySelector<HTMLButtonElement>("#help-toggle");
const specialButton = document.querySelector<HTMLButtonElement>("#wave-button");
const jumpButton = document.querySelector<HTMLButtonElement>("#jump-button");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");
const joystickZone = document.querySelector<HTMLElement>("#joystick-zone");
const joystickKnob = document.querySelector<HTMLElement>("#joystick-knob");
const zoneChip = document.querySelector<HTMLElement>("#zone-chip");
const characterButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-character]")];

const engine = new Engine(canvas, true, { antialias: true, stencil: true, powerPreference: "high-performance" });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.52, 0.76, 0.94, 1);

const camera = new ArcRotateCamera("camera", -Math.PI / 2, 1.05, 8.5, new Vector3(0, 1.3, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 3.4;
camera.upperRadiusLimit = 18;
camera.lowerBetaLimit = 0.5;
camera.upperBetaLimit = 1.45;
camera.wheelDeltaPercentage = 0.01;
camera.panningSensibility = 0;
camera.angularSensibilityX = 2400;
camera.angularSensibilityY = 2400;
camera.inertia = 0.82;

const ambient = new HemisphericLight("ambient", new Vector3(0.2, 1, 0.1), scene);
ambient.intensity = 0.95;
ambient.groundColor = new Color3(0.2, 0.27, 0.32);
const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.35), scene);
sun.position = new Vector3(35, 50, -28);
sun.intensity = 2.15;
const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.darkness = 0.24;

function makeMaterial(name: string, color: Color3, emissive?: Color3): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color;
  result.specularColor = new Color3(0.04, 0.04, 0.04);
  if (emissive) result.emissiveColor = emissive;
  return result;
}

const grass = makeMaterial("grass", new Color3(0.16, 0.45, 0.24));
const sand = makeMaterial("sand", new Color3(0.65, 0.56, 0.39));
const stone = makeMaterial("stone", new Color3(0.35, 0.39, 0.42));
const wood = makeMaterial("wood", new Color3(0.31, 0.18, 0.09));
const water = makeMaterial("water", new Color3(0.04, 0.31, 0.62), new Color3(0.02, 0.1, 0.2));
water.alpha = 0.88;

const ground = MeshBuilder.CreateGround("world", { width: 220, height: 220, subdivisions: 4 }, scene);
ground.material = grass;
ground.receiveShadows = true;

function cast(mesh: Mesh): void {
  shadows.addShadowCaster(mesh);
  mesh.receiveShadows = true;
}

function addTree(x: number, z: number, scale = 1): void {
  const trunk = MeshBuilder.CreateCylinder("trunk", { height: 3 * scale, diameterTop: 0.35 * scale, diameterBottom: 0.65 * scale, tessellation: 10 }, scene);
  trunk.position.set(x, 1.5 * scale, z);
  trunk.material = wood;
  cast(trunk);
  const crown = MeshBuilder.CreateIcoSphere("crown", { radius: 1.6 * scale, subdivisions: 3 }, scene);
  crown.position.set(x, 3.7 * scale, z);
  crown.scaling.y = 1.25;
  crown.material = makeMaterial(`leaf-${x}-${z}`, new Color3(0.08 + (Math.abs(x) % 5) * 0.018, 0.32 + (Math.abs(z) % 4) * 0.025, 0.15));
  cast(crown);
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

  for (let i = 0; i < 30; i += 1) {
    const angle = i * 1.73;
    const radius = 14 + (i % 8) * 8;
    const rock = MeshBuilder.CreateIcoSphere("rock", { radius: 0.38 + (i % 4) * 0.22, subdivisions: 2 }, scene);
    rock.position.set(Math.cos(angle) * radius, 0.36, Math.sin(angle) * radius);
    rock.scaling.set(1.35, 0.72, 1);
    rock.material = stone;
    cast(rock);
  }

  const lake = MeshBuilder.CreateCylinder("lake", { diameter: 34, height: 0.12, tessellation: 96 }, scene);
  lake.position.set(-48, 0.02, 28);
  lake.material = water;

  const island = MeshBuilder.CreateCylinder("island", { diameter: 9, height: 0.45, tessellation: 64 }, scene);
  island.position.set(-48, 0.18, 28);
  island.material = sand;
  addTree(-48, 28, 1.3);

  for (let i = 0; i < 5; i += 1) {
    const step = MeshBuilder.CreateBox("bridge", { width: 3.6, height: 0.28, depth: 4.4 }, scene);
    step.position.set(-25 - i * 4.4, 0.25, 28);
    step.material = wood;
    cast(step);
  }

  for (let i = 0; i < 7; i += 1) {
    const height = 16 + i * 3;
    const peak = MeshBuilder.CreateCylinder("mountain", { diameterBottom: 16 + i * 1.5, diameterTop: 0, height, tessellation: 12 }, scene);
    peak.position.set(-62 + i * 8, height / 2 - 0.2, -58 - (i % 2) * 7);
    peak.material = stone;
    cast(peak);
  }

  const portal = MeshBuilder.CreateTorus("portal", { diameter: 6, thickness: 0.28, tessellation: 96 }, scene);
  portal.position.set(0, 3.2, 52);
  portal.rotation.x = Math.PI / 2;
  portal.material = makeMaterial("portal", new Color3(0.08, 0.38, 0.75), new Color3(0.05, 0.3, 0.85));
  cast(portal);
}
createWorld();

const player = new TransformNode("player", scene);
player.rotationQuaternion = Quaternion.Identity();
let characterRoot: TransformNode | null = null;
let characterMeshes: AbstractMesh[] = [];
let animationGroups: AnimationGroup[] = [];
let currentAnimation: AnimationGroup | null = null;
let currentAnimationName = "";
let activeStyle: CharacterStyle = "power";
const originalMaterials = new Map<AbstractMesh, Material>();

function setStatus(text: string): void {
  if (statusElement) statusElement.textContent = text;
}

function findAnimation(...needles: string[]): AnimationGroup | null {
  return animationGroups.find((group) => needles.some((needle) => group.name.toLowerCase().includes(needle))) ?? null;
}

function playAnimation(name: "idle" | "walk" | "run" | "jump" | "special"): void {
  if (currentAnimationName === name && currentAnimation?.isPlaying) return;
  const next = name === "idle" ? findAnimation("idle", "breath")
    : name === "walk" ? findAnimation("walk")
    : name === "run" ? findAnimation("run", "jog") ?? findAnimation("walk")
    : name === "jump" ? findAnimation("jump")
    : findAnimation("wave", "samba", "dance");
  if (!next) return;
  currentAnimation?.stop();
  next.start(name !== "jump" && name !== "special", 1, next.from, next.to, false);
  currentAnimation = next;
  currentAnimationName = name;
}

function palette(style: CharacterStyle): [Color3, Color3] {
  if (style === "runway") return [new Color3(0.08, 0.08, 0.12), new Color3(0.82, 0.18, 0.48)];
  if (style === "sport") return [new Color3(0.06, 0.35, 0.88), new Color3(0.08, 0.78, 0.78)];
  return [new Color3(0.18, 0.22, 0.3), new Color3(0.92, 0.58, 0.08)];
}

function applyCharacterStyle(style: CharacterStyle): void {
  activeStyle = style;
  const [primary, accent] = palette(style);
  if (characterRoot) {
    if (style === "power") characterRoot.scaling.set(0.112, 0.1, 0.112);
    if (style === "runway") characterRoot.scaling.set(0.094, 0.108, 0.094);
    if (style === "sport") characterRoot.scaling.set(0.1, 0.1, 0.1);
  }
  characterMeshes.forEach((mesh, index) => {
    if (!mesh.material) return;
    if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material);
    const clone = originalMaterials.get(mesh)?.clone(`${style}-${mesh.name}`);
    if (!clone) return;
    if (clone instanceof PBRMaterial) clone.albedoColor = index % 3 === 0 ? accent : primary;
    if (clone instanceof StandardMaterial) clone.diffuseColor = index % 3 === 0 ? accent : primary;
    mesh.material = clone;
  });
  characterButtons.forEach((button) => {
    const active = button.dataset.character === style;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setStatus(`${style[0].toUpperCase()}${style.slice(1)} character ready`);
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
    setStatus("High-quality character failed to load — check internet connection");
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
  verticalVelocity = 6.7;
  grounded = false;
  actionLockedUntil = performance.now() + 620;
  playAnimation("jump");
}

function requestSpecial(): void {
  if (!grounded) return;
  actionLockedUntil = performance.now() + 1600;
  playAnimation("special");
}

function resetPlayer(): void {
  player.position.set(0, 0, 0);
  player.rotationQuaternion = Quaternion.Identity();
  verticalVelocity = 0;
  grounded = true;
  camera.alpha = -Math.PI / 2;
  camera.beta = 1.05;
  camera.radius = 8.5;
  playAnimation("idle");
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
    pressed.add(key);
    event.preventDefault();
  }
  if (event.code === "Space") {
    requestJump();
    event.preventDefault();
  }
  if (key === "e") requestSpecial();
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
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }
    touchInput.x = dx / maxDistance;
    touchInput.y = -dy / maxDistance;
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  joystickZone.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    joystickZone.setPointerCapture(event.pointerId);
    update(event);
  });
  joystickZone.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointer) update(event);
  });
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
specialButton?.addEventListener("click", requestSpecial);
jumpButton?.addEventListener("click", requestJump);
resetButton?.addEventListener("click", resetPlayer);
characterButtons.forEach((button) => button.addEventListener("click", () => applyCharacterStyle(button.dataset.character as CharacterStyle)));

function getMovementInput(): Vector3 {
  let horizontal = touchInput.x;
  let vertical = touchInput.y;
  if (pressed.has("a") || pressed.has("arrowleft")) horizontal -= 1;
  if (pressed.has("d") || pressed.has("arrowright")) horizontal += 1;
  if (pressed.has("w") || pressed.has("arrowup")) vertical += 1;
  if (pressed.has("s") || pressed.has("arrowdown")) vertical -= 1;
  const length = Math.hypot(horizontal, vertical);
  if (length > 1) { horizontal /= length; vertical /= length; }
  return new Vector3(horizontal, 0, vertical);
}

function currentZone(): string {
  const { x, z } = player.position;
  if (x < -30 && z > 10) return "Crystal Lake";
  if (x < -25 && z < -30) return "Stonepeak Mountains";
  if (x > 28 && z < 5) return "Trailside Village";
  if (z > 34) return "Portal Grove";
  return Math.abs(x) < 25 && Math.abs(z) < 25 ? "Sunrise Meadow" : "Deep Wilds";
}

function updatePlayer(deltaSeconds: number): void {
  const input = getMovementInput();
  const moving = input.lengthSquared() > 0.01;
  const running = pressed.has("shift") || Math.abs(touchInput.x) + Math.abs(touchInput.y) > 1.35;
  if (moving) {
    const cameraForward = new Vector3(-Math.sin(camera.alpha), 0, -Math.cos(camera.alpha));
    const cameraRight = new Vector3(-cameraForward.z, 0, cameraForward.x);
    const direction = cameraRight.scale(input.x).add(cameraForward.scale(input.z)).normalize();
    const speed = running ? 5.5 : 3;
    player.position.addInPlace(direction.scale(speed * deltaSeconds));
    const targetYaw = Math.atan2(direction.x, direction.z);
    const currentYaw = player.rotationQuaternion?.toEulerAngles().y ?? 0;
    player.rotationQuaternion = Quaternion.FromEulerAngles(0, Scalar.LerpAngle(currentYaw, targetYaw, 1 - Math.exp(-12 * deltaSeconds)), 0);
    if (performance.now() > actionLockedUntil && grounded) playAnimation(running ? "run" : "walk");
  } else if (performance.now() > actionLockedUntil && grounded) {
    playAnimation("idle");
  }

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

  player.position.x = Scalar.Clamp(player.position.x, -100, 100);
  player.position.z = Scalar.Clamp(player.position.z, -100, 100);
  camera.target = Vector3.Lerp(camera.target, player.position.add(new Vector3(0, 1.2, 0)), 1 - Math.exp(-8 * deltaSeconds));
  if (zoneChip) zoneChip.textContent = currentZone();
}

async function start(): Promise<void> {
  await loadCharacter();
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