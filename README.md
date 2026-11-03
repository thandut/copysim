# FRS right-stick heading control

This is a local unpacked Chrome/Edge extension for the real FRS REBUILT site.
It does not proxy the website, bypass security checks, or redirect multiplayer
traffic. Chrome loads `rebuilt.frsim.com` normally and the extension changes
only the controller-input and robot-heading functions in your browser.

## Install

1. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:

   ```text
   C:\Users\zetha\Desktop\robotics\copysim\extension
   ```

5. Open <https://rebuilt.frsim.com/> normally. Complete any genuine Vercel
   browser check if it appears.
6. Connect the Xbox controller and choose it in the FRS controller settings.

After changing extension files, use the reload button on its card in
`chrome://extensions`, then reload FRS. Do not run `npm start`; the old proxy is
no longer used.

## Controls

- Left stick: normal field-relative translation.
- Right-stick direction: absolute field-relative robot heading.
- The robot's intake side is treated as its front.
- Circular right-stick movement: continuous rotation through the
  `-180°`/`180°` boundary.
- Right stick released: rotation output returns to zero.

The implementation mirrors the referenced `DriveFactory` values:

- radial right-stick deadband: `0.9`
- proportional gain: `3.5`
- derivative gain: `0.09`
- maximum heading lead: `170°`

The generic controller path covers robots such as 4414 and 254. The separate
Reblitz path covers 2910. While 2910 is scoring, its built-in hub aim takes
priority over custom right-stick heading. Version 1.0.14 applies heading control
at the WebAssembly input boundary used by the Halloween build, while retaining
the JavaScript-controller fallback. It patches both the page input code and the
simulation Web Worker where robot physics actually runs. A red banner appears
10 seconds after the simulation Worker starts if an FRS update prevents either
side from loading.

For a detailed status check, open the browser developer console and enter:

```js
__copySimHeadingPatch
```

After starting a match, `input`, `worker`, and `workerEngine` should all be
`true`. The remaining fields show the selected controller's right-stick axes
and whether those values reached the robot controller in the simulation Worker.

## Verify

Run:

```powershell
npm test
```
