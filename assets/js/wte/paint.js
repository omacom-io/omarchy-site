// Vendored from wte src/paint.ts (and blocks.ts). Do not edit.

// src/blocks.ts
var LIGHT = 0.1;
var HEAVY = 0.2;
var N = 1;
var E = 2;
var S = 4;
var W = 8;
function bar(x, y, w, h, a) {
  return a === undefined ? { x, y, w, h } : { x, y, w, h, a };
}
function full(a) {
  return [bar(0, 0, 1, 1, a)];
}
function lower(eighths) {
  const h = eighths / 8;
  return [bar(0, 1 - h, 1, h)];
}
function upper(eighths) {
  return [bar(0, 0, 1, eighths / 8)];
}
function left(eighths) {
  return [bar(0, 0, eighths / 8, 1)];
}
function right(eighths) {
  const w = eighths / 8;
  return [bar(1 - w, 0, w, 1)];
}
function arms(mask, weight) {
  const strokes = [];
  if (mask & N) {
    strokes.push({ x1: 0.5, y1: 0, x2: 0.5, y2: 0.5, w: weight });
  }
  if (mask & S) {
    strokes.push({ x1: 0.5, y1: 0.5, x2: 0.5, y2: 1, w: weight });
  }
  if (mask & W) {
    strokes.push({ x1: 0, y1: 0.5, x2: 0.5, y2: 0.5, w: weight });
  }
  if (mask & E) {
    strokes.push({ x1: 0.5, y1: 0.5, x2: 1, y2: 0.5, w: weight });
  }
  return strokes;
}
function quad(bits) {
  const fills = [];
  if (bits & 1) {
    fills.push(bar(0, 0, 0.5, 0.5));
  }
  if (bits & 2) {
    fills.push(bar(0.5, 0, 0.5, 0.5));
  }
  if (bits & 4) {
    fills.push(bar(0, 0.5, 0.5, 0.5));
  }
  if (bits & 8) {
    fills.push(bar(0.5, 0.5, 0.5, 0.5));
  }
  return fills;
}
var BLOCK_FILLS = {
  9600: upper(4),
  9601: lower(1),
  9602: lower(2),
  9603: lower(3),
  9604: lower(4),
  9605: lower(5),
  9606: lower(6),
  9607: lower(7),
  9608: full(),
  9609: left(7),
  9610: left(6),
  9611: left(5),
  9612: left(4),
  9613: left(3),
  9614: left(2),
  9615: left(1),
  9616: right(4),
  9617: full(0.25),
  9618: full(0.5),
  9619: full(0.75),
  9620: upper(1),
  9621: right(1),
  9622: quad(4),
  9623: quad(8),
  9624: quad(1),
  9625: quad(1 | 4 | 8),
  9626: quad(1 | 8),
  9627: quad(1 | 2 | 4),
  9628: quad(1 | 2 | 8),
  9629: quad(2),
  9630: quad(2 | 4),
  9631: quad(2 | 4 | 8),
  9632: [bar(0.08, 0.08, 0.84, 0.84)],
  9644: [bar(0.05, 0.3, 0.9, 0.4)],
  9646: [bar(0.25, 0.08, 0.5, 0.84)]
};
var BOX_ARMS = {
  9472: [E | W, LIGHT],
  9473: [E | W, HEAVY],
  9474: [N | S, LIGHT],
  9475: [N | S, HEAVY],
  9484: [E | S, LIGHT],
  9485: [E | S, HEAVY],
  9486: [E | S, HEAVY],
  9487: [E | S, HEAVY],
  9488: [W | S, LIGHT],
  9489: [W | S, HEAVY],
  9490: [W | S, HEAVY],
  9491: [W | S, HEAVY],
  9492: [N | E, LIGHT],
  9493: [N | E, HEAVY],
  9494: [N | E, HEAVY],
  9495: [N | E, HEAVY],
  9496: [N | W, LIGHT],
  9497: [N | W, HEAVY],
  9498: [N | W, HEAVY],
  9499: [N | W, HEAVY],
  9500: [N | E | S, LIGHT],
  9508: [N | W | S, LIGHT],
  9516: [E | W | S, LIGHT],
  9524: [N | E | W, LIGHT],
  9532: [N | E | S | W, LIGHT],
  9538: [N | E | S | W, HEAVY],
  9547: [N | E | S | W, HEAVY],
  9588: [W, LIGHT],
  9589: [N, LIGHT],
  9590: [E, LIGHT],
  9591: [S, LIGHT],
  9592: [W, HEAVY],
  9593: [N, HEAVY],
  9594: [E, HEAVY],
  9595: [S, HEAVY]
};
function boxArms(cp) {
  const exact = BOX_ARMS[cp];
  if (exact) {
    return exact;
  }
  if (cp >= 9501 && cp <= 9507) {
    return [N | E | S, cp === 9507 ? HEAVY : LIGHT];
  }
  if (cp >= 9509 && cp <= 9515) {
    return [N | W | S, cp === 9515 ? HEAVY : LIGHT];
  }
  if (cp >= 9517 && cp <= 9523) {
    return [E | W | S, cp === 9523 ? HEAVY : LIGHT];
  }
  if (cp >= 9525 && cp <= 9531) {
    return [N | E | W, cp === 9531 ? HEAVY : LIGHT];
  }
  if (cp >= 9533 && cp <= 9547) {
    return [N | E | S | W, cp >= 9546 ? HEAVY : LIGHT];
  }
  return;
}
var DIAGONALS = {
  9585: [{ x1: 0, y1: 1, x2: 1, y2: 0, w: LIGHT }],
  9586: [{ x1: 0, y1: 0, x2: 1, y2: 1, w: LIGHT }],
  9587: [
    { x1: 0, y1: 1, x2: 1, y2: 0, w: LIGHT },
    { x1: 0, y1: 0, x2: 1, y2: 1, w: LIGHT }
  ]
};
var EMPTY_FILLS = [];
var EMPTY_STROKES = [];
var GLYPH_CP_MIN = 9472;
var GLYPH_CP_MAX = 9727;
function geometryForCodePoint(cp) {
  const fills = BLOCK_FILLS[cp];
  if (fills) {
    return { fills, strokes: EMPTY_STROKES };
  }
  const box = boxArms(cp);
  if (box) {
    return { fills: EMPTY_FILLS, strokes: arms(box[0], box[1]) };
  }
  const diag = DIAGONALS[cp];
  if (diag) {
    return { fills: EMPTY_FILLS, strokes: diag };
  }
  return null;
}
var GLYPH_TABLE = Array.from({ length: GLYPH_CP_MAX - GLYPH_CP_MIN + 1 }, (_, i) => geometryForCodePoint(GLYPH_CP_MIN + i));
function glyphFillsCell(geometry) {
  if (geometry === null) {
    return false;
  }
  for (const fill of geometry.fills) {
    if (fill.a === undefined && fill.x === 0 && fill.y === 0 && fill.w === 1 && fill.h === 1) {
      return true;
    }
  }
  return false;
}
function glyphSpansRow(geometry) {
  if (geometry === null || geometry.strokes.length !== 0 || geometry.fills.length === 0) {
    return false;
  }
  for (const fill of geometry.fills) {
    if (fill.x !== 0 || fill.w !== 1) {
      return false;
    }
  }
  return true;
}
var PIXEL_EMPTY_FILLS = [];
var PIXEL_EMPTY_STROKES = [];
var PIXEL_EMPTY = {
  fills: PIXEL_EMPTY_FILLS,
  strokes: PIXEL_EMPTY_STROKES,
  covers: false,
  span: false
};
var pixelCellWidth = Number.NaN;
var pixelCellHeight = Number.NaN;
var lastPixelCp = Number.NaN;
var lastPixelGeometry = null;
var PIXEL_TABLE = Array.from({ length: GLYPH_CP_MAX - GLYPH_CP_MIN + 1 }, () => null);
function scaleFill(fill, cellWidth, cellHeight) {
  const scaled = {
    x: fill.x * cellWidth,
    y: fill.y * cellHeight,
    w: Math.max(1, fill.w * cellWidth),
    h: Math.max(1, fill.h * cellHeight)
  };
  if (fill.a !== undefined) {
    scaled.a = fill.a;
  }
  return scaled;
}
function scaleGeometry(geometry, cellWidth, cellHeight) {
  const strokeScale = Math.min(cellWidth, cellHeight);
  return {
    fills: geometry.fills.length === 0 ? PIXEL_EMPTY_FILLS : geometry.fills.map((fill) => scaleFill(fill, cellWidth, cellHeight)),
    strokes: geometry.strokes.length === 0 ? PIXEL_EMPTY_STROKES : geometry.strokes.map((stroke) => ({
      x1: stroke.x1 * cellWidth,
      y1: stroke.y1 * cellHeight,
      x2: stroke.x2 * cellWidth,
      y2: stroke.y2 * cellHeight,
      lineWidth: Math.max(1, stroke.w * strokeScale)
    })),
    covers: glyphFillsCell(geometry),
    span: glyphSpansRow(geometry)
  };
}
function ensurePixelTable(cellWidth, cellHeight) {
  if (pixelCellWidth === cellWidth && pixelCellHeight === cellHeight) {
    return;
  }
  pixelCellWidth = cellWidth;
  pixelCellHeight = cellHeight;
  for (let i = 0;i < GLYPH_TABLE.length; i++) {
    const geometry = GLYPH_TABLE[i];
    PIXEL_TABLE[i] = geometry ? scaleGeometry(geometry, cellWidth, cellHeight) : null;
  }
}
function pixelGlyphGeometryForCodePoint(cp, cellWidth, cellHeight) {
  if (cp !== 32 && (cp < GLYPH_CP_MIN || cp > GLYPH_CP_MAX)) {
    return null;
  }
  if (pixelCellWidth === cellWidth && pixelCellHeight === cellHeight && lastPixelCp === cp) {
    return lastPixelGeometry;
  }
  ensurePixelTable(cellWidth, cellHeight);
  lastPixelCp = cp;
  lastPixelGeometry = cp === 32 ? PIXEL_EMPTY : PIXEL_TABLE[cp - GLYPH_CP_MIN] ?? null;
  return lastPixelGeometry;
}

