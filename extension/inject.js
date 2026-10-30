(() => {
  "use strict";

  const status = {
    input: false,
    engine: false,
    worker: false,
    workerEngine: false,
    inputFrames: 0,
    selectedGamepad: false,
    axisX: null,
    axisY: null,
    workerFrames: 0,
    workerHeadingX: null,
    workerHeadingY: null,
    workerMagnitude: null,
    workerEngaged: false,
    handoffFrames: 0,
  };
  globalThis.__copySimHeadingPatch = status;

  // This function is deliberately self-contained. Its source is also installed
  // inside REBUILT's simulation Worker, where the robot controllers actually run.
  function installTurbopackPatch(scope, patchStatus) {
    const inputVariants = [
      {
        marker:
          "turn:o,intake:l,score:u,outtake:c,climb:f,block:d,stow:h,fieldRelative:el",
        replacement:
          "turn:o,headingX:(globalThis.__copySimHeadingPatch.selectedGamepad=!!S,S?(globalThis.__copySimHeadingPatch.inputFrames++,globalThis.__copySimHeadingPatch.axisX=S.axes[2]??0,globalThis.__copySimHeadingPatch.axisY=S.axes[3]??0,globalThis.__copySimHeadingPatch.axisX):void 0),headingY:S?globalThis.__copySimHeadingPatch.axisY:void 0,intake:l,score:u,outtake:c,climb:f,block:d,stow:h,fieldRelative:el",
      },
      {
        marker:
          "turn:o,intake:c,score:h,outtake:E,climb:U,block:P,stow:D,fieldRelative:T",
        replacement:
          "turn:o,headingX:(globalThis.__copySimHeadingPatch.selectedGamepad=!!Y,Y?(globalThis.__copySimHeadingPatch.inputFrames++,globalThis.__copySimHeadingPatch.axisX=Y.axes[2]??0,globalThis.__copySimHeadingPatch.axisY=Y.axes[3]??0,globalThis.__copySimHeadingPatch.axisX):void 0),headingY:Y?globalThis.__copySimHeadingPatch.axisY:void 0,intake:c,score:h,outtake:E,climb:U,block:P,stow:D,fieldRelative:T",
      },
    ];

    const engineStart = 't=>{"use strict";';
    const headingHelpers = String.raw`
function __copySimWrap(t){let e=2*Math.PI;return t-=Math.trunc((t+Math.PI)/e)*e,t-=Math.trunc((t-Math.PI)/e)*e,t}
function __copySimReport(i,r,s,a){let n=globalThis.__copySimWorkerDebug;if(!n)return;n.frames++,n.headingX=s,n.headingY=a,n.yaw=i,n.magnitude=r,n.engaged=r>.9;let o=performance.now();o-n.last>250&&(n.last=o,postMessage({t:"__copySimHeadingDebug",debug:{frames:n.frames,headingX:n.headingX,headingY:n.headingY,yaw:n.yaw,magnitude:n.magnitude,engaged:n.engaged}}))}
function __copySimHeadingTarget(t,e,i){let h=globalThis.__copySimHeadingAxes,s=h?.active?h.x:e.headingX??0,a=h?.active?h.y:e.headingY??0,r=Math.hypot(s,a);if(__copySimReport(i,r,s,a),!(r>.9))return t.__copySimHeadingEngaged=!1,t.__copySimHeadingError=0,t.__copySimLastStick=void 0,t.__copySimLastYaw=void 0,null;let n=__copySimWrap(Math.atan2(-s,-a)+Math.PI+("red"===t.alliance?Math.PI:0));return t.__copySimHeadingEngaged?t.__copySimHeadingError+=__copySimWrap(n-t.__copySimLastStick)-__copySimWrap(i-t.__copySimLastYaw):(t.__copySimHeadingEngaged=!0,t.__copySimHeadingError=__copySimWrap(n-i)),Math.abs(t.__copySimHeadingError)>2*Math.PI&&(t.__copySimHeadingError-=2*Math.PI*Math.sign(t.__copySimHeadingError)),t.__copySimLastStick=n,t.__copySimLastYaw=i,__copySimWrap(i+Math.max(-170*Math.PI/180,Math.min(170*Math.PI/180,t.__copySimHeadingError)))}
function __copySimHeadingOmega(t,e,i,s,a){let r=__copySimHeadingTarget(t,e,i);if(null===r)return t.__copySimHeadingPreviousError=void 0,t.__copySimHeadingLastTime=s,0;let n=__copySimWrap(r-i),o=Number.isFinite(t.__copySimHeadingLastTime)?s-t.__copySimHeadingLastTime:0,h=o>0&&o<.25&&Number.isFinite(t.__copySimHeadingPreviousError)?__copySimWrap(n-t.__copySimHeadingPreviousError)/o:0,l=3.5*n+.09*h;return t.__copySimHeadingPreviousError=n,t.__copySimHeadingLastTime=s,Math.max(-a,Math.min(a,l))}
function __copySimHeadingOrTurn(t,e,i,s,a,r){let n=globalThis.__copySimHeadingAxes;return n?.active||null!=e.headingX&&null!=e.headingY?__copySimHeadingOmega(t,e,i,s,a):(__copySimReport(i,0,null,null),r)}
`;

    const genericVariants = [
      {
        marker:
          "S=(0,n.deadzone)(s.turn)*c.turnRate*n.DRIVER_TURN_SHARE",
        replacement:
          "S=__copySimHeadingOrTurn(this,s,d.heading,i.t,c.turnRate*n.DRIVER_TURN_SHARE,(0,n.deadzone)(s.turn)*c.turnRate*n.DRIVER_TURN_SHARE)",
      },
      {
        marker:
          "I=(0,h.deadzone)(r.turn)*p.turnRate*h.DRIVER_TURN_SHARE",
        replacement:
          "I=__copySimHeadingOrTurn(this,r,u.heading,i.t,p.turnRate*h.DRIVER_TURN_SHARE,(0,h.deadzone)(r.turn)*p.turnRate*h.DRIVER_TURN_SHARE)",
      },
    ];

    const reblitzVariants = [
      {
        marker:
          'a&&"teleop"===this.mode&&this.drive.sticks(t.y,-t.x,t.turn);let r=this.drive.periodic(this.pose,s,this.mode);',
        replacement:
          'a&&"teleop"===this.mode&&(this.drive.sticks(t.y,-t.x,!t.score&&"DEFAULT_STATE"===this.wanted&&(globalThis.__copySimHeadingAxes?.active||null!=t.headingX)?0:t.turn),!t.score&&"DEFAULT_STATE"===this.wanted&&(globalThis.__copySimHeadingAxes?.active||null!=t.headingX)&&(()=>{let e=__copySimHeadingTarget(this,t,this.pose.heading);null===e?this.drive.setWanted("TELEOP"):this.drive.setTargetRotationWithLimitedTranslation(e,i.TELEOP.velocityCoefficient)})());let r=this.drive.periodic(this.pose,s,this.mode);',
      },
      {
        marker:
          'a&&"teleop"===this.mode&&this.drive.sticks(t.y,-t.x,t.turn);let n=this.drive.periodic(this.pose,s,this.mode);',
        replacement:
          'a&&"teleop"===this.mode&&(this.drive.sticks(t.y,-t.x,!t.score&&"DEFAULT_STATE"===this.wanted&&(globalThis.__copySimHeadingAxes?.active||null!=t.headingX)?0:t.turn),!t.score&&"DEFAULT_STATE"===this.wanted&&(globalThis.__copySimHeadingAxes?.active||null!=t.headingX)&&(()=>{let e=__copySimHeadingTarget(this,t,this.pose.heading);null===e?this.drive.setWanted("TELEOP"):this.drive.setTargetRotationWithLimitedTranslation(e,i.TELEOP.velocityCoefficient)})());let n=this.drive.periodic(this.pose,s,this.mode);',
      },
    ];

    const acceptMarker =
      'this.drive.acceptTeleopInput(t.y,-t.x,t.turn,"teleop"===this.mode)';
    const acceptReplacement =
      'this.drive.acceptTeleopInput(t.y,-t.x,!t.score&&(globalThis.__copySimHeadingAxes?.active||null!=t.headingX)?0:t.turn,"teleop"===this.mode)';

    function replaceOnce(source, marker, replacement, label) {
      const first = source.indexOf(marker);
      if (first < 0) throw new Error(`CopySim marker not found: ${label}`);
      if (source.indexOf(marker, first + marker.length) >= 0) {
        throw new Error(`CopySim marker is ambiguous: ${label}`);
      }
      return (
        source.slice(0, first) +
        replacement +
        source.slice(first + marker.length)
      );
    }

    function patchFactory(factory) {
      let source = Function.prototype.toString.call(factory);
      let patched = source;
      let patchedInput = false;
      let patchedEngine = false;

      try {
        const inputVariant = inputVariants.find(({ marker }) =>
          patched.includes(marker),
        );
        if (inputVariant) {
          patched = replaceOnce(
            patched,
            inputVariant.marker,
            inputVariant.replacement,
            "controller input",
          );
          patchedInput = true;
        }

        const genericVariant = genericVariants.find(({ marker }) =>
          patched.includes(marker),
        );
        const reblitzVariant = reblitzVariants.find(({ marker }) =>
          patched.includes(marker),
        );
        if (
          patched.startsWith(engineStart) &&
          genericVariant &&
          reblitzVariant &&
          patched.includes(acceptMarker)
        ) {
          patched = replaceOnce(
            patched,
            engineStart,
            engineStart + headingHelpers,
            "REBUILT engine",
          );
          patched = replaceOnce(
            patched,
            genericVariant.marker,
            genericVariant.replacement,
            "4414/254 generic controller",
          );
          patched = replaceOnce(
            patched,
            reblitzVariant.marker,
            reblitzVariant.replacement,
            "2910 controller",
          );
          patched = replaceOnce(
            patched,
            acceptMarker,
            acceptReplacement,
            "2910 teleop input",
          );
          patchedEngine = true;
        }

        if (patched === source) return factory;
        const replacement = (0, eval)(`(${patched})`);
        if (patchedInput) patchStatus.input = true;
        if (patchedEngine) patchStatus.engine = true;
        return replacement;
      } catch (error) {
        console.error(
          "CopySim could not patch an FRS module; using the original module.",
          error,
        );
        return factory;
      }
    }

    function patchValue(value) {
      if (typeof value === "function") return patchFactory(value);
      if (Array.isArray(value)) return value.map(patchValue);
      return value;
    }

    function wrapTurbopack(target) {
      if (
        (typeof target !== "object" && typeof target !== "function") ||
        target === null ||
        target.__copySimWrapped
      ) {
        return target;
      }
      let downstreamPush =
        typeof target.push === "function"
          ? target.push
          : Array.isArray(target)
            ? Array.prototype.push
            : null;
      if (!downstreamPush) return target;
      Object.defineProperty(target, "__copySimWrapped", { value: true });
      Object.defineProperty(target, "push", {
        configurable: true,
        get() {
          return function (...items) {
            return Reflect.apply(downstreamPush, this, items.map(patchValue));
          };
        },
        set(nextPush) {
          downstreamPush = nextPush;
        },
      });
      return target;
    }

    let turbopackQueue = wrapTurbopack(scope.TURBOPACK ?? []);
    Object.defineProperty(scope, "TURBOPACK", {
      configurable: true,
      get() {
        return turbopackQueue;
      },
      set(nextQueue) {
        turbopackQueue = wrapTurbopack(nextQueue);
      },
    });
  }

  installTurbopackPatch(globalThis, status);

  function showFailure(message) {
    if (document.getElementById("copysim-heading-error")) return;
    const banner = document.createElement("div");
    banner.id = "copysim-heading-error";
    banner.textContent = message;
    Object.assign(banner.style, {
      position: "fixed",
      inset: "0 0 auto 0",
      zIndex: "2147483647",
      padding: "12px",
      background: "#b91c1c",
      color: "white",
      font: "600 14px system-ui",
      textAlign: "center",
    });
    document.documentElement.appendChild(banner);
  }

  // REBUILT performs its physics in a classic Web Worker. Wrapping only the
  // rebuilt-sim worker lets its normal bootstrap and chunks load unchanged,
  // while installing the same Turbopack interceptor before those chunks run.
  if (typeof globalThis.Worker === "function") {
    const NativeWorker = globalThis.Worker;
    globalThis.Worker = new Proxy(NativeWorker, {
      construct(Target, args) {
        const [scriptURL, options] = args;
        if (options?.name !== "rebuilt-sim") {
          return Reflect.construct(Target, args);
        }

        const originalURL = new URL(scriptURL, location.href);
        const workerStatus = { input: false, engine: false };
        const wrapperSource = `
const __copySimWorkerStatus={input:false,engine:false};
globalThis.__copySimWorkerDebug={frames:0,last:0};
globalThis.__copySimHeadingAxes={active:false,x:0,y:0};
globalThis.addEventListener("message",event=>{if(event.data?.t!=="__copySimHeadingAxes")return;event.stopImmediatePropagation();let x=Number(event.data.x),y=Number(event.data.y);globalThis.__copySimHeadingAxes={active:Number.isFinite(x)&&Number.isFinite(y),x:Number.isFinite(x)?x:0,y:Number.isFinite(y)?y:0}},true);
const __copySimWorkerOrigin=${JSON.stringify(originalURL.origin)};
const __copySimNativeImportScripts=globalThis.importScripts.bind(globalThis);
globalThis.importScripts=(...urls)=>__copySimNativeImportScripts(...urls.map(url=>new URL(String(url),__copySimWorkerOrigin+"/").href));
const __copySimNativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,init)=>{if(typeof Request==="function"&&input instanceof Request)return __copySimNativeFetch(input,init);let resolved=input;try{resolved=new URL(String(input),__copySimWorkerOrigin+"/").href}catch{}return __copySimNativeFetch(resolved,init)};
(${installTurbopackPatch.toString()})(globalThis,__copySimWorkerStatus);
importScripts(${JSON.stringify(originalURL.href)});
setTimeout(()=>postMessage({t:"__copySimHeadingPatch",engine:__copySimWorkerStatus.engine}),0);
`;
        const blobURL = URL.createObjectURL(
          new Blob([wrapperSource], { type: "text/javascript" }),
        );
        const wrappedURL = `${blobURL}${originalURL.hash}`;
        const worker = Reflect.construct(Target, [wrappedURL, options]);
        status.worker = true;

        // FRS rebuilds its input object between readInput() and sendInput(),
        // which discards extension-added fields. Attach the two heading axes at
        // the final page-to-worker boundary so every intermediate FRS transform
        // remains untouched.
        const nativePostMessage = worker.postMessage.bind(worker);
        worker.postMessage = function (message, transferOrOptions) {
          let outgoing = message;
          if (
            message?.t === "input" &&
            message.input &&
            status.selectedGamepad
          ) {
            nativePostMessage({
              t: "__copySimHeadingAxes",
              x: status.axisX,
              y: status.axisY,
            });
            outgoing = {
              ...message,
              input: {
                ...message.input,
                headingX: status.axisX,
                headingY: status.axisY,
              },
            };
            status.handoffFrames++;
          }
          return arguments.length > 1
            ? nativePostMessage(outgoing, transferOrOptions)
            : nativePostMessage(outgoing);
        };

        worker.addEventListener("message", (event) => {
          if (event.data?.t === "__copySimHeadingPatch") {
            event.stopImmediatePropagation();
            workerStatus.engine = !!event.data.engine;
            status.workerEngine = workerStatus.engine;
            if (status.input && status.workerEngine) {
              console.info(
                "CopySim right-stick heading control is active in the simulation worker.",
              );
            }
            return;
          }
          if (event.data?.t !== "__copySimHeadingDebug") return;
          event.stopImmediatePropagation();
          const debug = event.data.debug;
          status.workerFrames = debug.frames;
          status.workerHeadingX = debug.headingX;
          status.workerHeadingY = debug.headingY;
          status.workerMagnitude = debug.magnitude;
          status.workerEngaged = debug.engaged;
        });

        setTimeout(() => URL.revokeObjectURL(blobURL), 60_000);
        setTimeout(() => {
          if (status.input && status.workerEngine) return;
          showFailure(
            `CopySim heading control did not load (input: ${status.input ? "yes" : "no"}, worker: ${status.worker ? "yes" : "no"}, worker engine: ${status.workerEngine ? "yes" : "no"}). Reload once, then update the extension if this remains.`,
          );
        }, 10_000);

        return worker;
      },
    });
  }
})();
