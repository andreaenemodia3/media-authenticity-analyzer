/**
 * analysis.js — detection engine
 *
 * This module runs the image analysis and returns a structured result:
 * classification, confidence, and the individual signals behind it.
 *
 * Two engines are supported:
 *
 *  1. "heuristic" (default) — a fully client-side PREVIEW engine. It inspects
 *     file metadata (EXIF, PNG text chunks, C2PA content credentials), known
 *     AI-generator signatures, and pixel-level statistics (sensor-noise
 *     proxies). It is clearly labeled as a heuristic preview: it is NOT the
 *     trained deep-learning model described in the project proposal.
 *
 *  2. "api" — posts the image to a custom endpoint (e.g. the team's trained
 *     PyTorch model served behind Flask/Hugging Face Spaces). The URL is
 *     configured in Settings. Expected JSON response:
 *     { "label": "manipulated" | "authentic" | "inconclusive",
 *       "confidence": 0.0-1.0, "explanation": "optional text" }
 *
 * Everything runs in the browser — no image ever leaves the device unless
 * the API engine is explicitly configured.
 */
const Analyzer = (() => {
  'use strict';

  /* ===================== Known signatures ===================== */

  const AI_SIGNATURES = [
    'midjourney', 'dall-e', 'dall e', 'openai', 'stable diffusion', 'stablediffusion',
    'firefly', 'adobe firefly', 'imagen', 'google ai', 'grok', 'flux',
    'trainedalgorithmicmedia', 'inferredmetadata'
  ];

  const EDITOR_SIGNATURES = [
    'photoshop', 'adobe photoshop', 'lightroom', 'gimp', 'pixelmator', 'canva',
    'snapseed', 'picsart', 'facetune'
  ];

  const GENERATOR_DIMENSIONS = new Set([
    '1024x1024', '1024x1792', '1792x1024', '1344x768', '768x1344',
    '1152x896', '896x1152', '1216x832', '832x1216', '1248x832', '832x1248',
    '1536x1024', '1024x1536', '1456x816', '816x1456'
  ]);

  /* ===================== File reading ===================== */

  function readFileBytes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  function latin1(bytes, limit) {
    let s = '';
    const n = Math.min(bytes.length, limit || bytes.length);
    const CHUNK = 8192;
    for (let i = 0; i < n; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, n)));
    }
    return s;
  }

  /* ===================== JPEG parsing ===================== */

  function parseJpeg(bytes) {
    const meta = { exif: null, hasC2PA: false };
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return meta;

    let pos = 2;
    while (pos + 4 < bytes.length) {
      if (bytes[pos] !== 0xff) break;
      const marker = bytes[pos + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        pos += 2;
        continue;
      }
      if (marker === 0xda) break; // start of scan — metadata section ended
      const len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (len < 2 || pos + 2 + len > bytes.length) break;
      const seg = bytes.subarray(pos + 4, pos + 2 + len);

      if (marker === 0xe1) { // APP1
        if (seg.length > 6 && seg[0] === 0x45 && seg[1] === 0x78 && // "Exif\0\0"
            seg[2] === 0x69 && seg[3] === 0x66 && seg[4] === 0 && seg[5] === 0) {
          meta.exif = parseTiff(seg.subarray(6));
        }
      } else if (marker === 0xe2) { // APP2 — JUMBF/C2PA content credentials
        const head = latin1(seg.subarray(0, 32)).toLowerCase();
        if (head.includes('jumb') || head.includes('c2pa') || head.includes('clic')) {
          meta.hasC2PA = true;
        }
      }
      pos += 2 + len;
    }
    return meta;
  }

  /* ===================== PNG parsing ===================== */

  function parsePng(bytes) {
    const meta = { textChunks: [], exif: null, hasC2PA: false };
    if (bytes.length < 8) return meta;
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return meta;

    let pos = 8;
    while (pos + 8 < bytes.length) {
      // Unsigned chunk length; reject malformed chunks that would loop or overrun
      const len = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
      if (len > bytes.length - pos - 12) break;
      const type = latin1(bytes.subarray(pos + 4, pos + 8));
      const data = bytes.subarray(pos + 8, pos + 8 + len);

      if (type === 'tEXt') {
        const nul = data.indexOf(0);
        if (nul > 0) {
          meta.textChunks.push({
            keyword: latin1(data.subarray(0, nul)),
            value: latin1(data.subarray(nul + 1))
          });
        }
      } else if (type === 'eXIf') {
        meta.exif = parseTiff(data);
      } else if (type === 'caBX') {
        meta.hasC2PA = true;
      } else if (type === 'IHDR' && data.length >= 8) {
        meta.width = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
        meta.height = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
      } else if (type === 'IEND') {
        break;
      }
      pos += 12 + len;
    }
    return meta;
  }

  /* ===================== TIFF/EXIF parsing ===================== */

  function parseTiff(bytes) {
    const out = { tags: {} };
    if (bytes.length < 8) return null;
    const le = bytes[0] === 0x49 && bytes[1] === 0x49; // "II"
    const be = bytes[0] === 0x4d && bytes[1] === 0x4d; // "MM"
    if (!le && !be) return null;

    const u16 = (o) => (le ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
    const u32 = (o) =>
      le
        ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
        : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;

    const ifdOffset = u32(4);
    if (ifdOffset + 2 > bytes.length) return null;
    const count = u16(ifdOffset);
    const TAGS = { 0x010f: 'Make', 0x0110: 'Model', 0x0131: 'Software', 0x0132: 'DateTime', 0x8298: 'Copyright' };

    for (let i = 0; i < count && ifdOffset + 2 + i * 12 + 12 <= bytes.length; i++) {
      const entry = ifdOffset + 2 + i * 12;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const num = u32(entry + 4);
      if (!TAGS[tag] || type !== 2) continue; // ASCII only
      let valOffset = entry + 8;
      if (num > 4) {
        valOffset = u32(entry + 8);
        if (valOffset + num > bytes.length) continue;
      }
      let s = '';
      for (let j = 0; j < num - 1 && valOffset + j < bytes.length; j++) {
        const c = bytes[valOffset + j];
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      out.tags[TAGS[tag]] = s;
    }
    return out;
  }

  /* ===================== Pixel statistics ===================== */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode the image.')); };
      img.src = url;
    });
  }

  function makeCanvas(img, maxDim) {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, ctx, scale };
  }

  /**
   * High-frequency energy (a proxy for sensor noise). Camera captures carry
   * photon/sensor noise; many generated images are locally smoother.
   */
  function noiseStats(img) {
    const { ctx, canvas } = makeCanvas(img, 256);
    const { width: w, height: h } = canvas;
    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return null; // tainted canvas — skip pixel analysis
    }
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    let sum = 0, n = 0, satSum = 0, satMax = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const avg = (lum[i - 1] + lum[i + 1] + lum[i - w] + lum[i + w]) / 4;
        sum += Math.abs(lum[i] - avg);
        n++;
      }
    }
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      satSum += sat;
      if (sat > satMax) satMax = sat;
    }
    return {
      meanNoise: n ? sum / n : 0,
      meanSaturation: satSum / (w * h),
      maxSaturation: satMax
    };
  }

  function makeThumbnail(img) {
    const { canvas } = makeCanvas(img, 96);
    try {
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
      return '';
    }
  }

  /* ===================== Heuristic engine ===================== */

  async function runHeuristic(file, img) {
    const bytes = await readFileBytes(file);
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;

    const jpeg = isJpeg ? parseJpeg(bytes) : null;
    const png = isPng ? parsePng(bytes) : null;
    const exif = (jpeg && jpeg.exif) || (png && png.exif) || null;
    const hasC2PA = (jpeg && jpeg.hasC2PA) || (png && png.hasC2PA) || false;

    // Raw ASCII scan for known generator / provenance markers
    const haystack = latin1(bytes, 262144).toLowerCase();

    const signals = [];
    let score = 0; // positive = toward AI/manipulated

    const addSignal = (title, detail, icon, weight) => {
      signals.push({ title, detail, icon, weight });
      score += weight;
    };

    /* --- Signal 1: known AI generator signatures in the file bytes --- */
    const foundAI = AI_SIGNATURES.filter((s) => haystack.includes(s));
    if (foundAI.length) {
      addSignal(
        'AI generator signature found',
        `The file contains text associated with AI image tools: “${foundAI[0]}”. This strongly suggests machine generation or AI-tool provenance.`,
        'chip',
        0.45
      );
    }

    /* --- Signal 2: camera EXIF metadata --- */
    if (exif && (exif.tags.Make || exif.tags.Model)) {
      addSignal(
        'Camera metadata (EXIF) present',
        `Device metadata says the image came from a camera: ${[exif.tags.Make, exif.tags.Model].filter(Boolean).join(' ')}. Camera EXIF is a meaningful authenticity signal, though it can be edited.`,
        'camera',
        -0.35
      );
    } else if (exif && exif.tags.Software) {
      const sw = exif.tags.Software;
      const edited = EDITOR_SIGNATURES.some((e) => sw.toLowerCase().includes(e));
      addSignal(
        edited ? 'Editing software in metadata' : 'Software metadata present',
        `Metadata lists software: “${sw}”. Editing alone does not mean manipulation, but no camera device is recorded.`,
        'wrench',
        edited ? 0.1 : 0.05
      );
    } else {
      addSignal(
        'No camera metadata',
        'This file has no EXIF camera data. Generated images usually lack it — but so do screenshots and images shared through messaging apps.',
        'file',
        0.12
      );
    }

    /* --- Signal 3: C2PA content credentials --- */
    if (hasC2PA) {
      addSignal(
        'Possible content-credential marker',
        'The file may carry a C2PA content credential. This detection only notes the marker\u2019s presence \u2014 the credential itself was not validated, and both cameras and AI tools can attach them.',
        'shield',
        0.0
      );
    }

    /* --- Signal 4: pixel noise statistics --- */
    const stats = noiseStats(img);
    if (stats) {
      if (stats.meanNoise < 1.1) {
        addSignal(
          'Very low high-frequency noise',
          `Measured local noise level ${stats.meanNoise.toFixed(2)} (0–255 scale) — unusually smooth for a camera capture. Generated images are often this clean.`,
          'wave',
          0.18
        );
      } else if (stats.meanNoise > 2.4) {
        addSignal(
          'Typical sensor noise',
          `Measured local noise level ${stats.meanNoise.toFixed(2)} (0–255 scale) — consistent with real sensor capture.`,
          'wave',
          -0.12
        );
      } else {
        addSignal(
          'Moderate noise level',
          `Measured local noise level ${stats.meanNoise.toFixed(2)} (0–255 scale) — within the overlapping range for both cameras and generators, so this signal is inconclusive.`,
          'wave',
          0.0
        );
      }
    }

    /* --- Signal 5: exact generator-typical dimensions --- */
    const thumbnail = makeThumbnail(img);
    const dims = `${img.naturalWidth}x${img.naturalHeight}`;
    if (GENERATOR_DIMENSIONS.has(dims)) {
      addSignal(
        'Generator-typical dimensions',
        `The image is exactly ${dims} pixels — a common output size for AI image models. Cameras rarely produce these exact dimensions.`,
        'ruler',
        0.12
      );
    }

    /* --- PNG text chunks --- */
    if (png && png.textChunks.length) {
      const interesting = png.textChunks.filter((c) =>
        ['parameters', 'description', 'software', 'comment', 'model'].includes(c.keyword.toLowerCase())
      );
      if (interesting.length) {
        const c = interesting[0];
        addSignal(
          'Embedded generation parameters',
          `The PNG contains a “${c.keyword}” text chunk: “${c.value.slice(0, 120)}”. This is typical of AI generation tools (e.g. Stable Diffusion prompts).`,
          'chip',
          0.3
        );
      }
    }

    /* --- Score -> observations only ---
     * Without the team's trained model, these checks are factual observations
     * about the file. They do NOT produce a calibrated authenticity assessment,
     * so no aggregate classification or confidence is returned here. The full
     * classification UI is demonstrated via the labeled example, and lights up
     * for real once a model API is connected (Settings -> Detection engine). */
    return {
      label: null,
      confidence: null,
      engine: 'heuristic',
      signals,
      thumbnail
    };
  }

  /* ===================== API engine (team's trained model) ===================== */

  async function runApi(file, endpoint) {
    const bytes = await readFileBytes(file);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    const base64 = btoa(binary);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      });
    } catch (e) {
      throw new Error('Could not reach the detection API. Check the URL in Settings (the server must allow cross-origin requests).');
    }
    if (!response.ok) {
      throw new Error(`The detection API returned an error (${response.status}).`);
    }
    const data = await response.json();
    const label = data.label;
    const conf = data.confidence;
    if (!['manipulated', 'authentic', 'inconclusive'].includes(label)) {
      throw new Error('The detection API returned an unrecognized label: ' + JSON.stringify(label));
    }
    if (typeof conf !== 'number' || !isFinite(conf) || conf < 0 || conf > 1) {
      throw new Error('The detection API returned an invalid confidence value: ' + JSON.stringify(conf));
    }
    return {
      label,
      confidence: conf,
      explanation: data.explanation || 'Classification returned by the connected detection model.',
      engine: 'api',
      signals: []
    };
  }

  /* ===================== Public API ===================== */

  async function analyze(file, settings) {
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      throw new Error('Please upload a PNG or JPEG image.');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('That file is larger than 25 MB. Please upload a smaller image.');
    }
    // Validate the file decodes as an image before any processing or transmission
    const img = await loadImage(file);
    if (!img.naturalWidth || !img.naturalHeight ||
        img.naturalWidth > 10000 || img.naturalHeight > 10000) {
      throw new Error('That file could not be decoded as a valid image.');
    }
    if (settings.engine === 'api' && settings.apiEndpoint) {
      const result = await runApi(file, settings.apiEndpoint);
      result.thumbnail = makeThumbnail(img);
      return result;
    }
    return runHeuristic(file, img);
  }

  return { analyze, makeThumbnail, loadImage };
})();
