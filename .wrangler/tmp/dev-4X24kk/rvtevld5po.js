var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir4, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count4, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process2 extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process2.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd3) {
    this.#cwd = cwd3;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// .wrangler/tmp/pages-3CQJao/bundledWorker-0.8704842810918971.mjs
import { Writable as Writable2 } from "node:stream";
import { EventEmitter as EventEmitter2 } from "node:events";
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
// @__NO_SIDE_EFFECTS__
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
__name2(createNotImplementedError2, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw /* @__PURE__ */ createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
__name2(notImplemented2, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass2(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass2, "notImplementedClass");
__name2(notImplementedClass2, "notImplementedClass");
var _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
var nodeTiming2 = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry2 = class {
  static {
    __name(this, "PerformanceEntry");
  }
  static {
    __name2(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow2();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow2() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark3 = class PerformanceMark22 extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMark2");
  }
  static {
    __name2(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMeasure");
  }
  static {
    __name2(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  static {
    __name2(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList2 = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  static {
    __name2(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance2 = class {
  static {
    __name(this, "Performance");
  }
  static {
    __name2(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin2;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming2;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming2("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin2) {
      return _performanceNow2();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark3(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure2(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver2 = class {
  static {
    __name(this, "PerformanceObserver");
  }
  static {
    __name2(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
globalThis.performance = performance2;
globalThis.Performance = Performance2;
globalThis.PerformanceEntry = PerformanceEntry2;
globalThis.PerformanceMark = PerformanceMark3;
globalThis.PerformanceMeasure = PerformanceMeasure2;
globalThis.PerformanceObserver = PerformanceObserver2;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
var noop_default2 = Object.assign(() => {
}, { __unenv__: true });
var _console2 = globalThis.console;
var _ignoreErrors2 = true;
var _stderr2 = new Writable2();
var _stdout2 = new Writable2();
var log3 = _console2?.log ?? noop_default2;
var info3 = _console2?.info ?? log3;
var trace3 = _console2?.trace ?? info3;
var debug3 = _console2?.debug ?? log3;
var table3 = _console2?.table ?? log3;
var error3 = _console2?.error ?? log3;
var warn3 = _console2?.warn ?? error3;
var createTask3 = _console2?.createTask ?? /* @__PURE__ */ notImplemented2("console.createTask");
var clear3 = _console2?.clear ?? noop_default2;
var count3 = _console2?.count ?? noop_default2;
var countReset3 = _console2?.countReset ?? noop_default2;
var dir3 = _console2?.dir ?? noop_default2;
var dirxml3 = _console2?.dirxml ?? noop_default2;
var group3 = _console2?.group ?? noop_default2;
var groupEnd3 = _console2?.groupEnd ?? noop_default2;
var groupCollapsed3 = _console2?.groupCollapsed ?? noop_default2;
var profile3 = _console2?.profile ?? noop_default2;
var profileEnd3 = _console2?.profileEnd ?? noop_default2;
var time3 = _console2?.time ?? noop_default2;
var timeEnd3 = _console2?.timeEnd ?? noop_default2;
var timeLog3 = _console2?.timeLog ?? noop_default2;
var timeStamp3 = _console2?.timeStamp ?? noop_default2;
var Console2 = _console2?.Console ?? /* @__PURE__ */ notImplementedClass2("console.Console");
var _times2 = /* @__PURE__ */ new Map();
var _stdoutErrorHandler2 = noop_default2;
var _stderrErrorHandler2 = noop_default2;
var workerdConsole2 = globalThis["console"];
var {
  assert: assert3,
  clear: clear22,
  // @ts-expect-error undocumented public API
  context: context2,
  count: count22,
  countReset: countReset22,
  // @ts-expect-error undocumented public API
  createTask: createTask22,
  debug: debug22,
  dir: dir22,
  dirxml: dirxml22,
  error: error22,
  group: group22,
  groupCollapsed: groupCollapsed22,
  groupEnd: groupEnd22,
  info: info22,
  log: log22,
  profile: profile22,
  profileEnd: profileEnd22,
  table: table22,
  time: time22,
  timeEnd: timeEnd22,
  timeLog: timeLog22,
  timeStamp: timeStamp22,
  trace: trace22,
  warn: warn22
} = workerdConsole2;
Object.assign(workerdConsole2, {
  Console: Console2,
  _ignoreErrors: _ignoreErrors2,
  _stderr: _stderr2,
  _stderrErrorHandler: _stderrErrorHandler2,
  _stdout: _stdout2,
  _stdoutErrorHandler: _stdoutErrorHandler2,
  _times: _times2
});
var console_default2 = workerdConsole2;
globalThis.console = console_default2;
var hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
  return BigInt(Date.now() * 1e6);
}, "bigint"), "bigint") });
var ReadStream2 = class {
  static {
    __name(this, "ReadStream");
  }
  static {
    __name2(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};
var WriteStream2 = class {
  static {
    __name(this, "WriteStream");
  }
  static {
    __name2(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir32, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env22) {
    return 1;
  }
  hasColors(count32, env22) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};
var NODE_VERSION2 = "22.14.0";
var Process2 = class _Process extends EventEmitter2 {
  static {
    __name(this, "_Process");
  }
  static {
    __name2(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream2(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream2(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream2(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd22) {
    this.#cwd = cwd22;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION2}`;
  }
  get versions() {
    return { node: NODE_VERSION2 };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw /* @__PURE__ */ createNotImplementedError2("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw /* @__PURE__ */ createNotImplementedError2("process.getActiveResourcesInfo");
  }
  exit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.exit");
  }
  reallyExit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.reallyExit");
  }
  kill() {
    throw /* @__PURE__ */ createNotImplementedError2("process.kill");
  }
  abort() {
    throw /* @__PURE__ */ createNotImplementedError2("process.abort");
  }
  dlopen() {
    throw /* @__PURE__ */ createNotImplementedError2("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw /* @__PURE__ */ createNotImplementedError2("process.loadEnvFile");
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("process.disconnect");
  }
  cpuUsage() {
    throw /* @__PURE__ */ createNotImplementedError2("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw /* @__PURE__ */ createNotImplementedError2("process.initgroups");
  }
  openStdin() {
    throw /* @__PURE__ */ createNotImplementedError2("process.openStdin");
  }
  assert() {
    throw /* @__PURE__ */ createNotImplementedError2("process.assert");
  }
  binding() {
    throw /* @__PURE__ */ createNotImplementedError2("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name2(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
var globalProcess2 = globalThis["process"];
var getBuiltinModule2 = globalProcess2.getBuiltinModule;
var workerdProcess2 = getBuiltinModule2("node:process");
var unenvProcess2 = new Process2({
  env: globalProcess2.env,
  hrtime: hrtime4,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess2.nextTick
});
var { exit: exit2, features: features2, platform: platform2 } = workerdProcess2;
var {
  _channel: _channel2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _disconnect: _disconnect2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _handleQueue: _handleQueue2,
  _kill: _kill2,
  _linkedBinding: _linkedBinding2,
  _maxListeners: _maxListeners2,
  _pendingMessage: _pendingMessage2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _send: _send2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  assert: assert22,
  availableMemory: availableMemory2,
  binding: binding2,
  channel: channel2,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  disconnect: disconnect2,
  dlopen: dlopen2,
  domain: domain2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exitCode: exitCode2,
  finalization: finalization2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getMaxListeners: getMaxListeners2,
  getuid: getuid2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  hrtime: hrtime32,
  initgroups: initgroups2,
  kill: kill2,
  listenerCount: listenerCount2,
  listeners: listeners2,
  loadEnvFile: loadEnvFile2,
  mainModule: mainModule2,
  memoryUsage: memoryUsage2,
  moduleLoadList: moduleLoadList2,
  nextTick: nextTick2,
  off: off2,
  on: on2,
  once: once2,
  openStdin: openStdin2,
  permission: permission2,
  pid: pid2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  reallyExit: reallyExit2,
  ref: ref2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  send: send2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  setuid: setuid2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  sourceMapsEnabled: sourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  throwDeprecation: throwDeprecation2,
  title: title2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  unref: unref2,
  uptime: uptime2,
  version: version2,
  versions: versions2
} = unenvProcess2;
var _process2 = {
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  loadEnvFile: loadEnvFile2,
  sourceMapsEnabled: sourceMapsEnabled2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  availableMemory: availableMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  disconnect: disconnect2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exit: exit2,
  finalization: finalization2,
  features: features2,
  getBuiltinModule: getBuiltinModule2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getMaxListeners: getMaxListeners2,
  hrtime: hrtime32,
  kill: kill2,
  listeners: listeners2,
  listenerCount: listenerCount2,
  memoryUsage: memoryUsage2,
  nextTick: nextTick2,
  on: on2,
  off: off2,
  once: once2,
  pid: pid2,
  platform: platform2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  title: title2,
  throwDeprecation: throwDeprecation2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  uptime: uptime2,
  version: version2,
  versions: versions2,
  // @ts-expect-error old API
  domain: domain2,
  initgroups: initgroups2,
  moduleLoadList: moduleLoadList2,
  reallyExit: reallyExit2,
  openStdin: openStdin2,
  assert: assert22,
  binding: binding2,
  send: send2,
  exitCode: exitCode2,
  channel: channel2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getuid: getuid2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setuid: setuid2,
  permission: permission2,
  mainModule: mainModule2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _maxListeners: _maxListeners2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _kill: _kill2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  _disconnect: _disconnect2,
  _handleQueue: _handleQueue2,
  _pendingMessage: _pendingMessage2,
  _channel: _channel2,
  _send: _send2,
  _linkedBinding: _linkedBinding2
};
var process_default2 = _process2;
globalThis.process = process_default2;
var F = /* @__PURE__ */ __name2((e, t, r) => (s, n) => {
  let i = -1;
  return a(0);
  async function a(l) {
    if (l <= i) throw new Error("next() called multiple times");
    i = l;
    let o, c = false, h;
    if (e[l] ? (h = e[l][0][0], s.req.routeIndex = l) : h = l === e.length && n || void 0, h) try {
      o = await h(s, () => a(l + 1));
    } catch (u) {
      if (u instanceof Error && t) s.error = u, o = await t(u, s), c = true;
      else throw u;
    }
    else s.finalized === false && r && (o = await r(s));
    return o && (s.finalized === false || c) && (s.res = o), s;
  }
  __name(a, "a");
  __name2(a, "a");
}, "F");
var le = /* @__PURE__ */ Symbol();
var he = /* @__PURE__ */ __name2(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: r = false, dot: s = false } = t, i = (e instanceof Q ? e.raw.headers : e.headers).get("Content-Type");
  return i?.startsWith("multipart/form-data") || i?.startsWith("application/x-www-form-urlencoded") ? ue(e, { all: r, dot: s }) : {};
}, "he");
async function ue(e, t) {
  const r = await e.formData();
  return r ? de(r, t) : {};
}
__name(ue, "ue");
__name2(ue, "ue");
function de(e, t) {
  const r = /* @__PURE__ */ Object.create(null);
  return e.forEach((s, n) => {
    t.all || n.endsWith("[]") ? fe(r, n, s) : r[n] = s;
  }), t.dot && Object.entries(r).forEach(([s, n]) => {
    s.includes(".") && (pe(r, s, n), delete r[s]);
  }), r;
}
__name(de, "de");
__name2(de, "de");
var fe = /* @__PURE__ */ __name2((e, t, r) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(r) : e[t] = [e[t], r] : t.endsWith("[]") ? e[t] = [r] : e[t] = r;
}, "fe");
var pe = /* @__PURE__ */ __name2((e, t, r) => {
  let s = e;
  const n = t.split(".");
  n.forEach((i, a) => {
    a === n.length - 1 ? s[i] = r : ((!s[i] || typeof s[i] != "object" || Array.isArray(s[i]) || s[i] instanceof File) && (s[i] = /* @__PURE__ */ Object.create(null)), s = s[i]);
  });
}, "pe");
var U = /* @__PURE__ */ __name2((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "U");
var ge = /* @__PURE__ */ __name2((e) => {
  const { groups: t, path: r } = me(e), s = U(r);
  return ve(s, t);
}, "ge");
var me = /* @__PURE__ */ __name2((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (r, s) => {
    const n = `@${s}`;
    return t.push([n, r]), n;
  }), { groups: t, path: e };
}, "me");
var ve = /* @__PURE__ */ __name2((e, t) => {
  for (let r = t.length - 1; r >= 0; r--) {
    const [s] = t[r];
    for (let n = e.length - 1; n >= 0; n--) if (e[n].includes(s)) {
      e[n] = e[n].replace(s, t[r][1]);
      break;
    }
  }
  return e;
}, "ve");
var T = {};
var we = /* @__PURE__ */ __name2((e, t) => {
  if (e === "*") return "*";
  const r = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (r) {
    const s = `${e}#${t}`;
    return T[s] || (r[2] ? T[s] = t && t[0] !== ":" && t[0] !== "*" ? [s, r[1], new RegExp(`^${r[2]}(?=/${t})`)] : [e, r[1], new RegExp(`^${r[2]}$`)] : T[s] = [e, r[1], true]), T[s];
  }
  return null;
}, "we");
var L = /* @__PURE__ */ __name2((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (r) => {
      try {
        return t(r);
      } catch {
        return r;
      }
    });
  }
}, "L");
var ye = /* @__PURE__ */ __name2((e) => L(e, decodeURI), "ye");
var G = /* @__PURE__ */ __name2((e) => {
  const t = e.url, r = t.indexOf("/", t.indexOf(":") + 4);
  let s = r;
  for (; s < t.length; s++) {
    const n = t.charCodeAt(s);
    if (n === 37) {
      const i = t.indexOf("?", s), a = t.indexOf("#", s), l = i === -1 ? a === -1 ? void 0 : a : a === -1 ? i : Math.min(i, a), o = t.slice(r, l);
      return ye(o.includes("%25") ? o.replace(/%25/g, "%2525") : o);
    } else if (n === 63 || n === 35) break;
  }
  return t.slice(r, s);
}, "G");
var Ee = /* @__PURE__ */ __name2((e) => {
  const t = G(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "Ee");
var _ = /* @__PURE__ */ __name2((e, t, ...r) => (r.length && (t = _(t, ...r)), `${e?.[0] === "/" ? "" : "/"}${e}${t === "/" ? "" : `${e?.at(-1) === "/" ? "" : "/"}${t?.[0] === "/" ? t.slice(1) : t}`}`), "_");
var K = /* @__PURE__ */ __name2((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":")) return null;
  const t = e.split("/"), r = [];
  let s = "";
  return t.forEach((n) => {
    if (n !== "" && !/\:/.test(n)) s += "/" + n;
    else if (/\:/.test(n)) if (/\?/.test(n)) {
      r.length === 0 && s === "" ? r.push("/") : r.push(s);
      const i = n.replace("?", "");
      s += "/" + i, r.push(s);
    } else s += "/" + n;
  }), r.filter((n, i, a) => a.indexOf(n) === i);
}, "K");
var $ = /* @__PURE__ */ __name2((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? L(e, z) : e) : e, "$");
var V = /* @__PURE__ */ __name2((e, t, r) => {
  let s;
  if (!r && t && !/[%+]/.test(t)) {
    let a = e.indexOf("?", 8);
    if (a === -1) return;
    for (e.startsWith(t, a + 1) || (a = e.indexOf(`&${t}`, a + 1)); a !== -1; ) {
      const l = e.charCodeAt(a + t.length + 1);
      if (l === 61) {
        const o = a + t.length + 2, c = e.indexOf("&", o);
        return $(e.slice(o, c === -1 ? void 0 : c));
      } else if (l == 38 || isNaN(l)) return "";
      a = e.indexOf(`&${t}`, a + 1);
    }
    if (s = /[%+]/.test(e), !s) return;
  }
  const n = {};
  s ??= /[%+]/.test(e);
  let i = e.indexOf("?", 8);
  for (; i !== -1; ) {
    const a = e.indexOf("&", i + 1);
    let l = e.indexOf("=", i);
    l > a && a !== -1 && (l = -1);
    let o = e.slice(i + 1, l === -1 ? a === -1 ? void 0 : a : l);
    if (s && (o = $(o)), i = a, o === "") continue;
    let c;
    l === -1 ? c = "" : (c = e.slice(l + 1, a === -1 ? void 0 : a), s && (c = $(c))), r ? (n[o] && Array.isArray(n[o]) || (n[o] = []), n[o].push(c)) : n[o] ??= c;
  }
  return t ? n[t] : n;
}, "V");
var Re = V;
var be = /* @__PURE__ */ __name2((e, t) => V(e, t, true), "be");
var z = decodeURIComponent;
var q = /* @__PURE__ */ __name2((e) => L(e, z), "q");
var Q = class {
  static {
    __name(this, "Q");
  }
  static {
    __name2(this, "Q");
  }
  raw;
  #t;
  #e;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(e, t = "/", r = [[]]) {
    this.raw = e, this.path = t, this.#e = r, this.#t = {};
  }
  param(e) {
    return e ? this.#r(e) : this.#i();
  }
  #r(e) {
    const t = this.#e[0][this.routeIndex][1][e], r = this.#n(t);
    return r && /\%/.test(r) ? q(r) : r;
  }
  #i() {
    const e = {}, t = Object.keys(this.#e[0][this.routeIndex][1]);
    for (const r of t) {
      const s = this.#n(this.#e[0][this.routeIndex][1][r]);
      s !== void 0 && (e[r] = /\%/.test(s) ? q(s) : s);
    }
    return e;
  }
  #n(e) {
    return this.#e[1] ? this.#e[1][e] : e;
  }
  query(e) {
    return Re(this.url, e);
  }
  queries(e) {
    return be(this.url, e);
  }
  header(e) {
    if (e) return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((r, s) => {
      t[s] = r;
    }), t;
  }
  async parseBody(e) {
    return this.bodyCache.parsedBody ??= await he(this, e);
  }
  #s = /* @__PURE__ */ __name2((e) => {
    const { bodyCache: t, raw: r } = this, s = t[e];
    if (s) return s;
    const n = Object.keys(t)[0];
    return n ? t[n].then((i) => (n === "json" && (i = JSON.stringify(i)), new Response(i)[e]())) : t[e] = r[e]();
  }, "#s");
  json() {
    return this.#s("text").then((e) => JSON.parse(e));
  }
  text() {
    return this.#s("text");
  }
  arrayBuffer() {
    return this.#s("arrayBuffer");
  }
  blob() {
    return this.#s("blob");
  }
  formData() {
    return this.#s("formData");
  }
  addValidatedData(e, t) {
    this.#t[e] = t;
  }
  valid(e) {
    return this.#t[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [le]() {
    return this.#e;
  }
  get matchedRoutes() {
    return this.#e[0].map(([[, e]]) => e);
  }
  get routePath() {
    return this.#e[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
};
var xe = { Stringify: 1 };
var X = /* @__PURE__ */ __name2(async (e, t, r, s, n) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const i = e.callbacks;
  return i?.length ? (n ? n[0] += e : n = [e], Promise.all(i.map((l) => l({ phase: t, buffer: n, context: s }))).then((l) => Promise.all(l.filter(Boolean).map((o) => X(o, t, false, s, n))).then(() => n[0]))) : Promise.resolve(e);
}, "X");
var _e = "text/plain; charset=UTF-8";
var M = /* @__PURE__ */ __name2((e, t) => ({ "Content-Type": e, ...t }), "M");
var Oe = class {
  static {
    __name(this, "Oe");
  }
  static {
    __name2(this, "Oe");
  }
  #t;
  #e;
  env = {};
  #r;
  finalized = false;
  error;
  #i;
  #n;
  #s;
  #h;
  #c;
  #l;
  #o;
  #u;
  #d;
  constructor(e, t) {
    this.#t = e, t && (this.#n = t.executionCtx, this.env = t.env, this.#l = t.notFoundHandler, this.#d = t.path, this.#u = t.matchResult);
  }
  get req() {
    return this.#e ??= new Q(this.#t, this.#d, this.#u), this.#e;
  }
  get event() {
    if (this.#n && "respondWith" in this.#n) return this.#n;
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (this.#n) return this.#n;
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return this.#s ||= new Response(null, { headers: this.#o ??= new Headers() });
  }
  set res(e) {
    if (this.#s && e) {
      e = new Response(e.body, e);
      for (const [t, r] of this.#s.headers.entries()) if (t !== "content-type") if (t === "set-cookie") {
        const s = this.#s.headers.getSetCookie();
        e.headers.delete("set-cookie");
        for (const n of s) e.headers.append("set-cookie", n);
      } else e.headers.set(t, r);
    }
    this.#s = e, this.finalized = true;
  }
  render = /* @__PURE__ */ __name2((...e) => (this.#c ??= (t) => this.html(t), this.#c(...e)), "render");
  setLayout = /* @__PURE__ */ __name2((e) => this.#h = e, "setLayout");
  getLayout = /* @__PURE__ */ __name2(() => this.#h, "getLayout");
  setRenderer = /* @__PURE__ */ __name2((e) => {
    this.#c = e;
  }, "setRenderer");
  header = /* @__PURE__ */ __name2((e, t, r) => {
    this.finalized && (this.#s = new Response(this.#s.body, this.#s));
    const s = this.#s ? this.#s.headers : this.#o ??= new Headers();
    t === void 0 ? s.delete(e) : r?.append ? s.append(e, t) : s.set(e, t);
  }, "header");
  status = /* @__PURE__ */ __name2((e) => {
    this.#i = e;
  }, "status");
  set = /* @__PURE__ */ __name2((e, t) => {
    this.#r ??= /* @__PURE__ */ new Map(), this.#r.set(e, t);
  }, "set");
  get = /* @__PURE__ */ __name2((e) => this.#r ? this.#r.get(e) : void 0, "get");
  get var() {
    return this.#r ? Object.fromEntries(this.#r) : {};
  }
  #a(e, t, r) {
    const s = this.#s ? new Headers(this.#s.headers) : this.#o ?? new Headers();
    if (typeof t == "object" && "headers" in t) {
      const i = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
      for (const [a, l] of i) a.toLowerCase() === "set-cookie" ? s.append(a, l) : s.set(a, l);
    }
    if (r) for (const [i, a] of Object.entries(r)) if (typeof a == "string") s.set(i, a);
    else {
      s.delete(i);
      for (const l of a) s.append(i, l);
    }
    const n = typeof t == "number" ? t : t?.status ?? this.#i;
    return new Response(e, { status: n, headers: s });
  }
  newResponse = /* @__PURE__ */ __name2((...e) => this.#a(...e), "newResponse");
  body = /* @__PURE__ */ __name2((e, t, r) => this.#a(e, t, r), "body");
  text = /* @__PURE__ */ __name2((e, t, r) => !this.#o && !this.#i && !t && !r && !this.finalized ? new Response(e) : this.#a(e, t, M(_e, r)), "text");
  json = /* @__PURE__ */ __name2((e, t, r) => this.#a(JSON.stringify(e), t, M("application/json", r)), "json");
  html = /* @__PURE__ */ __name2((e, t, r) => {
    const s = /* @__PURE__ */ __name2((n) => this.#a(n, t, M("text/html; charset=UTF-8", r)), "s");
    return typeof e == "object" ? X(e, xe.Stringify, false, {}).then(s) : s(e);
  }, "html");
  redirect = /* @__PURE__ */ __name2((e, t) => {
    const r = String(e);
    return this.header("Location", /[^\x00-\xFF]/.test(r) ? encodeURI(r) : r), this.newResponse(null, t ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name2(() => (this.#l ??= () => new Response(), this.#l(this)), "notFound");
};
var p = "ALL";
var Ae = "all";
var je = ["get", "post", "put", "delete", "options", "patch"];
var Y = "Can not add a route since the matcher is already built.";
var J = class extends Error {
  static {
    __name(this, "J");
  }
  static {
    __name2(this, "J");
  }
};
var Se = "__COMPOSED_HANDLER";
var Pe = /* @__PURE__ */ __name2((e) => e.text("404 Not Found", 404), "Pe");
var B = /* @__PURE__ */ __name2((e, t) => {
  if ("getResponse" in e) {
    const r = e.getResponse();
    return t.newResponse(r.body, r);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "B");
var Ce = class Z {
  static {
    __name(this, "Z");
  }
  static {
    __name2(this, "Z");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #t = "/";
  routes = [];
  constructor(t = {}) {
    [...je, Ae].forEach((i) => {
      this[i] = (a, ...l) => (typeof a == "string" ? this.#t = a : this.#i(i, this.#t, a), l.forEach((o) => {
        this.#i(i, this.#t, o);
      }), this);
    }), this.on = (i, a, ...l) => {
      for (const o of [a].flat()) {
        this.#t = o;
        for (const c of [i].flat()) l.map((h) => {
          this.#i(c.toUpperCase(), this.#t, h);
        });
      }
      return this;
    }, this.use = (i, ...a) => (typeof i == "string" ? this.#t = i : (this.#t = "*", a.unshift(i)), a.forEach((l) => {
      this.#i(p, this.#t, l);
    }), this);
    const { strict: s, ...n } = t;
    Object.assign(this, n), this.getPath = s ?? true ? t.getPath ?? G : Ee;
  }
  #e() {
    const t = new Z({ router: this.router, getPath: this.getPath });
    return t.errorHandler = this.errorHandler, t.#r = this.#r, t.routes = this.routes, t;
  }
  #r = Pe;
  errorHandler = B;
  route(t, r) {
    const s = this.basePath(t);
    return r.routes.map((n) => {
      let i;
      r.errorHandler === B ? i = n.handler : (i = /* @__PURE__ */ __name2(async (a, l) => (await F([], r.errorHandler)(a, () => n.handler(a, l))).res, "i"), i[Se] = n.handler), s.#i(n.method, n.path, i);
    }), this;
  }
  basePath(t) {
    const r = this.#e();
    return r._basePath = _(this._basePath, t), r;
  }
  onError = /* @__PURE__ */ __name2((t) => (this.errorHandler = t, this), "onError");
  notFound = /* @__PURE__ */ __name2((t) => (this.#r = t, this), "notFound");
  mount(t, r, s) {
    let n, i;
    s && (typeof s == "function" ? i = s : (i = s.optionHandler, s.replaceRequest === false ? n = /* @__PURE__ */ __name2((o) => o, "n") : n = s.replaceRequest));
    const a = i ? (o) => {
      const c = i(o);
      return Array.isArray(c) ? c : [c];
    } : (o) => {
      let c;
      try {
        c = o.executionCtx;
      } catch {
      }
      return [o.env, c];
    };
    n ||= (() => {
      const o = _(this._basePath, t), c = o === "/" ? 0 : o.length;
      return (h) => {
        const u = new URL(h.url);
        return u.pathname = u.pathname.slice(c) || "/", new Request(u, h);
      };
    })();
    const l = /* @__PURE__ */ __name2(async (o, c) => {
      const h = await r(n(o.req.raw), ...a(o));
      if (h) return h;
      await c();
    }, "l");
    return this.#i(p, _(t, "*"), l), this;
  }
  #i(t, r, s) {
    t = t.toUpperCase(), r = _(this._basePath, r);
    const n = { basePath: this._basePath, path: r, method: t, handler: s };
    this.router.add(t, r, [s, n]), this.routes.push(n);
  }
  #n(t, r) {
    if (t instanceof Error) return this.errorHandler(t, r);
    throw t;
  }
  #s(t, r, s, n) {
    if (n === "HEAD") return (async () => new Response(null, await this.#s(t, r, s, "GET")))();
    const i = this.getPath(t, { env: s }), a = this.router.match(n, i), l = new Oe(t, { path: i, matchResult: a, env: s, executionCtx: r, notFoundHandler: this.#r });
    if (a[0].length === 1) {
      let c;
      try {
        c = a[0][0][0][0](l, async () => {
          l.res = await this.#r(l);
        });
      } catch (h) {
        return this.#n(h, l);
      }
      return c instanceof Promise ? c.then((h) => h || (l.finalized ? l.res : this.#r(l))).catch((h) => this.#n(h, l)) : c ?? this.#r(l);
    }
    const o = F(a[0], this.errorHandler, this.#r);
    return (async () => {
      try {
        const c = await o(l);
        if (!c.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return c.res;
      } catch (c) {
        return this.#n(c, l);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name2((t, ...r) => this.#s(t, r[1], r[0], t.method), "fetch");
  request = /* @__PURE__ */ __name2((t, r, s, n) => t instanceof Request ? this.fetch(r ? new Request(t, r) : t, s, n) : (t = t.toString(), this.fetch(new Request(/^https?:\/\//.test(t) ? t : `http://localhost${_("/", t)}`, r), s, n)), "request");
  fire = /* @__PURE__ */ __name2(() => {
    addEventListener("fetch", (t) => {
      t.respondWith(this.#s(t.request, t, void 0, t.request.method));
    });
  }, "fire");
};
var ee = [];
function He(e, t) {
  const r = this.buildAllMatchers(), s = /* @__PURE__ */ __name2(((n, i) => {
    const a = r[n] || r[p], l = a[2][i];
    if (l) return l;
    const o = i.match(a[0]);
    if (!o) return [[], ee];
    const c = o.indexOf("", 1);
    return [a[1][c], o];
  }), "s");
  return this.match = s, s(e, t);
}
__name(He, "He");
__name2(He, "He");
var k = "[^/]+";
var P = ".*";
var C = "(?:|/.*)";
var O = /* @__PURE__ */ Symbol();
var De = new Set(".\\+*[^]$()");
function Te(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === P || e === C ? 1 : t === P || t === C ? -1 : e === k ? 1 : t === k ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(Te, "Te");
__name2(Te, "Te");
var ke = class I {
  static {
    __name(this, "I");
  }
  static {
    __name2(this, "I");
  }
  #t;
  #e;
  #r = /* @__PURE__ */ Object.create(null);
  insert(t, r, s, n, i) {
    if (t.length === 0) {
      if (this.#t !== void 0) throw O;
      if (i) return;
      this.#t = r;
      return;
    }
    const [a, ...l] = t, o = a === "*" ? l.length === 0 ? ["", "", P] : ["", "", k] : a === "/*" ? ["", "", C] : a.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let c;
    if (o) {
      const h = o[1];
      let u = o[2] || k;
      if (h && o[2] && (u === ".*" || (u = u.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(u)))) throw O;
      if (c = this.#r[u], !c) {
        if (Object.keys(this.#r).some((d) => d !== P && d !== C)) throw O;
        if (i) return;
        c = this.#r[u] = new I(), h !== "" && (c.#e = n.varIndex++);
      }
      !i && h !== "" && s.push([h, c.#e]);
    } else if (c = this.#r[a], !c) {
      if (Object.keys(this.#r).some((h) => h.length > 1 && h !== P && h !== C)) throw O;
      if (i) return;
      c = this.#r[a] = new I();
    }
    c.insert(l, r, s, n, i);
  }
  buildRegExpStr() {
    const r = Object.keys(this.#r).sort(Te).map((s) => {
      const n = this.#r[s];
      return (typeof n.#e == "number" ? `(${s})@${n.#e}` : De.has(s) ? `\\${s}` : s) + n.buildRegExpStr();
    });
    return typeof this.#t == "number" && r.unshift(`#${this.#t}`), r.length === 0 ? "" : r.length === 1 ? r[0] : "(?:" + r.join("|") + ")";
  }
};
var $e = class {
  static {
    __name(this, "$e");
  }
  static {
    __name2(this, "$e");
  }
  #t = { varIndex: 0 };
  #e = new ke();
  insert(e, t, r) {
    const s = [], n = [];
    for (let a = 0; ; ) {
      let l = false;
      if (e = e.replace(/\{[^}]+\}/g, (o) => {
        const c = `@\\${a}`;
        return n[a] = [c, o], a++, l = true, c;
      }), !l) break;
    }
    const i = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let a = n.length - 1; a >= 0; a--) {
      const [l] = n[a];
      for (let o = i.length - 1; o >= 0; o--) if (i[o].indexOf(l) !== -1) {
        i[o] = i[o].replace(l, n[a][1]);
        break;
      }
    }
    return this.#e.insert(i, t, s, this.#t, r), s;
  }
  buildRegExp() {
    let e = this.#e.buildRegExpStr();
    if (e === "") return [/^$/, [], []];
    let t = 0;
    const r = [], s = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (n, i, a) => i !== void 0 ? (r[++t] = Number(i), "$()") : (a !== void 0 && (s[Number(a)] = ++t), "")), [new RegExp(`^${e}`), r, s];
  }
};
var Me = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var te = /* @__PURE__ */ Object.create(null);
function re(e) {
  return te[e] ??= new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, r) => r ? `\\${r}` : "(?:|/.*)")}$`);
}
__name(re, "re");
__name2(re, "re");
function Ie() {
  te = /* @__PURE__ */ Object.create(null);
}
__name(Ie, "Ie");
__name2(Ie, "Ie");
function Le(e) {
  const t = new $e(), r = [];
  if (e.length === 0) return Me;
  const s = e.map((c) => [!/\*|\/:/.test(c[0]), ...c]).sort(([c, h], [u, d]) => c ? 1 : u ? -1 : h.length - d.length), n = /* @__PURE__ */ Object.create(null);
  for (let c = 0, h = -1, u = s.length; c < u; c++) {
    const [d, g, w] = s[c];
    d ? n[g] = [w.map(([m]) => [m, /* @__PURE__ */ Object.create(null)]), ee] : h++;
    let f;
    try {
      f = t.insert(g, h, d);
    } catch (m) {
      throw m === O ? new J(g) : m;
    }
    d || (r[h] = w.map(([m, R]) => {
      const H = /* @__PURE__ */ Object.create(null);
      for (R -= 1; R >= 0; R--) {
        const [D, y] = f[R];
        H[D] = y;
      }
      return [m, H];
    }));
  }
  const [i, a, l] = t.buildRegExp();
  for (let c = 0, h = r.length; c < h; c++) for (let u = 0, d = r[c].length; u < d; u++) {
    const g = r[c][u]?.[1];
    if (!g) continue;
    const w = Object.keys(g);
    for (let f = 0, m = w.length; f < m; f++) g[w[f]] = l[g[w[f]]];
  }
  const o = [];
  for (const c in a) o[c] = r[a[c]];
  return [i, o, n];
}
__name(Le, "Le");
__name2(Le, "Le");
function x(e, t) {
  if (e) {
    for (const r of Object.keys(e).sort((s, n) => n.length - s.length)) if (re(r).test(t)) return [...e[r]];
  }
}
__name(x, "x");
__name2(x, "x");
var Ne = class {
  static {
    __name(this, "Ne");
  }
  static {
    __name2(this, "Ne");
  }
  name = "RegExpRouter";
  #t;
  #e;
  constructor() {
    this.#t = { [p]: /* @__PURE__ */ Object.create(null) }, this.#e = { [p]: /* @__PURE__ */ Object.create(null) };
  }
  add(e, t, r) {
    const s = this.#t, n = this.#e;
    if (!s || !n) throw new Error(Y);
    s[e] || [s, n].forEach((l) => {
      l[e] = /* @__PURE__ */ Object.create(null), Object.keys(l[p]).forEach((o) => {
        l[e][o] = [...l[p][o]];
      });
    }), t === "/*" && (t = "*");
    const i = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const l = re(t);
      e === p ? Object.keys(s).forEach((o) => {
        s[o][t] ||= x(s[o], t) || x(s[p], t) || [];
      }) : s[e][t] ||= x(s[e], t) || x(s[p], t) || [], Object.keys(s).forEach((o) => {
        (e === p || e === o) && Object.keys(s[o]).forEach((c) => {
          l.test(c) && s[o][c].push([r, i]);
        });
      }), Object.keys(n).forEach((o) => {
        (e === p || e === o) && Object.keys(n[o]).forEach((c) => l.test(c) && n[o][c].push([r, i]));
      });
      return;
    }
    const a = K(t) || [t];
    for (let l = 0, o = a.length; l < o; l++) {
      const c = a[l];
      Object.keys(n).forEach((h) => {
        (e === p || e === h) && (n[h][c] ||= [...x(s[h], c) || x(s[p], c) || []], n[h][c].push([r, i - o + l + 1]));
      });
    }
  }
  match = He;
  buildAllMatchers() {
    const e = /* @__PURE__ */ Object.create(null);
    return Object.keys(this.#e).concat(Object.keys(this.#t)).forEach((t) => {
      e[t] ||= this.#r(t);
    }), this.#t = this.#e = void 0, Ie(), e;
  }
  #r(e) {
    const t = [];
    let r = e === p;
    return [this.#t, this.#e].forEach((s) => {
      const n = s[e] ? Object.keys(s[e]).map((i) => [i, s[e][i]]) : [];
      n.length !== 0 ? (r ||= true, t.push(...n)) : e !== p && t.push(...Object.keys(s[p]).map((i) => [i, s[p][i]]));
    }), r ? Le(t) : null;
  }
};
var Fe = class {
  static {
    __name(this, "Fe");
  }
  static {
    __name2(this, "Fe");
  }
  name = "SmartRouter";
  #t = [];
  #e = [];
  constructor(e) {
    this.#t = e.routers;
  }
  add(e, t, r) {
    if (!this.#e) throw new Error(Y);
    this.#e.push([e, t, r]);
  }
  match(e, t) {
    if (!this.#e) throw new Error("Fatal error");
    const r = this.#t, s = this.#e, n = r.length;
    let i = 0, a;
    for (; i < n; i++) {
      const l = r[i];
      try {
        for (let o = 0, c = s.length; o < c; o++) l.add(...s[o]);
        a = l.match(e, t);
      } catch (o) {
        if (o instanceof J) continue;
        throw o;
      }
      this.match = l.match.bind(l), this.#t = [l], this.#e = void 0;
      break;
    }
    if (i === n) throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, a;
  }
  get activeRouter() {
    if (this.#e || this.#t.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#t[0];
  }
};
var S = /* @__PURE__ */ Object.create(null);
var qe = class se {
  static {
    __name(this, "se");
  }
  static {
    __name2(this, "se");
  }
  #t;
  #e;
  #r;
  #i = 0;
  #n = S;
  constructor(t, r, s) {
    if (this.#e = s || /* @__PURE__ */ Object.create(null), this.#t = [], t && r) {
      const n = /* @__PURE__ */ Object.create(null);
      n[t] = { handler: r, possibleKeys: [], score: 0 }, this.#t = [n];
    }
    this.#r = [];
  }
  insert(t, r, s) {
    this.#i = ++this.#i;
    let n = this;
    const i = ge(r), a = [];
    for (let l = 0, o = i.length; l < o; l++) {
      const c = i[l], h = i[l + 1], u = we(c, h), d = Array.isArray(u) ? u[0] : c;
      if (d in n.#e) {
        n = n.#e[d], u && a.push(u[1]);
        continue;
      }
      n.#e[d] = new se(), u && (n.#r.push(u), a.push(u[1])), n = n.#e[d];
    }
    return n.#t.push({ [t]: { handler: s, possibleKeys: a.filter((l, o, c) => c.indexOf(l) === o), score: this.#i } }), n;
  }
  #s(t, r, s, n) {
    const i = [];
    for (let a = 0, l = t.#t.length; a < l; a++) {
      const o = t.#t[a], c = o[r] || o[p], h = {};
      if (c !== void 0 && (c.params = /* @__PURE__ */ Object.create(null), i.push(c), s !== S || n && n !== S)) for (let u = 0, d = c.possibleKeys.length; u < d; u++) {
        const g = c.possibleKeys[u], w = h[c.score];
        c.params[g] = n?.[g] && !w ? n[g] : s[g] ?? n?.[g], h[c.score] = true;
      }
    }
    return i;
  }
  search(t, r) {
    const s = [];
    this.#n = S;
    let i = [this];
    const a = U(r), l = [];
    for (let o = 0, c = a.length; o < c; o++) {
      const h = a[o], u = o === c - 1, d = [];
      for (let g = 0, w = i.length; g < w; g++) {
        const f = i[g], m = f.#e[h];
        m && (m.#n = f.#n, u ? (m.#e["*"] && s.push(...this.#s(m.#e["*"], t, f.#n)), s.push(...this.#s(m, t, f.#n))) : d.push(m));
        for (let R = 0, H = f.#r.length; R < H; R++) {
          const D = f.#r[R], y = f.#n === S ? {} : { ...f.#n };
          if (D === "*") {
            const b = f.#e["*"];
            b && (s.push(...this.#s(b, t, f.#n)), b.#n = y, d.push(b));
            continue;
          }
          const [ae, N, j] = D;
          if (!h && !(j instanceof RegExp)) continue;
          const E = f.#e[ae], oe = a.slice(o).join("/");
          if (j instanceof RegExp) {
            const b = j.exec(oe);
            if (b) {
              if (y[N] = b[0], s.push(...this.#s(E, t, f.#n, y)), Object.keys(E.#e).length) {
                E.#n = y;
                const ce = b[0].match(/\//)?.length ?? 0;
                (l[ce] ||= []).push(E);
              }
              continue;
            }
          }
          (j === true || j.test(h)) && (y[N] = h, u ? (s.push(...this.#s(E, t, y, f.#n)), E.#e["*"] && s.push(...this.#s(E.#e["*"], t, y, f.#n))) : (E.#n = y, d.push(E)));
        }
      }
      i = d.concat(l.shift() ?? []);
    }
    return s.length > 1 && s.sort((o, c) => o.score - c.score), [s.map(({ handler: o, params: c }) => [o, c])];
  }
};
var Be = class {
  static {
    __name(this, "Be");
  }
  static {
    __name2(this, "Be");
  }
  name = "TrieRouter";
  #t;
  constructor() {
    this.#t = new qe();
  }
  add(e, t, r) {
    const s = K(t);
    if (s) {
      for (let n = 0, i = s.length; n < i; n++) this.#t.insert(e, s[n], r);
      return;
    }
    this.#t.insert(e, t, r);
  }
  match(e, t) {
    return this.#t.search(e, t);
  }
};
var ne = class extends Ce {
  static {
    __name(this, "ne");
  }
  static {
    __name2(this, "ne");
  }
  constructor(e = {}) {
    super(e), this.router = e.router ?? new Fe({ routers: [new Ne(), new Be()] });
  }
};
var We = /* @__PURE__ */ __name2((e) => {
  const r = { ...{ origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [] }, ...e }, s = /* @__PURE__ */ ((i) => typeof i == "string" ? i === "*" ? () => i : (a) => i === a ? a : null : typeof i == "function" ? i : (a) => i.includes(a) ? a : null)(r.origin), n = ((i) => typeof i == "function" ? i : Array.isArray(i) ? () => i : () => [])(r.allowMethods);
  return async function(a, l) {
    function o(h, u) {
      a.res.headers.set(h, u);
    }
    __name(o, "o");
    __name2(o, "o");
    const c = await s(a.req.header("origin") || "", a);
    if (c && o("Access-Control-Allow-Origin", c), r.credentials && o("Access-Control-Allow-Credentials", "true"), r.exposeHeaders?.length && o("Access-Control-Expose-Headers", r.exposeHeaders.join(",")), a.req.method === "OPTIONS") {
      r.origin !== "*" && o("Vary", "Origin"), r.maxAge != null && o("Access-Control-Max-Age", r.maxAge.toString());
      const h = await n(a.req.header("origin") || "", a);
      h.length && o("Access-Control-Allow-Methods", h.join(","));
      let u = r.allowHeaders;
      if (!u?.length) {
        const d = a.req.header("Access-Control-Request-Headers");
        d && (u = d.split(/\s*,\s*/));
      }
      return u?.length && (o("Access-Control-Allow-Headers", u.join(",")), a.res.headers.append("Vary", "Access-Control-Request-Headers")), a.res.headers.delete("Content-Length"), a.res.headers.delete("Content-Type"), new Response(null, { headers: a.res.headers, status: 204, statusText: "No Content" });
    }
    await l(), r.origin !== "*" && a.header("Vary", "Origin", { append: true });
  };
}, "We");
var v = new ne();
v.use("/api/*", We());
var A = /* @__PURE__ */ __name2(async (e, t) => {
  const r = e.req.header("Authorization");
  if (!r || !r.startsWith("Bearer ")) return e.json({ error: "Non autoris\xE9" }, 401);
  const s = r.replace("Bearer ", ""), n = e.env.ADMIN_PASSWORD || "attrapereves2026";
  if (s !== n) return e.json({ error: "Mot de passe incorrect" }, 401);
  await t();
}, "A");
v.get("/api/events", async (e) => {
  const { results: t } = await e.env.DB.prepare(`
    SELECT id, title, description, event_date, event_time, end_date, end_time, 
           category, image_key, booking_url
    FROM events 
    WHERE is_published = 1 
    ORDER BY event_date ASC, event_time ASC
  `).all(), r = t.map((s) => ({ ...s, image_url: s.image_key ? `/api/images/${s.image_key}` : null }));
  return e.json(r);
});
v.get("/api/images/:key", async (e) => {
  const t = e.req.param("key"), r = await e.env.IMAGES.get(`events/${t}`);
  if (!r) return e.notFound();
  const s = new Headers();
  return s.set("Content-Type", r.httpMetadata?.contentType || "image/jpeg"), s.set("Cache-Control", "public, max-age=86400"), new Response(r.body, { headers: s });
});
v.post("/api/admin/login", async (e) => {
  const { password: t } = await e.req.json(), r = e.env.ADMIN_PASSWORD || "attrapereves2026";
  return t === r ? e.json({ success: true, token: t }) : e.json({ error: "Mot de passe incorrect" }, 401);
});
v.get("/api/admin/events", A, async (e) => {
  const { results: t } = await e.env.DB.prepare(`
    SELECT * FROM events ORDER BY event_date ASC, event_time ASC
  `).all(), r = t.map((s) => ({ ...s, image_url: s.image_key ? `/api/images/${s.image_key}` : null }));
  return e.json(r);
});
v.post("/api/admin/events", A, async (e) => {
  const t = await e.req.json(), { title: r, description: s, event_date: n, event_time: i, end_date: a, end_time: l, category: o, booking_url: c, is_published: h } = t, u = await e.env.DB.prepare(`
    INSERT INTO events (title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(r, s || null, n, i || null, a || null, l || null, o || "evenement", c || null, h ?? 1).run();
  return e.json({ id: u.meta.last_row_id, ...t }, 201);
});
v.put("/api/admin/events/:id", A, async (e) => {
  const t = e.req.param("id"), r = await e.req.json(), { title: s, description: n, event_date: i, event_time: a, end_date: l, end_time: o, category: c, booking_url: h, is_published: u } = r;
  return await e.env.DB.prepare(`
    UPDATE events SET title=?, description=?, event_date=?, event_time=?, end_date=?, end_time=?,
    category=?, booking_url=?, is_published=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(s, n || null, i, a || null, l || null, o || null, c || "evenement", h || null, u ?? 1, t).run(), e.json({ success: true });
});
v.delete("/api/admin/events/:id", A, async (e) => {
  const t = e.req.param("id"), r = await e.env.DB.prepare("SELECT image_key FROM events WHERE id=?").bind(t).first();
  return r?.image_key && await e.env.IMAGES.delete(`events/${r.image_key}`), await e.env.DB.prepare("DELETE FROM events WHERE id=?").bind(t).run(), e.json({ success: true });
});
v.post("/api/admin/events/:id/image", A, async (e) => {
  const t = e.req.param("id"), s = (await e.req.formData()).get("image");
  if (!s) return e.json({ error: "Aucune image fournie" }, 400);
  const n = await e.env.DB.prepare("SELECT image_key FROM events WHERE id=?").bind(t).first();
  n?.image_key && await e.env.IMAGES.delete(`events/${n.image_key}`);
  const i = s.name.split(".").pop() || "jpg", a = `${t}-${Date.now()}.${i}`;
  return await e.env.IMAGES.put(`events/${a}`, s.stream(), { httpMetadata: { contentType: s.type } }), await e.env.DB.prepare("UPDATE events SET image_key=?, updated_at=datetime('now') WHERE id=?").bind(a, t).run(), e.json({ image_key: a, image_url: `/api/images/${a}` });
});
v.delete("/api/admin/events/:id/image", A, async (e) => {
  const t = e.req.param("id"), r = await e.env.DB.prepare("SELECT image_key FROM events WHERE id=?").bind(t).first();
  return r?.image_key && await e.env.IMAGES.delete(`events/${r.image_key}`), await e.env.DB.prepare("UPDATE events SET image_key=NULL, updated_at=datetime('now') WHERE id=?").bind(t).run(), e.json({ success: true });
});
var W = new ne();
var Ue = Object.assign({ "/src/index.tsx": v });
var ie = false;
for (const [, e] of Object.entries(Ue)) e && (W.route("/", e), W.notFound(e.notFoundHandler), ie = true);
if (!ie) throw new Error("Can't import modules from ['/src/index.tsx']");
var drainBody = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } catch (e) {
    const error32 = reduceError(e);
    return Response.json(error32, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = W;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env22, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env22, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env22, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env22, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env22, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env22, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env22, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env22, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env22, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env22, ctx) => {
      this.env = env22;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/pages-dev-util.ts
function isRoutingRuleMatch(pathname, routingRule) {
  if (!pathname) {
    throw new Error("Pathname is undefined.");
  }
  if (!routingRule) {
    throw new Error("Routing rule is undefined.");
  }
  const ruleRegExp = transformRoutingRuleToRegExp(routingRule);
  return pathname.match(ruleRegExp) !== null;
}
__name(isRoutingRuleMatch, "isRoutingRuleMatch");
function transformRoutingRuleToRegExp(rule) {
  let transformedRule;
  if (rule === "/" || rule === "/*") {
    transformedRule = rule;
  } else if (rule.endsWith("/*")) {
    transformedRule = `${rule.substring(0, rule.length - 2)}(/*)?`;
  } else if (rule.endsWith("/")) {
    transformedRule = `${rule.substring(0, rule.length - 1)}(/)?`;
  } else if (rule.endsWith("*")) {
    transformedRule = rule;
  } else {
    transformedRule = `${rule}(/)?`;
  }
  transformedRule = `^${transformedRule.replaceAll(/\./g, "\\.").replaceAll(/\*/g, ".*")}$`;
  return new RegExp(transformedRule);
}
__name(transformRoutingRuleToRegExp, "transformRoutingRuleToRegExp");

// .wrangler/tmp/pages-3CQJao/rvtevld5po.js
var define_ROUTES_default = { version: 1, include: ["/api/*"], exclude: [] };
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env3, context3) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env3.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = middleware_loader_entry_default;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env3, context3);
      }
    }
    return env3.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error4 = reduceError2(e);
    return Response.json(error4, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-QSBNik/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = pages_dev_pipeline_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env3, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-QSBNik/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=rvtevld5po.js.map
