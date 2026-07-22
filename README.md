# K2 3D Playground

A focused character-controller lab for learning polished 3D game development with Babylon.js, TypeScript, and Vite.

## Current features

- Animated humanoid character loaded from a Babylon.js sample asset
- Idle, walk, run, jump, and wave/dance action states
- Camera-relative keyboard movement
- Smooth third-person orbit camera and zoom
- Touch joystick plus mobile action buttons
- Jump physics, gravity, reset, shadows, lighting, trees, rocks, and a test landmark
- Fallback character if the remote animated model cannot load

## Controls

| Input | Action |
| --- | --- |
| W/A/S/D or arrow keys | Move |
| Shift | Run |
| Space | Jump |
| E | Wave/action |
| Mouse/touch drag | Orbit camera |
| Mouse wheel/pinch | Zoom |

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deployment

Import this repository into Vercel. The framework preset should detect Vite automatically.

- Build command: `npm run build`
- Output directory: `dist`

## Next milestones

1. Replace the sample humanoid with an original licensed `.glb` mascot.
2. Add a proper animation state machine with blended transitions.
3. Add slope handling, collision obstacles, and a physics character controller.
4. Add collectible and interaction systems.
5. Split Character Studio and Playground into separate application modes.
