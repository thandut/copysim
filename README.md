# FRS Right-Stick Heading Control

A Chrome/Edge extension that adds absolute right-stick heading control to
[FRS REBUILT](https://rebuilt.frsim.com/). It is intended for FRC drivers who
want the simulator's steering to behave more like an absolute heading-controlled swerve
drive.

The extension runs locally in the browser. It does not proxy the website,
bypass security checks, or redirect multiplayer traffic. REBUILT loads from its
normal website, and the extension modifies only controller input and robot
heading behavior in the current browser.

## Requirements

- Google Chrome or Microsoft Edge
- An Xbox-compatible controller
- A local copy of this repository

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository's `extension` folder.
6. Open [FRS REBUILT](https://rebuilt.frsim.com/), connect the controller, and
   select it in the simulator's controller settings.

After updating the repository or changing extension files, reload the extension
from the browser's extensions page. Close any existing REBUILT tabs before
opening the simulator again so its simulation worker starts with the new code.

## Controls

- **Left stick:** normal field-relative translation
- **Right-stick direction:** absolute field-relative robot heading
- **Right stick released:** zero manual rotation output
- **Right stick moved in a circle:** continuous rotation across the
  `-180°`/`180°` boundary

The intake side is treated as the robot's front.

## Heading Controller

The controller uses these tuning values:

- Radial right-stick deadband: `0.9`
- Proportional gain: `3.5`
- Derivative gain: `0.09`
- Maximum heading lead: `170°`

Turret robots such as 4414 retain right-stick chassis heading while firing.

## Compatibility

Version 1.0.16 applies heading control at REBUILT's WebAssembly input boundary
and retains a JavaScript-controller fallback. The input patch also recognizes
safe variable-only minifier changes.

REBUILT is actively updated, so a future deployment may change the internal
code that this extension patches. If compatibility checks fail, a red banner
appears after the simulation worker starts instead of silently applying a
partial patch.

## Troubleshooting

First reload the unpacked extension, close all REBUILT tabs, and reopen the
site. To inspect the patch status, open the browser developer console and run:

```js
__copySimHeadingPatch
```

After starting a match, `input`, `worker`, and `workerEngine` should be `true`.
The other fields show the selected controller's right-stick axes, whether input
reached the worker, and whether heading control is engaged.

When reporting a compatibility issue, include this status object and describe
the selected robot and controller action that caused the problem.

## Development

Run the automated tests from the repository root:

```powershell
npm test
```

The extension has no build step. Do not run `npm start`; load the `extension`
folder directly as an unpacked browser extension.
