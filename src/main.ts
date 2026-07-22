import "./styles.css";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scalar,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

type CharacterKind = "macho" | "dog" | "model" | "truck";
type Rig = {
  root: TransformNode;
  parts: Record<string, TransformNode | Mesh>;
  baseY: number;
  speed: number;
  runSpeed: number;
};

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

const camera = new ArcRotateCamera("camera", -Math.PI / 2, 1.08, 8.5, new Vector3(0, 1.4, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 3.5;
camera.upperRadiusLimit = 20;
camera.lowerBetaLimit = 0.48;
camera.upperBetaLimit = 1.45;
camera.wheelDeltaPercentage = 0.01;
camera.panningSensibility = 0;
camera.angularSensibilityX = 2400;
camera.angularSensibilityY = 2400;
camera.inertia = 0.82;

const ambient = new HemisphericLight("ambient", new Vector3(0.2, 1, 0.1), scene);
ambient.intensity = 0.9;
ambient.groundColor = new Color3(0.22, 0.29, 0.34);
const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.35), scene);
sun.position = new Vector3(35, 50, -28);
sun.intensity = 2.15;
const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.darkness = 0.25;

function mat(name: string, color: Color3, emissive?: Color3): StandardMaterial {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(0.03, 0.03, 0.03);
  if (emissive) value.emissiveColor = emissive;
  return value;
}

const grass = mat("grass", new Color3(0.16, 0.45, 0.24));
const sand = mat("sand", new Color3(0.66, 0.56, 0.38));
const stone = mat("stone", new Color3(0.35, 0.39, 0.42));
const wood = mat("wood", new Color3(0.31, 0.18, 0.09));
const water = mat("water", new Color3(0.05, 0.34, 0.63), new Color3(0.02, 0.12, 0.22));
water.alpha = 0.88;

const ground = MeshBuilder.CreateGround("world", { width: 220, height: 220, subdivisions: 4 }, scene);
ground.material = grass;
ground.receiveShadows = true;

function cast(...meshes: Mesh[]): void {
  meshes.forEach((mesh) => {
    shadows.addShadowCaster(mesh);
    mesh.receiveShadows = true;
  });
}

function addTree(x: number, z: number, scale = 1): void {
  const trunk = MeshBuilder.CreateCylinder("trunk", { height: 3 * scale, diameterTop: 0.35 * scale, diameterBottom: 0.65 * scale, tessellation: 8 }, scene);
  trunk.position.set(x, 1.5 * scale, z);
  trunk.material = wood;
  const crown = MeshBuilder.CreateIcoSphere("crown", { radius: 1.6 * scale, subdivisions: 2 }, scene);
  crown.position.set(x, 3.7 * scale, z);
  crown.scaling.y = 1.25;
  crown.material = mat(`leaf-${x}-${z}`, new Color3(0.08 + (Math.abs(x) % 5) * 0.018, 0.32 + (Math.abs(z) % 4) * 0.025, 0.15));
  cast(trunk, crown);
}

function addHouse(x: number, z: number, color: Color3): void {
  const body = MeshBuilder.CreateBox("house", { width: 5, depth: 4.5, height: 3.3 }, scene);
  body.position.set(x, 1.65, z);
  body.material = mat(`house-${x}`, color);
  const roof = MeshBuilder.CreateCylinder("roof", { diameter: 6.2, height: 5.2, tessellation: 3 }, scene);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(x, 4.1, z);
  roof.scaling.z = 0.8;
  roof.material = mat(`roof-${x}`, new Color3(0.34, 0.11, 0.08));
  cast(body, roof);
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

  for (let i = 0; i < 26; i += 1) {
    const angle = i * 1.73;
    const radius = 14 + (i % 8) * 8;
    const rock = MeshBuilder.CreateIcoSphere("rock", { radius: 0.35 + (i % 4) * 0.22, subdivisions: 1 }, scene);
    rock.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius);
    rock.scaling.set(1.35, 0.72, 1);
    rock.material = stone;
    cast(rock);
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
    cast(step);
  }

  addHouse(42, -22, new Color3(0.66, 0.34, 0.2));
  addHouse(50, -16, new Color3(0.22, 0.48, 0.68));
  addHouse(39, -10, new Color3(0.63, 0.55, 0.22));
  addHouse(54, -4, new Color3(0.42, 0.6, 0.34));

  for (let i = 0; i < 7; i += 1) {
    const height = 16 + i * 3;
    const peak = MeshBuilder.CreateCylinder("mountain", { diameterBottom: 16 + i * 1.5, diameterTop: 0, height, tessellation: 8 }, scene);
    peak.position.set(-62 + i * 8, height / 2 - 0.2, -58 - (i % 2) * 7);
    peak.material = stone;
    cast(peak);
  }

  const portal = MeshBuilder.CreateTorus("portal", { diameter: 6, thickness: 0.28, tessellation: 64 }, scene);
  portal.position.set(0, 3.2, 52);
  portal.rotation.x = Math.PI / 2;
  portal.material = mat("portal-material", new Color3(0.08, 0.38, 0.75), new Color3(0.05, 0.3, 0.85));
  cast(portal);
}
createWorld();

