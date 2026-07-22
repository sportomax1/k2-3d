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
  Mesh,
  MeshBuilder,
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

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  antialias: true,
  powerPreference: "high-performance",
});

const scene = new Scene(engine);
scene.clearColor = new Color4(0.52, 0.76, 0.94, 1);
scene.collisionsEnabled = true;

const camera = new ArcRotateCamera(
  "third-person-camera",
  -Math.PI / 2,
  1.08,
  7.5,
  new Vector3(0, 1.25, 0),
  scene,
);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 3.2;
camera.upperRadiusLimit = 13;
camera.lowerBetaLimit = 0.55;
camera.upperBetaLimit = 1.42;
camera.wheelDeltaPercentage = 0.01;
camera.panningSensibility = 0;
camera.angularSensibilityX = 2500;
camera.angularSensibilityY = 2500;
camera.inertia = 0.82;

const ambient = new HemisphericLight("ambient", new Vector3(0.2, 1, 0.1), scene);
ambient.intensity = 0.9;
ambient.groundColor = new Color3(0.22, 0.29, 0.34);

const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.35), scene);
sun.position = new Vector3(16, 24, -14);
sun.intensity = 2.1;

const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.darkness = 0.26;

const ground = MeshBuilder.CreateGround("ground", { width: 90, height: 90, subdivisions: 2 }, scene);
const groundMaterial = new StandardMaterial("ground-material", scene);
groundMaterial.diffuseColor = new Color3(0.18, 0.48, 0.27);
groundMaterial.specularColor = new Color3(0.02, 0.03, 0.02);
ground.material = groundMaterial;
ground.receiveShadows = true;

const path = MeshBuilder.CreateGround("path", { width: 7, height: 60 }, scene);
path.position.y = 0.012;
path.rotation.y = 0.18;
const pathMaterial = new StandardMaterial("path-material", scene);
pathMaterial.diffuseColor = new Color3(0.48, 0.40, 0.29);
pathMaterial.specularColor = Color3.Black();
path.material = pathMaterial;
path.receiveShadows = true;

