// Emulate MacBook Pro 13" M1 (2020) — macOS Sequoia 15.3

// ── Deterministic PRNG for stable noise ──
// INSTANCE_SEED is generated per container by seed.js (entrypoint.sh)
const NOISE_SEED = typeof INSTANCE_SEED !== 'undefined' ? INSTANCE_SEED : 0x4D616331;
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── Extract real Chrome version ──
const origUA = navigator.userAgent;
const chromeVerMatch = origUA.match(/Chrome\/([\d.]+)/);
const chromeVer = chromeVerMatch ? chromeVerMatch[1] : '136.0.0.0';
const chromeMajor = chromeVer.split('.')[0];

// Chrome on macOS freezes OS version to 10_15_7 in UA string (since Chrome 93)
const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`;

// ── Navigator ──
Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel', configurable: true });
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true });
Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
Object.defineProperty(navigator, 'appVersion', {
  get: () => ua.substring(ua.indexOf('/') + 1),
  configurable: true
});
Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.', configurable: true });
Object.defineProperty(navigator, 'languages', {
  get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  configurable: true
});
Object.defineProperty(navigator, 'productSub', { get: () => '20030107', configurable: true });
Object.defineProperty(navigator, 'product', { get: () => 'Gecko', configurable: true });

// ── User-Agent Client Hints (critical OS detection vector) ──
if (navigator.userAgentData) {
  const brands = [
    { brand: 'Chromium', version: chromeMajor },
    { brand: 'Google Chrome', version: chromeMajor },
    { brand: 'Not/A)Brand', version: '8' }
  ];
  const uaData = { brands, mobile: false, platform: 'macOS' };

  Object.defineProperty(navigator, 'userAgentData', {
    get: () => ({
      ...uaData,
      getHighEntropyValues: async () => ({
        brands,
        mobile: false,
        platform: 'macOS',
        architecture: 'arm',
        bitness: '64',
        model: '',
        platformVersion: '15.3.0',
        fullVersionList: [
          { brand: 'Chromium', version: chromeVer },
          { brand: 'Google Chrome', version: chromeVer }
        ],
        uaFullVersion: chromeVer,
        wow64: false
      }),
      toJSON: () => uaData
    }),
    configurable: true
  });
}

// ── Navigator plugins ── Chrome on Mac has PDF Viewer
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const fakePlugin = {
      0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
      name: 'PDF Viewer',
      filename: 'internal-pdf-viewer',
      description: 'Portable Document Format',
      length: 1,
      item: (i) => fakePlugin[i],
      namedItem: (name) => fakePlugin[0]
    };
    const plugins = [fakePlugin];
    plugins.item = (i) => plugins[i];
    plugins.namedItem = (name) => name === 'PDF Viewer' ? fakePlugin : null;
    plugins.refresh = () => {};
    Object.defineProperty(plugins, 'length', { get: () => 1 });
    return plugins;
  },
  configurable: true
});

Object.defineProperty(navigator, 'mimeTypes', {
  get: () => {
    const mime = {
      type: 'application/pdf',
      suffixes: 'pdf',
      description: 'Portable Document Format',
      enabledPlugin: { name: 'PDF Viewer' }
    };
    const mimes = [mime];
    mimes.item = (i) => mimes[i];
    mimes.namedItem = (name) => name === 'application/pdf' ? mime : null;
    Object.defineProperty(mimes, 'length', { get: () => 1 });
    return mimes;
  },
  configurable: true
});

// ── WebGL ── Apple M1 GPU
const hookGL = (proto) => {
  const orig = proto.getParameter;
  proto.getParameter = function (param) {
    if (param === 37445) return 'Apple Inc.';
    if (param === 37446) return 'Apple M1';
    return orig.call(this, param);
  };
};
hookGL(WebGLRenderingContext.prototype);
if (typeof WebGL2RenderingContext !== 'undefined') {
  hookGL(WebGL2RenderingContext.prototype);
}

// ── Screen ── MacBook Pro 13" Retina (2560x1600 native, default scaled 1440x900)
Object.defineProperty(screen, 'width', { get: () => 1440, configurable: true });
Object.defineProperty(screen, 'height', { get: () => 900, configurable: true });
Object.defineProperty(screen, 'availWidth', { get: () => 1440, configurable: true });
Object.defineProperty(screen, 'availHeight', { get: () => 875, configurable: true });
Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });
Object.defineProperty(screen, 'orientation', {
  get: () => ({
    angle: 0,
    type: 'landscape-primary',
    onchange: null
  }),
  configurable: true
});

// ── Window dimensions ── simulate Chrome UI offset (tabs + address bar ≈ 85px)
Object.defineProperty(window, 'innerWidth', { get: () => 1440, configurable: true });
Object.defineProperty(window, 'innerHeight', { get: () => 815, configurable: true });
Object.defineProperty(window, 'outerWidth', { get: () => 1440, configurable: true });
Object.defineProperty(window, 'outerHeight', { get: () => 900, configurable: true });

// ── Notification ── real Mac defaults to "default", not "denied"
if (typeof Notification !== 'undefined') {
  Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true });
}

// ── document.hasFocus ── headless always returns false
Document.prototype.hasFocus = function () { return true; };

// ── Permissions API ── notifications should be "prompt" on a fresh Mac
if (navigator.permissions) {
  const origQuery = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = (params) => {
    if (params.name === 'notifications') {
      return Promise.resolve({ state: 'prompt', onchange: null });
    }
    return origQuery(params);
  };
}

// ── Canvas fingerprint noise ──
// Add deterministic noise to canvas output to mask OS rendering differences.
// Uses offscreen canvas so original canvas is never modified.
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  try {
    if (this.width > 0 && this.height > 0) {
      const off = document.createElement('canvas');
      off.width = this.width;
      off.height = this.height;
      const ctx = off.getContext('2d');
      ctx.drawImage(this, 0, 0);
      const imgData = ctx.getImageData(0, 0, off.width, off.height);
      const d = imgData.data;
      const rng = mulberry32(NOISE_SEED);
      for (let i = 0; i < d.length; i += 4 * 97) {
        d[i] = clamp8(d[i] + ((rng() * 3) | 0) - 1);
        d[i + 1] = clamp8(d[i + 1] + ((rng() * 3) | 0) - 1);
        d[i + 2] = clamp8(d[i + 2] + ((rng() * 3) | 0) - 1);
      }
      ctx.putImageData(imgData, 0, 0);
      return origToDataURL.apply(off, arguments);
    }
  } catch (e) { /* fallback */ }
  return origToDataURL.apply(this, arguments);
};

const origToBlob = HTMLCanvasElement.prototype.toBlob;
HTMLCanvasElement.prototype.toBlob = function (callback) {
  try {
    if (this.width > 0 && this.height > 0) {
      const off = document.createElement('canvas');
      off.width = this.width;
      off.height = this.height;
      const ctx = off.getContext('2d');
      ctx.drawImage(this, 0, 0);
      const imgData = ctx.getImageData(0, 0, off.width, off.height);
      const d = imgData.data;
      const rng = mulberry32(NOISE_SEED);
      for (let i = 0; i < d.length; i += 4 * 97) {
        d[i] = clamp8(d[i] + ((rng() * 3) | 0) - 1);
        d[i + 1] = clamp8(d[i + 1] + ((rng() * 3) | 0) - 1);
        d[i + 2] = clamp8(d[i + 2] + ((rng() * 3) | 0) - 1);
      }
      ctx.putImageData(imgData, 0, 0);
      return origToBlob.apply(off, arguments);
    }
  } catch (e) { /* fallback */ }
  return origToBlob.apply(this, arguments);
};

// ── AudioContext fingerprint noise ──
if (typeof AudioBuffer !== 'undefined') {
  const origGetChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function (channel) {
    const data = origGetChannelData.call(this, channel);
    const rng = mulberry32(NOISE_SEED);
    for (let i = 0; i < data.length; i += 100) {
      data[i] += (rng() - 0.5) * 0.0001;
    }
    return data;
  };
}

if (typeof AnalyserNode !== 'undefined') {
  const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
  AnalyserNode.prototype.getFloatFrequencyData = function (array) {
    origGetFloatFreq.call(this, array);
    const rng = mulberry32(NOISE_SEED);
    for (let i = 0; i < array.length; i += 50) {
      array[i] += (rng() - 0.5) * 0.01;
    }
  };
}

// ── Remove headless indicators ──
delete navigator.__proto__.webdriver;
