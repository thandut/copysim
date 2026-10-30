import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

test("the extension survives Turbopack's queue-to-runtime handoff", async () => {
  const extensionSource = await readFile("extension/inject.js", "utf8");
  const context = vm.createContext({
    console,
    document: {},
    setTimeout: () => 0,
  });

  vm.runInContext(extensionSource, context);

  let processedChunk = null;
  // The live Turbopack runtime replaces its initial array queue with this
  // object before the REBUILT input and engine chunks arrive.
  context.TURBOPACK = {
    push(chunk) {
      processedChunk = chunk;
    },
  };

  const inputFactory = vm.runInContext(
    '(e=>{function read(){return {input:{x:t,y:r,turn:o,intake:l,score:u,outtake:c,climb:f,block:d,stow:h,fieldRelative:el}}}})',
    context,
  );
  const engineFactory = vm.runInContext(
    `(t=>{"use strict";var e=t.i(2960),i=t.i(1721),s=t.i(2849);
      class C{update(){let S=(0,n.deadzone)(s.turn)*c.turnRate*n.DRIVER_TURN_SHARE}}
      class A{update(){a&&"teleop"===this.mode&&this.drive.sticks(t.y,-t.x,t.turn);let r=this.drive.periodic(this.pose,s,this.mode);this.drive.acceptTeleopInput(t.y,-t.x,t.turn,"teleop"===this.mode)}}
    })`,
    context,
  );
  const halloweenInputFactory = vm.runInContext(
    '(e=>{function read(){return {input:{x:t,y:r,turn:o,intake:c,score:h,outtake:E,climb:U,block:P,stow:D,fieldRelative:T},ui:{gamepadConnected:!!Y}}}})',
    context,
  );
  const halloweenEngineFactory = vm.runInContext(
    `(t=>{"use strict";var e=t.i(2960),i=t.i(1721),s=t.i(2849),a=t.i(49220),n=t.i(93734),h=t.i(40932);
      class M{update(){a&&"teleop"===this.mode&&this.drive.sticks(t.y,-t.x,t.turn);let n=this.drive.periodic(this.pose,s,this.mode);this.drive.acceptTeleopInput(t.y,-t.x,t.turn,"teleop"===this.mode)}}
      class C{update(){let I=(0,h.deadzone)(r.turn)*p.turnRate*h.DRIVER_TURN_SHARE}}
    })`,
    context,
  );

  context.TURBOPACK.push([
    inputFactory,
    engineFactory,
    halloweenInputFactory,
    halloweenEngineFactory,
  ]);

  assert.equal(context.__copySimHeadingPatch.input, true);
  assert.equal(context.__copySimHeadingPatch.engine, true);
  assert.equal(context.__copySimHeadingPatch.worker, false);
  assert.equal(context.__copySimHeadingPatch.workerEngine, false);
  assert.match(
    Function.prototype.toString.call(processedChunk[0]),
    /headingX:\(globalThis\.__copySimHeadingPatch\.selectedGamepad/,
  );
  assert.match(
    Function.prototype.toString.call(processedChunk[1]),
    /function __copySimHeadingTarget/,
  );
  assert.match(
    Function.prototype.toString.call(processedChunk[1]),
    /Math\.atan2\(-s,-a\)\+Math\.PI/,
    "the simulator's intake side must be treated as the robot front",
  );
  assert.match(
    Function.prototype.toString.call(processedChunk[2]),
    /selectedGamepad=!!Y/,
    "the Halloween-build input module must be patched",
  );
  assert.match(
    Function.prototype.toString.call(processedChunk[3]),
    /I=__copySimHeadingOrTurn\(this,r,u\.heading/,
    "the Halloween-build generic controller must be patched",
  );
  assert.match(
    Function.prototype.toString.call(processedChunk[3]),
    /!t\.score&&"DEFAULT_STATE"===this\.wanted/,
    "2910 must yield heading control to its built-in hub aim while scoring",
  );
});

test("the extension manifest is restricted to the real REBUILT origin", async () => {
  const manifest = JSON.parse(await readFile("extension/manifest.json", "utf8"));
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://rebuilt.frsim.com/*",
  ]);
  assert.equal(manifest.content_scripts[0].world, "MAIN");
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.version, "1.0.10");
});

test("the rebuilt simulation Worker is wrapped before it loads", async () => {
  const extensionSource = await readFile("extension/inject.js", "utf8");
  let workerBlob;
  class FakeURL extends URL {
    static createObjectURL(blob) {
      workerBlob = blob;
      return "blob:https://rebuilt.frsim.com/test-worker";
    }
    static revokeObjectURL() {}
  }
  class FakeWorker {
    constructor(url, options) {
      this.url = String(url);
      this.options = options;
    }
    addEventListener() {}
    postMessage(message, transferOrOptions) {
      this.messages ??= [];
      this.messages.push(message);
      this.sent = message;
      this.transferOrOptions = transferOrOptions;
    }
  }
  const context = vm.createContext({
    Blob,
    URL: FakeURL,
    Worker: FakeWorker,
    console,
    document: {},
    location: { href: "https://rebuilt.frsim.com/play" },
    setTimeout: () => 0,
  });

  vm.runInContext(extensionSource, context);
  const worker = new context.Worker(
    "https://rebuilt.frsim.com/worker.js#params=test",
    { name: "rebuilt-sim" },
  );

  assert.equal(context.__copySimHeadingPatch.worker, true);
  assert.match(worker.url, /^blob:/);
  assert.match(worker.url, /#params=test$/);
  const wrapperSource = await workerBlob.text();
  assert.match(
    wrapperSource,
    /new URL\(String\(url\),__copySimWorkerOrigin\+"\/"\)\.href/,
    "root-relative dynamic chunks must be resolved against the REBUILT origin",
  );
  assert.match(
    wrapperSource,
    /resolved=new URL\(String\(input\),__copySimWorkerOrigin\+"\/"\)\.href/,
    "root-relative WebAssembly assets must be fetched from the REBUILT origin",
  );
  assert.match(wrapperSource, /__copySimHeadingAxes/);

  context.__copySimHeadingPatch.selectedGamepad = true;
  context.__copySimHeadingPatch.axisX = -0.99;
  context.__copySimHeadingPatch.axisY = 0.15;
  worker.postMessage({ t: "input", input: { x: 0.25, turn: 0 } });
  assert.deepEqual(
    { ...worker.messages[0] },
    { t: "__copySimHeadingAxes", x: -0.99, y: 0.15 },
  );
  assert.deepEqual(
    { ...worker.sent.input },
    { x: 0.25, turn: 0, headingX: -0.99, headingY: 0.15 },
  );
  assert.equal(context.__copySimHeadingPatch.handoffFrames, 1);
});