const player = new TransformNode("player", scene);
player.rotationQuaternion = Quaternion.Identity();
let activeKind: CharacterKind = "macho";
let activeRig: Rig | null = null;
let verticalVelocity = 0;
let grounded = true;
let specialUntil = 0;
let lastTime = performance.now();
const pressed = new Set<string>();
const touchInput = { x: 0, y: 0 };

function box(name: string, size: { width: number; height: number; depth: number }, parent: TransformNode, position: Vector3, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.parent = parent;
  mesh.position = position;
  mesh.material = material;
  cast(mesh);
  return mesh;
}

function sphere(name: string, diameter: number, parent: TransformNode, position: Vector3, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 20 }, scene);
  mesh.parent = parent;
  mesh.position = position;
  mesh.material = material;
  cast(mesh);
  return mesh;
}

function limb(name: string, length: number, radius: number, parent: TransformNode, position: Vector3, material: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateCapsule(name, { height: length, radius }, scene);
  mesh.parent = parent;
  mesh.position = position;
  mesh.material = material;
  cast(mesh);
  return mesh;
}

function createMacho(): Rig {
  const root = new TransformNode("macho-root", scene);
  root.parent = player;
  const skin = mat("macho-skin", new Color3(0.72, 0.42, 0.25));
  const shorts = mat("macho-shorts", new Color3(0.07, 0.12, 0.22));
  const boots = mat("macho-boots", new Color3(0.12, 0.07, 0.04));
  const torso = MeshBuilder.CreateCapsule("macho-torso", { height: 1.25, radius: 0.48 }, scene);
  torso.parent = root; torso.position.y = 1.35; torso.scaling.x = 1.25; torso.material = skin; cast(torso);
  sphere("macho-head", 0.58, root, new Vector3(0, 2.25, 0.02), skin);
  const leftArm = limb("macho-left-arm", 1.05, 0.17, root, new Vector3(-0.63, 1.48, 0), skin);
  const rightArm = limb("macho-right-arm", 1.05, 0.17, root, new Vector3(0.63, 1.48, 0), skin);
  const leftLeg = limb("macho-left-leg", 1.0, 0.2, root, new Vector3(-0.22, 0.55, 0), shorts);
  const rightLeg = limb("macho-right-leg", 1.0, 0.2, root, new Vector3(0.22, 0.55, 0), shorts);
  box("macho-left-boot", { width: 0.3, height: 0.22, depth: 0.52 }, root, new Vector3(-0.22, 0.08, 0.12), boots);
  box("macho-right-boot", { width: 0.3, height: 0.22, depth: 0.52 }, root, new Vector3(0.22, 0.08, 0.12), boots);
  return { root, parts: { leftArm, rightArm, leftLeg, rightLeg, torso }, baseY: 0, speed: 3.2, runSpeed: 6.2 };
}