function createEnvironment(): void {
  const trunkMaterial = new StandardMaterial("trunks", scene);
  trunkMaterial.diffuseColor = new Color3(0.28, 0.16, 0.08);
  const leafMaterials = [
    new Color3(0.08, 0.33, 0.15),
    new Color3(0.12, 0.43, 0.19),
    new Color3(0.20, 0.50, 0.23),
  ].map((color, index) => {
    const material = new StandardMaterial(`leaves-${index}`, scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    return material;
  });

  const treePositions = [
    [-10, -7], [-13, 4], [-9, 12], [-16, -13], [11, -10], [15, -2], [11, 9],
    [18, 14], [-22, 10], [23, -15], [-26, -4], [28, 5], [-18, 22], [19, 25],
  ];

  treePositions.forEach(([x, z], index) => {
    const scale = 0.85 + (index % 4) * 0.12;
    const trunk = MeshBuilder.CreateCylinder(`trunk-${index}`, {
      height: 2.8 * scale,
      diameterTop: 0.38 * scale,
      diameterBottom: 0.62 * scale,
      tessellation: 8,
    }, scene);
    trunk.position = new Vector3(x, 1.4 * scale, z);
    trunk.material = trunkMaterial;
    trunk.receiveShadows = true;
    shadows.addShadowCaster(trunk);

    const crown = MeshBuilder.CreateIcoSphere(`crown-${index}`, {
      radius: 1.55 * scale,
      subdivisions: 2,
    }, scene);
    crown.position = new Vector3(x, 3.35 * scale, z);
    crown.scaling.y = 1.25;
    crown.material = leafMaterials[index % leafMaterials.length];
    crown.receiveShadows = true;
    shadows.addShadowCaster(crown);
  });

  const rockMaterial = new StandardMaterial("rocks", scene);
  rockMaterial.diffuseColor = new Color3(0.32, 0.38, 0.40);
  rockMaterial.specularColor = new Color3(0.05, 0.05, 0.05);

  for (let index = 0; index < 18; index += 1) {
    const angle = index * 2.19;
    const radius = 9 + (index % 6) * 3.2;
    const rock = MeshBuilder.CreateIcoSphere(`rock-${index}`, {
      radius: 0.35 + (index % 3) * 0.16,
      subdivisions: 1,
    }, scene);
    rock.position = new Vector3(Math.cos(angle) * radius, rock.scaling.y * 0.3, Math.sin(angle) * radius);
    rock.scaling = new Vector3(1.25, 0.7, 1);
    rock.rotation = new Vector3(index * 0.31, angle, index * 0.17);
    rock.material = rockMaterial;
    rock.receiveShadows = true;
    shadows.addShadowCaster(rock);
  }

  const portalRing = MeshBuilder.CreateTorus("portal-ring", {
    diameter: 4.8,
    thickness: 0.22,
    tessellation: 48,
  }, scene);
  portalRing.position = new Vector3(0, 2.55, 21);
  portalRing.rotation.x = Math.PI / 2;
  const portalMaterial = new StandardMaterial("portal-material", scene);
  portalMaterial.diffuseColor = new Color3(0.08, 0.38, 0.75);
  portalMaterial.emissiveColor = new Color3(0.05, 0.25, 0.72);
  portalRing.material = portalMaterial;
  shadows.addShadowCaster(portalRing);
}

createEnvironment();

const player = new TransformNode("player", scene);
player.position = new Vector3(0, 0, 0);

const collider = MeshBuilder.CreateCapsule("player-collider", { height: 1.8, radius: 0.38 }, scene);
collider.parent = player;
collider.position.y = 0.9;
collider.isVisible = false;

let characterRoot: TransformNode | null = null;
let characterMeshes: AbstractMesh[] = [];
let animationGroups: AnimationGroup[] = [];
let currentAnimation: AnimationGroup | null = null;
let currentAnimationName = "";
let fallbackCharacter: Mesh | null = null;

function setStatus(text: string): void {
  if (statusElement) statusElement.textContent = text;
}

function findAnimation(...needles: string[]): AnimationGroup | null {
  return animationGroups.find((group) => {
    const name = group.name.toLowerCase();
    return needles.some((needle) => name.includes(needle));
  }) ?? null;
}

function playAnimation(name: "idle" | "walk" | "run" | "jump" | "wave"): void {
  if (currentAnimationName === name && currentAnimation?.isPlaying) return;

  const next = name === "idle"
    ? findAnimation("idle", "breath")
    : name === "walk"
      ? findAnimation("walk")
      : name === "run"
        ? findAnimation("run", "jog") ?? findAnimation("walk")
        : name === "jump"
          ? findAnimation("jump")
          : findAnimation("wave", "samba", "dance");

  if (!next) return;
  currentAnimation?.stop();
  next.start(name !== "jump" && name !== "wave", 1, next.from, next.to, false);
  currentAnimation = next;
  currentAnimationName = name;
}

function createFallbackCharacter(): void {
  const bodyMaterial = new StandardMaterial("fallback-body", scene);
  bodyMaterial.diffuseColor = new Color3(0.12, 0.46, 0.92);
  const accentMaterial = new StandardMaterial("fallback-accent", scene);
  accentMaterial.diffuseColor = new Color3(1, 0.58, 0.12);

  const body = MeshBuilder.CreateCapsule("fallback-character", { height: 1.55, radius: 0.38 }, scene);
  body.parent = player;
  body.position.y = 0.85;
  body.material = bodyMaterial;
  fallbackCharacter = body;

  const face = MeshBuilder.CreateSphere("fallback-face", { diameter: 0.5, segments: 24 }, scene);
  face.parent = player;
  face.position = new Vector3(0, 1.55, 0.1);
  face.material = accentMaterial;

  const nose = MeshBuilder.CreateSphere("fallback-nose", { diameter: 0.15, segments: 16 }, scene);
  nose.parent = player;
  nose.position = new Vector3(0, 1.57, 0.37);
  nose.material = bodyMaterial;

  [body, face, nose].forEach((mesh) => shadows.addShadowCaster(mesh));
  setStatus("Fallback hero ready");
}

async function loadCharacter(): Promise<void> {
  try {
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "https://assets.babylonjs.com/meshes/",
      "HVGirl.glb",
      scene,
    );

    characterRoot = new TransformNode("character-root", scene);
    characterRoot.parent = player;
    characterRoot.scaling = new Vector3(0.1, 0.1, 0.1);
    characterRoot.rotationQuaternion = Quaternion.FromEulerAngles(0, Math.PI, 0);

    characterMeshes = result.meshes;
    characterMeshes.forEach((mesh) => {
      if (!mesh.parent) mesh.parent = characterRoot;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
    });

    animationGroups = result.animationGroups;
    animationGroups.forEach((group) => group.stop());
    playAnimation("idle");
    setStatus("Hero ready • Explore");
  } catch (error) {
    console.error("Character failed to load; using fallback.", error);
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
  verticalVelocity = 6.7;
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
  camera.radius = 7.5;
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
waveButton?.addEventListener("click", requestWave);
jumpButton?.addEventListener("click", requestJump);
resetButton?.addEventListener("click", resetPlayer);

function getMovementInput(): Vector3 {
  let horizontal = touchInput.x;
  let vertical = touchInput.y;
  if (pressed.has("a") || pressed.has("arrowleft")) horizontal -= 1;
  if (pressed.has("d") || pressed.has("arrowright")) horizontal += 1;
  if (pressed.has("w") || pressed.has("arrowup")) vertical += 1;
  if (pressed.has("s") || pressed.has("arrowdown")) vertical -= 1;

  const length = Math.hypot(horizontal, vertical);
  if (length > 1) {
    horizontal /= length;
    vertical /= length;
  }
  return new Vector3(horizontal, 0, vertical);
}

function updatePlayer(deltaSeconds: number): void {
  const input = getMovementInput();
  const moving = input.lengthSquared() > 0.01;
  const running = pressed.has("shift") || Math.abs(touchInput.x) + Math.abs(touchInput.y) > 1.35;

  if (moving) {
    const cameraForward = new Vector3(Math.sin(camera.alpha), 0, Math.cos(camera.alpha));
    const cameraRight = new Vector3(cameraForward.z, 0, -cameraForward.x);
    const direction = cameraRight.scale(input.x).add(cameraForward.scale(input.z)).normalize();
    const speed = running ? 5.1 : 2.7;
    player.position.addInPlace(direction.scale(speed * deltaSeconds));

    const targetYaw = Math.atan2(direction.x, direction.z);
    const currentYaw = player.rotationQuaternion?.toEulerAngles().y ?? 0;
    const smoothedYaw = Scalar.LerpAngle(currentYaw, targetYaw, 1 - Math.exp(-12 * deltaSeconds));
    player.rotationQuaternion = Quaternion.FromEulerAngles(0, smoothedYaw, 0);

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

  if (fallbackCharacter) {
    const bob = moving && grounded ? Math.sin(performance.now() * (running ? 0.014 : 0.009)) * 0.055 : 0;
    fallbackCharacter.position.y = 0.85 + bob;
  }

  player.position.x = Scalar.Clamp(player.position.x, -38, 38);
  player.position.z = Scalar.Clamp(player.position.z, -38, 38);
  camera.target = Vector3.Lerp(camera.target, player.position.add(new Vector3(0, 1.15, 0)), 1 - Math.exp(-8 * deltaSeconds));
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
