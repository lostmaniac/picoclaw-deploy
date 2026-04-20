// Emulate Mac M1 Chrome fingerprint

// Extract real Chrome version from original UA
const chromeVer = navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || 'Chrome/136.0.0.0';
const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${chromeVer} Safari/537.36`;

// Navigator
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

// WebGL vendor / renderer (37445=UNMASKED_VENDOR, 37446=UNMASKED_RENDERER)
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

// Screen — match MacBook Pro 16" default
Object.defineProperty(screen, 'width', { get: () => 1920, configurable: true });
Object.defineProperty(screen, 'height', { get: () => 1080, configurable: true });
Object.defineProperty(screen, 'availWidth', { get: () => 1920, configurable: true });
Object.defineProperty(screen, 'availHeight', { get: () => 1050, configurable: true });
Object.defineProperty(screen, 'colorDepth', { get: () => 30, configurable: true });
Object.defineProperty(screen, 'pixelDepth', { get: () => 30, configurable: true });

// window dimensions
Object.defineProperty(window, 'outerWidth', { get: () => 1920, configurable: true });
Object.defineProperty(window, 'outerHeight', { get: () => 1080, configurable: true });

// Remove headless indicators
delete navigator.__proto__.webdriver;