function createDog(): Rig {
  const root = new TransformNode("dog-root", scene); root.parent = player;
  const fur = mat("dog-fur", new Color3(0.56, 0.29, 0.12));
  const cream = mat("dog-cream", new Color3(0.92, 0.76, 0.55));
  const body = MeshBuilder.CreateCapsule("dog-body", { height: 1.35, radius: 0.38 }, scene);
  body.parent = root; body.position.set(0, 0.72, 0); body.rotation.x = Math.PI / 2; body.material = fur; cast(body);
  const head = sphere("dog-head", 0.7, root, new Vector3(0, 0.92, 0.72), fur);
  const muzzle = sphere("dog-muzzle", 0.34, root, new Vector3(0, 0.82, 1.05), cream);
  muzzle.scaling.z = 1.35;
  const legs = [
    limb("dog-fl", 0.72, 0.11, root, new Vector3(-0.25, 0.35, 0.48), fur),
    limb("dog-fr", 0.72, 0.11, root, new Vector3(0.25, 0.35, 0.48), fur),
    limb("dog-bl", 0.72, 0.11, root, new Vector3(-0.25, 0.35, -0.48), fur),
    limb("dog-br", 0.72, 0.11, root, new Vector3(0.25, 0.35, -0.48), fur),
  ];
  const tail = limb("dog-tail", 0.75, 0.1, root, new Vector3(0, 0.9, -0.83), fur);
  tail.rotation.x = -0.9;
  return { root, parts: { body, head, tail, fl: legs[0], fr: legs[1], bl: legs[2], br: legs[3] }, baseY: 0, speed: 4.2, runSpeed: 7.4 };
}

function createModel(): Rig {
  const root = new TransformNode("model-root", scene); root.parent = player;
  const skin = mat("model-skin", new Color3(0.82, 0.55, 0.4));
  const dress = mat("model-dress", new Color3(0.72, 0.05, 0.38));
  const dark = mat("model-dark", new Color3(0.04, 0.03, 0.05));
  const torso = MeshBuilder.CreateCylinder("model-torso", { height: 1.15, diameterTop: 0.48, diameterBottom: 0.78, tessellation: 24 }, scene);
  torso.parent = root; torso.position.y = 1.35; torso.material = dress; cast(torso);
  sphere("model-head", 0.5, root, new Vector3(0, 2.18, 0), skin);
  const hair = sphere("model-hair", 0.54, root, new Vector3(0, 2.28, -0.05), dark); hair.scaling.y = 1.15;
  const leftArm = limb("model-left-arm", 0.95, 0.105, root, new Vector3(-0.38, 1.48, 0), skin);
  const rightArm = limb("model-right-arm", 0.95, 0.105, root, new Vector3(0.38, 1.48, 0), skin);
  const leftLeg = limb("model-left-leg", 1.15, 0.12, root, new Vector3(-0.15, 0.52, 0), skin);
  const rightLeg = limb("model-right-leg", 1.15, 0.12, root, new Vector3(0.15, 0.52, 0), skin);
  box("model-left-shoe", { width: 0.2, height: 0.12, depth: 0.46 }, root, new Vector3(-0.15, 0.03, 0.14), dark);
  box("model-right-shoe", { width: 0.2, height: 0.12, depth: 0.46 }, root, new Vector3(0.15, 0.03, 0.14), dark);
  return { root, parts: { torso, hair, leftArm, rightArm, leftLeg, rightLeg }, baseY: 0, speed: 3.1, runSpeed: 5.6 };
}

function createTruck(): Rig {
  const root = new TransformNode("truck-root", scene); root.parent = player;
  const red = mat("truck-red", new Color3(0.65, 0.05, 0.04));
  const black = mat("truck-black", new Color3(0.03, 0.03, 0.035));
  const glass = mat("truck-glass", new Color3(0.12, 0.35, 0.5));
  box("truck-body", { width: 1.65, height: 0.55, depth: 2.8 }, root, new Vector3(0, 0.62, 0), red);
  box("truck-cab", { width: 1.45, height: 0.9, depth: 1.2 }, root, new Vector3(0, 1.18, 0.55), red);
  box("truck-window", { width: 1.2, height: 0.38, depth: 0.05 }, root, new Vector3(0, 1.37, 1.16), glass);
  const wheelPositions = [new Vector3(-0.82, 0.36, 0.88), new Vector3(0.82, 0.36, 0.88), new Vector3(-0.82, 0.36, -0.88), new Vector3(0.82, 0.36, -0.88)];
  const parts: Record<string, TransformNode | Mesh> = {};
  wheelPositions.forEach((position, index) => {
    const wheel = MeshBuilder.CreateCylinder(`wheel-${index}`, { diameter: 0.62, height: 0.24, tessellation: 24 }, scene);
    wheel.parent = root; wheel.position = position; wheel.rotation.z = Math.PI / 2; wheel.material = black; cast(wheel); parts[`wheel${index}`] = wheel;
  });
  return { root, parts, baseY: 0, speed: 5.3, runSpeed: 9.2 };
}