// src/paint.ts
var FLAG_BOLD = 1;
var FLAG_ITALIC = 2;
var FLAG_UNDERLINE = 4;
var FLAG_BLINK = 16;
var FLAG_HIDDEN = 32;
var FLAG_STRIKE = 64;
var FONT_FAMILY = '"JetBrains Mono", ui-monospace, monospace';
var FONT_SIZE = 18;
var CSS_COLOR_CACHE = new Map;
var CSS_COLOR_CACHE_MAX = 512;
function cssColor(packed) {
  const rgb = packed & 16777215;
  const cached = CSS_COLOR_CACHE.get(rgb);
  if (cached !== undefined) {
    return cached;
  }
  const color = `#${rgb.toString(16).padStart(6, "0")}`;
  if (CSS_COLOR_CACHE.size >= CSS_COLOR_CACHE_MAX) {
    const oldest = CSS_COLOR_CACHE.keys().next().value;
    if (oldest !== undefined) {
      CSS_COLOR_CACHE.delete(oldest);
    }
  }
  CSS_COLOR_CACHE.set(rgb, color);
  return color;
}
var FONT_SPEC_CACHE = new Map;
var ASCII_CHARS = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i));
function charFromCodePoint(cp) {
  if (cp < 128) {
    return ASCII_CHARS[cp];
  }
  return String.fromCodePoint(cp);
}
function fontSpec(fontSize, italic, bold, family = FONT_FAMILY) {
  const key = `${family}|${fontSize}|${italic ? 1 : 0}|${bold ? 1 : 0}`;
  const cached = FONT_SPEC_CACHE.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const spec = `${italic ? "italic " : ""}${bold ? "700" : "400"} ${fontSize}px ${family}`;
  FONT_SPEC_CACHE.set(key, spec);
  return spec;
}
var PACKED_NONE = -1;
var DEFAULT_FG_PACKED = 13158600;
function assignFillStyle(ctx, state, color) {
  if (state.fill === color) {
    return;
  }
  ctx.fillStyle = color;
  state.fill = color;
  state.fillPacked = PACKED_NONE;
}
function assignStrokeStyle(ctx, state, color) {
  if (state.stroke === color) {
    return;
  }
  ctx.strokeStyle = color;
  state.stroke = color;
  state.strokePacked = PACKED_NONE;
}
function assignFillPacked(ctx, state, packed) {
  const rgb = packed & 16777215;
  if (state.fillPacked === rgb) {
    return state.fill;
  }
  const color = cssColor(rgb);
  ctx.fillStyle = color;
  state.fill = color;
  state.fillPacked = rgb;
  return color;
}
function assignStrokePacked(ctx, state, packed) {
  const rgb = packed & 16777215;
  if (state.strokePacked === rgb) {
    return state.stroke;
  }
  const color = cssColor(rgb);
  ctx.strokeStyle = color;
  state.stroke = color;
  state.strokePacked = rgb;
  return color;
}
function assignLineWidth(ctx, state, width) {
  if (state.lineWidth === width) {
    return;
  }
  ctx.lineWidth = width;
  state.lineWidth = width;
}
function assignGlobalAlpha(ctx, state, alpha) {
  if (state.alpha === alpha) {
    return;
  }
  ctx.globalAlpha = alpha;
  state.alpha = alpha;
}
function paintGlyph(ctx, cp, x, y, cellWidth, cellHeight, fontSize, packed, italic, bold, paintState, geometry, family) {
  if (geometry) {
    if (geometry.fills.length === 0 && geometry.strokes.length === 0) {
      return;
    }
    if (geometry.fills.length > 0) {
      assignFillPacked(ctx, paintState, packed);
      for (const fill of geometry.fills) {
        assignGlobalAlpha(ctx, paintState, fill.a ?? 1);
        ctx.fillRect(x + fill.x, y + fill.y, fill.w, fill.h);
        PAINT_WORK.fillRects += 1;
      }
    }
    if (geometry.strokes.length > 0) {
      assignStrokePacked(ctx, paintState, packed);
      assignLineWidth(ctx, paintState, geometry.strokes[0].lineWidth);
      ctx.beginPath();
      for (const stroke of geometry.strokes) {
        ctx.moveTo(x + stroke.x1, y + stroke.y1);
        ctx.lineTo(x + stroke.x2, y + stroke.y2);
      }
      ctx.stroke();
      PAINT_WORK.strokes += 1;
    }
    return;
  }
  const spec = fontSpec(fontSize, italic, bold, family);
  if (paintState.spec !== spec) {
    ctx.font = spec;
    paintState.spec = spec;
  }
  assignGlobalAlpha(ctx, paintState, 1);
  assignFillPacked(ctx, paintState, packed);
  const glyph = charFromCodePoint(cp);
  const textX = x + cellWidth / 2;
  const textY = y + cellHeight / 2;
  if (italic) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellWidth, cellHeight);
    ctx.clip();
    ctx.fillText(glyph, textX, textY);
    ctx.restore();
    PAINT_WORK.clips += 1;
    return;
  }
  ctx.fillText(glyph, textX, textY);
}
function emptyPaintWork() {
  return {
    cells: 0,
    hidden: 0,
    letters: 0,
    pixelGlyphs: 0,
    spanCells: 0,
    spanRuns: 0,
    fillRects: 0,
    strokes: 0,
    clips: 0
  };
}
function resetPaintWork(work) {
  work.cells = 0;
  work.hidden = 0;
  work.letters = 0;
  work.pixelGlyphs = 0;
  work.spanCells = 0;
  work.spanRuns = 0;
  work.fillRects = 0;
  work.strokes = 0;
  work.clips = 0;
}
var PAINT_WORK = emptyPaintWork();
function lastPaintWork() {
  return PAINT_WORK;
}
function advanceGridCursor(cursor, frameWidth, originX, cellWidth, cellHeight) {
  cursor.col += 1;
  if (cursor.col === frameWidth) {
    cursor.col = 0;
    cursor.x = originX;
    cursor.y += cellHeight;
  } else {
    cursor.x += cellWidth;
  }
}
function extendGlyphSpanRun(run, geometry, x, y, cellWidth, packed, bg) {
  if (run.geometry === geometry && run.w !== 0 && run.packed === packed && run.bg === bg && run.y === y && x === run.x + run.w) {
    run.w += cellWidth;
    return true;
  }
  return false;
}
function paintGlyphSpanRun(ctx, state, run, cellHeight) {
  const geometry = run.geometry;
  if (run.w === 0 || geometry === null) {
    return;
  }
  PAINT_WORK.spanRuns += 1;
  if (run.bg && !geometry.covers) {
    assignGlobalAlpha(ctx, state, 1);
    assignFillPacked(ctx, state, run.bg);
    ctx.fillRect(run.x, run.y, run.w, cellHeight);
    PAINT_WORK.fillRects += 1;
  }
  assignFillPacked(ctx, state, run.packed);
  for (const fill of geometry.fills) {
    assignGlobalAlpha(ctx, state, fill.a ?? 1);
    ctx.fillRect(run.x + fill.x, run.y + fill.y, run.w, fill.h);
    PAINT_WORK.fillRects += 1;
  }
  run.w = 0;
  run.geometry = null;
}
var PAINT_STATE = {
  spec: "",
  fill: "",
  stroke: "",
  fillPacked: PACKED_NONE,
  strokePacked: PACKED_NONE,
  lineWidth: 0,
  alpha: 1
};
var PAINT_CURSOR = { col: 0, x: 0, y: 0 };
var PAINT_SPAN_RUN = {
  geometry: null,
  x: 0,
  y: 0,
  w: 0,
  packed: PACKED_NONE,
  bg: 0
};
function paintFrame(ctx, metrics, symbols, fg, bg, flags, frameWidth, frameHeight, blinkOn, fontFamily = FONT_FAMILY) {
  const { cellWidth, cellHeight, fontSize, cssWidth, cssHeight } = metrics;
  resetPaintWork(PAINT_WORK);
  assignGlobalAlpha(ctx, PAINT_STATE, 1);
  assignFillPacked(ctx, PAINT_STATE, 0);
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  PAINT_WORK.fillRects += 1;
  if (frameWidth <= 0 || frameHeight <= 0) {
    return;
  }
  const originX = Math.floor((cssWidth - frameWidth * cellWidth) / 2);
  const originY = Math.floor((cssHeight - frameHeight * cellHeight) / 2);
  const cellCount = frameWidth * frameHeight;
  PAINT_CURSOR.col = 0;
  PAINT_CURSOR.x = originX;
  PAINT_CURSOR.y = originY;
  PAINT_SPAN_RUN.w = 0;
  PAINT_SPAN_RUN.geometry = null;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  for (let index = 0;index < cellCount; index++) {
    const cp = symbols[index] ?? 0;
    const x = PAINT_CURSOR.x;
    const y = PAINT_CURSOR.y;
    const cellFlags = flags[index] ?? 0;
    const hide = cp === 32 || (cellFlags & FLAG_HIDDEN) !== 0 || (cellFlags & FLAG_BLINK) !== 0 && !blinkOn;
    const geometry = hide ? null : pixelGlyphGeometryForCodePoint(cp, cellWidth, cellHeight);
    const span = geometry !== null && geometry.span && (cellFlags & (FLAG_UNDERLINE | FLAG_STRIKE)) === 0;
    PAINT_WORK.cells += 1;
    if (hide) {
      PAINT_WORK.hidden += 1;
    } else if (span) {
      PAINT_WORK.spanCells += 1;
    } else if (geometry) {
      PAINT_WORK.pixelGlyphs += 1;
    } else {
      PAINT_WORK.letters += 1;
    }
    if (span) {
      const cellFg = fg[index] ?? 0;
      const packed = cellFg === 0 ? DEFAULT_FG_PACKED : cellFg;
      const cellBg = geometry.covers ? 0 : bg[index] ?? 0;
      if (!extendGlyphSpanRun(PAINT_SPAN_RUN, geometry, x, y, cellWidth, packed, cellBg)) {
        paintGlyphSpanRun(ctx, PAINT_STATE, PAINT_SPAN_RUN, cellHeight);
        PAINT_SPAN_RUN.geometry = geometry;
        PAINT_SPAN_RUN.x = x;
        PAINT_SPAN_RUN.y = y;
        PAINT_SPAN_RUN.w = cellWidth;
        PAINT_SPAN_RUN.packed = packed;
        PAINT_SPAN_RUN.bg = cellBg;
      }
    } else {
      paintGlyphSpanRun(ctx, PAINT_STATE, PAINT_SPAN_RUN, cellHeight);
      const cellBg = bg[index] ?? 0;
      if (cellBg && (hide || !geometry?.covers)) {
        assignGlobalAlpha(ctx, PAINT_STATE, 1);
        assignFillPacked(ctx, PAINT_STATE, cellBg);
        ctx.fillRect(x, y, cellWidth, cellHeight);
        PAINT_WORK.fillRects += 1;
      }
      if (!hide) {
        const cellFg = fg[index] ?? 0;
        const packed = cellFg === 0 ? DEFAULT_FG_PACKED : cellFg;
        paintGlyph(ctx, cp, x, y, cellWidth, cellHeight, fontSize, packed, (cellFlags & FLAG_ITALIC) !== 0, (cellFlags & FLAG_BOLD) !== 0, PAINT_STATE, geometry, fontFamily);
        if (cellFlags & (FLAG_UNDERLINE | FLAG_STRIKE)) {
          assignGlobalAlpha(ctx, PAINT_STATE, 1);
          assignFillPacked(ctx, PAINT_STATE, packed);
          if (cellFlags & FLAG_UNDERLINE) {
            ctx.fillRect(x, y + cellHeight - 1, cellWidth, 1);
            PAINT_WORK.fillRects += 1;
          }
          if (cellFlags & FLAG_STRIKE) {
            ctx.fillRect(x, y + Math.floor(cellHeight / 2), cellWidth, 1);
            PAINT_WORK.fillRects += 1;
          }
        }
      }
    }
    advanceGridCursor(PAINT_CURSOR, frameWidth, originX, cellWidth, cellHeight);
  }
  paintGlyphSpanRun(ctx, PAINT_STATE, PAINT_SPAN_RUN, cellHeight);
}
export {
  FLAG_BLINK,
  FLAG_BOLD,
  FLAG_HIDDEN,
  FLAG_ITALIC,
  FLAG_STRIKE,
  FLAG_UNDERLINE,
  FONT_FAMILY,
  FONT_SIZE,
  advanceGridCursor,
  assignFillPacked,
  assignFillStyle,
  assignGlobalAlpha,
  assignLineWidth,
  assignStrokePacked,
  assignStrokeStyle,
  charFromCodePoint,
  cssColor,
  emptyPaintWork,
  extendGlyphSpanRun,
  fontSpec,
  lastPaintWork,
  paintFrame,
  paintGlyphSpanRun,
  resetPaintWork
};