function switchCharacter(kind: CharacterKind): void {
  activeRig?.root.dispose(false, true);
  activeKind = kind;
  activeRig = kind === "macho" ? createMacho() : kind === "dog" ? createDog() : kind === "model" ? createModel() : createTruck();
  characterButtons.forEach((button) => {
    const active = button.dataset.character === kind;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const names: Record<CharacterKind, string> = { macho: "Macho hero", dog: "Adventure dog", model: "Runway model", truck: "Off-road truck" };
  if (statusElement) statusElement.textContent = `${names[kind]} selected`;
}

function requestJump(): void {
  if (!grounded) return;
  verticalVelocity = activeKind === "truck" ? 4.7 : activeKind === "dog" ? 6.1 : 6.7;
  grounded = false;
}

function requestSpecial(): void {
  specialUntil = performance.now() + 1200;
}

function resetPlayer(): void {
  player.position.set(0, 0, 0);
  player.rotationQuaternion = Quaternion.Identity();
  verticalVelocity = 0;
  grounded = true;
  camera.alpha = -Math.PI / 2;
  camera.beta = 1.08;
  camera.radius = 8.5;
}

function getInput(): Vector3 {
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

function animateRig(time: number, moving: boolean, running: boolean, speed: number): void {
  if (!activeRig) return;
  const p = activeRig.parts;
  const cycle = time * (running ? 0.014 : 0.009) * Math.max(speed, 1);
  const swing = moving ? Math.sin(cycle) : 0;
  activeRig.root.position.y = activeRig.baseY + (moving && grounded ? Math.abs(Math.sin(cycle * 2)) * 0.05 : 0);

  if (activeKind === "macho") {
    p.leftArm.rotation.x = swing * 0.75;
    p.rightArm.rotation.x = -swing * 0.75;
    p.leftLeg.rotation.x = -swing * 0.62;
    p.rightLeg.rotation.x = swing * 0.62;
    if (time < specialUntil) { p.leftArm.rotation.z = -1.4; p.rightArm.rotation.z = 1.4; } else { p.leftArm.rotation.z = 0; p.rightArm.rotation.z = 0; }
  } else if (activeKind === "dog") {
    p.fl.rotation.x = swing * 0.8; p.br.rotation.x = swing * 0.8;
    p.fr.rotation.x = -swing * 0.8; p.bl.rotation.x = -swing * 0.8;
    p.tail.rotation.z = Math.sin(time * 0.018) * (time < specialUntil ? 1.1 : 0.45);
    p.head.rotation.y = time < specialUntil ? Math.sin(time * 0.02) * 0.35 : 0;
  } else if (activeKind === "model") {
    p.leftArm.rotation.x = -swing * 0.4; p.rightArm.rotation.x = swing * 0.4;
    p.leftLeg.rotation.x = swing * 0.72; p.rightLeg.rotation.x = -swing * 0.72;
    p.torso.rotation.z = moving ? Math.sin(cycle * 0.5) * 0.07 : 0;
    if (time < specialUntil) { p.leftArm.rotation.z = -1.05; p.rightArm.rotation.z = 0.35; } else { p.leftArm.rotation.z = 0; p.rightArm.rotation.z = 0; }
  } else {
    Object.values(p).forEach((part) => { part.rotation.x -= speed * 0.055; });
    activeRig.root.rotation.z = moving ? -Math.sin(cycle) * 0.025 : 0;
    if (time < specialUntil) activeRig.root.scaling.y = 1 + Math.abs(Math.sin(time * 0.02)) * 0.08;
    else activeRig.root.scaling.y = 1;
  }
}

function updateZone(): void {
  const x = player.position.x;
  const z = player.position.z;
  let zone = "Sunrise Meadow";
  if (x < -28 && z > 10) zone = "Crystal Lake";
  else if (x > 28 && z < 8) zone = "Trailside Village";
  else if (z < -34) zone = "Stonepeak Mountains";
  else if (z > 35) zone = "Portal Grove";
  else if (Math.abs(x) > 70 || Math.abs(z) > 70) zone = "Deep Wilds";
  if (zoneChip) zoneChip.textContent = zone;
}

function updatePlayer(delta: number): void {
  if (!activeRig) return;
  const input = getInput();
  const moving = input.lengthSquared() > 0.01;
  const running = pressed.has("shift") || Math.abs(touchInput.x) + Math.abs(touchInput.y) > 1.35;
  let actualSpeed = 0;

  if (moving) {
    const forward = new Vector3(-Math.sin(camera.alpha), 0, -Math.cos(camera.alpha));
    const right = new Vector3(forward.z, 0, -forward.x);
    const direction = right.scale(input.x).add(forward.scale(input.z)).normalize();
    actualSpeed = running ? activeRig.runSpeed : activeRig.speed;
    player.position.addInPlace(direction.scale(actualSpeed * delta));
    const targetYaw = Math.atan2(direction.x, direction.z);
    const currentYaw = player.rotationQuaternion?.toEulerAngles().y ?? 0;
    player.rotationQuaternion = Quaternion.FromEulerAngles(0, Scalar.LerpAngle(currentYaw, targetYaw, 1 - Math.exp(-12 * delta)), 0);
  }

  verticalVelocity -= 17.5 * delta;
  player.position.y += verticalVelocity * delta;
  if (player.position.y <= 0) { player.position.y = 0; verticalVelocity = 0; grounded = true; }

  player.position.x = Scalar.Clamp(player.position.x, -102, 102);
  player.position.z = Scalar.Clamp(player.position.z, -102, 102);
  camera.target = Vector3.Lerp(camera.target, player.position.add(new Vector3(0, activeKind === "truck" ? 1.0 : 1.35, 0)), 1 - Math.exp(-8 * delta));
  animateRig(performance.now(), moving, running, actualSpeed);
  updateZone();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) { pressed.add(key); event.preventDefault(); }
  if (event.code === "Space") { requestJump(); event.preventDefault(); }
  if (key === "e") requestSpecial();
});
window.addEventListener("keyup", (event) => pressed.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => pressed.clear());

function setupJoystick(): void {
  if (!joystickZone || !joystickKnob) return;
  let activePointer: number | null = null;
  const update = (event: PointerEvent): void => {
    const rect = joystickZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.32;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);
    if (distance > max) { dx = dx / distance * max; dy = dy / distance * max; }
    touchInput.x = dx / max;
    touchInput.y = -dy / max;
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  joystickZone.addEventListener("pointerdown", (event) => { activePointer = event.pointerId; joystickZone.setPointerCapture(event.pointerId); update(event); });
  joystickZone.addEventListener("pointermove", (event) => { if (event.pointerId === activePointer) update(event); });
  const release = (event: PointerEvent): void => {
    if (event.pointerId !== activePointer) return;
    activePointer = null; touchInput.x = 0; touchInput.y = 0;
    joystickKnob.style.transform = "translate(-50%, -50%)";
  };
  joystickZone.addEventListener("pointerup", release);
  joystickZone.addEventListener("pointercancel", release);
}
setupJoystick();

characterButtons.forEach((button) => button.addEventListener("click", () => switchCharacter(button.dataset.character as CharacterKind)));
helpToggle?.addEventListener("click", () => {
  helpPanel?.classList.toggle("collapsed");
  helpToggle.setAttribute("aria-expanded", String(!helpPanel?.classList.contains("collapsed")));
});
specialButton?.addEventListener("click", requestSpecial);
jumpButton?.addEventListener("click", requestJump);
resetButton?.addEventListener("click", resetPlayer);

switchCharacter("macho");
loadingScreen?.classList.add("hidden");
engine.runRenderLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  updatePlayer(delta);
  scene.render();
});
window.addEventListener("resize", () => engine.resize());