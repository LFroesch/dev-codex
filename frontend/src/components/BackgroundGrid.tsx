import { useRef, useEffect, useCallback } from 'react';

type Zone = 'left' | 'right' | 'top' | 'bottom';

interface SnakeState {
  d: string;
  color: 'primary' | 'secondary' | 'accent';
  dashLen: number;
  gapLen: number;
  dur: number;
  reverse: boolean;
  opacity: number;
  zone: Zone;
  templateIdx: number;
  strokeWidth: number;
}

const jitter = (base: number, range = 12) => base + (Math.random() - 0.5) * range;
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const f = (n: number) => n.toFixed(0);
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length)];

// --- PCB-style path builder: tight 90° turns at waypoints ---

const TURN_R = 10;

const circuit = (pts: [number, number][]): string => {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i < pts.length - 1) {
      const [px, py] = pts[i - 1];
      const [nx, ny] = pts[i + 1];
      const dx1 = x - px, dy1 = y - py;
      const dx2 = nx - x, dy2 = ny - y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const r = Math.min(TURN_R, len1 / 2, len2 / 2);
      if (r > 1 && len1 > 0 && len2 > 0) {
        const ax = x - (dx1 / len1) * r;
        const ay = y - (dy1 / len1) * r;
        const bx = x + (dx2 / len2) * r;
        const by = y + (dy2 / len2) * r;
        d += ` L${f(ax)},${f(ay)} Q${f(x)},${f(y)} ${f(bx)},${f(by)}`;
      } else {
        d += ` L${f(x)},${f(y)}`;
      }
    } else {
      d += ` L${f(x)},${f(y)}`;
    }
  }
  return d;
};

// --- Templates: circuit traces routed from edges into the board ---

// Templates return point arrays — circuit() and extendToEdge() applied in makeSnake
type PointTemplate = () => [number, number][];

// Left templates — spaced ~50px, alternating shallow/deep X to avoid overlap
// All exit at an edge (y=0, y=700, or x=0)
const leftTemplates: PointTemplate[] = [
  // y~30 — shallow, exits top
  () => {
    const y1 = jitter(30, 8), x1 = jitter(55, 8);
    return [[0, y1], [x1, y1], [x1, 0]];
  },
  // y~80 — deep, exits top
  () => {
    const y1 = jitter(80, 8), x1 = jitter(180, 15), y2 = jitter(40, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x1, 0]];
  },
  // y~135 — shallow, drops to bottom
  () => {
    const y1 = jitter(135, 8), x1 = jitter(70, 8), y2 = jitter(220, 10);
    const x2 = jitter(45, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~190 — deep, exits bottom
  () => {
    const y1 = jitter(190, 8), x1 = jitter(250, 20), y2 = jitter(280, 10);
    const x2 = jitter(200, 15);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~250 — shallow, exits top via jog
  () => {
    const y1 = jitter(250, 8), x1 = jitter(85, 8), y2 = jitter(170, 10);
    const x2 = jitter(55, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 0]];
  },
  // y~310 — deep, exits bottom
  () => {
    const y1 = jitter(310, 8), x1 = jitter(140, 12), y2 = jitter(440, 15);
    const x2 = jitter(90, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~370 — very deep bus, exits bottom
  () => {
    const y1 = jitter(370, 8), x1 = jitter(280, 20), y2 = jitter(450, 10);
    const x2 = jitter(320, 15);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~420 — shallow, exits bottom
  () => {
    const y1 = jitter(420, 8), x1 = jitter(65, 8), y2 = jitter(520, 10);
    return [[0, y1], [x1, y1], [x1, y2], [x1, 700]];
  },
  // y~480 — deep, serpentine, exits bottom
  () => {
    const y1 = jitter(480, 8), x1 = jitter(170, 12), y2 = jitter(540, 8);
    const x2 = jitter(120, 10), y3 = jitter(600, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, y3], [x2, 700]];
  },
  // y~540 — shallow, exits bottom
  () => {
    const y1 = jitter(540, 8), x1 = jitter(80, 8), y2 = jitter(620, 10);
    const x2 = jitter(50, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~600 — deep, exits bottom
  () => {
    const y1 = jitter(600, 8), x1 = jitter(200, 15), y2 = jitter(660, 8);
    return [[0, y1], [x1, y1], [x1, y2], [x1, 700]];
  },
  // y~660 — shallow, exits bottom
  () => {
    const y1 = jitter(660, 8), x1 = jitter(60, 8);
    return [[0, y1], [x1, y1], [x1, 700]];
  },
  // from top edge x~40 — exits bottom
  () => {
    const x1 = jitter(35, 6), y1 = jitter(80, 8), x2 = jitter(100, 10);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 700]];
  },
  // from top edge x~110 — exits left
  () => {
    const x1 = jitter(110, 8), y1 = jitter(150, 10), x2 = jitter(60, 8);
    return [[x1, 0], [x1, y1], [x2, y1], [0, y1]];
  },
];

// Right templates — mirrored left, all exit at an edge
const rightTemplates: PointTemplate[] = [
  // y~30 — shallow, exits top
  () => {
    const y1 = jitter(30, 8), x1 = jitter(945, 8);
    return [[1000, y1], [x1, y1], [x1, 0]];
  },
  // y~80 — deep, exits top
  () => {
    const y1 = jitter(80, 8), x1 = jitter(820, 15), y2 = jitter(40, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x1, 0]];
  },
  // y~135 — shallow, exits bottom
  () => {
    const y1 = jitter(135, 8), x1 = jitter(930, 8), y2 = jitter(220, 10);
    const x2 = jitter(955, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~190 — deep, exits bottom
  () => {
    const y1 = jitter(190, 8), x1 = jitter(750, 20), y2 = jitter(280, 10);
    const x2 = jitter(800, 15);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~250 — shallow, exits top
  () => {
    const y1 = jitter(250, 8), x1 = jitter(915, 8), y2 = jitter(170, 10);
    const x2 = jitter(945, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 0]];
  },
  // y~310 — deep, exits bottom
  () => {
    const y1 = jitter(310, 8), x1 = jitter(860, 12), y2 = jitter(440, 15);
    const x2 = jitter(910, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~370 — very deep bus, exits bottom
  () => {
    const y1 = jitter(370, 8), x1 = jitter(720, 20), y2 = jitter(450, 10);
    const x2 = jitter(680, 15);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~420 — shallow, exits bottom
  () => {
    const y1 = jitter(420, 8), x1 = jitter(935, 8), y2 = jitter(520, 10);
    return [[1000, y1], [x1, y1], [x1, y2], [x1, 700]];
  },
  // y~480 — deep, serpentine, exits bottom
  () => {
    const y1 = jitter(480, 8), x1 = jitter(830, 12), y2 = jitter(540, 8);
    const x2 = jitter(880, 10), y3 = jitter(600, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, y3], [x2, 700]];
  },
  // y~540 — shallow, exits bottom
  () => {
    const y1 = jitter(540, 8), x1 = jitter(920, 8), y2 = jitter(620, 10);
    const x2 = jitter(950, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x2, y2], [x2, 700]];
  },
  // y~600 — deep, exits bottom
  () => {
    const y1 = jitter(600, 8), x1 = jitter(800, 15), y2 = jitter(660, 8);
    return [[1000, y1], [x1, y1], [x1, y2], [x1, 700]];
  },
  // y~660 — shallow, exits bottom
  () => {
    const y1 = jitter(660, 8), x1 = jitter(940, 8);
    return [[1000, y1], [x1, y1], [x1, 700]];
  },
  // from top edge x~960 — exits bottom
  () => {
    const x1 = jitter(965, 6), y1 = jitter(80, 8), x2 = jitter(900, 10);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 700]];
  },
  // from top edge x~890 — exits right
  () => {
    const x1 = jitter(890, 8), y1 = jitter(150, 10), x2 = jitter(940, 8);
    return [[x1, 0], [x1, y1], [x2, y1], [1000, y1]];
  },
];

// Top templates — all exit at bottom, left, or right edge
const topTemplates: PointTemplate[] = [
  // x~100 — drops down, exits left
  () => {
    const x1 = jitter(100, 15), y1 = jitter(85, 8);
    return [[x1, 0], [x1, y1], [0, y1]];
  },
  // x~200 — bump, exits back to top
  () => {
    const x1 = jitter(200, 15), y1 = jitter(55, 8), x2 = jitter(280, 15);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 0]];
  },
  // x~350 — deep drop, exits bottom
  () => {
    const x1 = jitter(350, 15), y1 = jitter(120, 10), x2 = jitter(300, 10);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 700]];
  },
  // x~450 — deep U, exits back to top
  () => {
    const x1 = jitter(440, 15), y1 = jitter(140, 15), x2 = jitter(540, 15);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 0]];
  },
  // x~550 — double-drop bus
  () => {
    const x1 = jitter(550, 15), y1 = jitter(40, 6), x2 = jitter(620, 15);
    const y2 = jitter(75, 8), x3 = jitter(680, 15);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, y2], [x3, y2], [x3, 0]];
  },
  // x~700 — bump, exits back to top
  () => {
    const x1 = jitter(700, 15), y1 = jitter(50, 8), x2 = jitter(780, 15);
    return [[x1, 0], [x1, y1], [x2, y1], [x2, 0]];
  },
  // x~850 — drops, exits right
  () => {
    const x1 = jitter(850, 15), y1 = jitter(65, 8);
    return [[x1, 0], [x1, y1], [1000, y1]];
  },
  // x~950 — pin drop, exits right
  () => {
    const x1 = jitter(950, 10), y1 = jitter(80, 8), x2 = jitter(975, 6);
    return [[x1, 0], [x1, y1], [x2, y1], [1000, y1]];
  },
];

// Bottom templates — all exit at top, left, or right edge
const bottomTemplates: PointTemplate[] = [
  // x~100 — rises, exits left
  () => {
    const x1 = jitter(100, 15), y1 = jitter(620, 8);
    return [[x1, 700], [x1, y1], [0, y1]];
  },
  // x~230 — bump, exits back to bottom
  () => {
    const x1 = jitter(230, 15), y1 = jitter(648, 8), x2 = jitter(330, 15);
    return [[x1, 700], [x1, y1], [x2, y1], [x2, 700]];
  },
  // x~400 — deep rise, exits top
  () => {
    const x1 = jitter(400, 15), y1 = jitter(580, 10), x2 = jitter(450, 10);
    return [[x1, 700], [x1, y1], [x2, y1], [x2, 0]];
  },
  // x~520 — U-rise, exits back to bottom
  () => {
    const x1 = jitter(520, 15), y1 = jitter(560, 15), x2 = jitter(610, 15);
    return [[x1, 700], [x1, y1], [x2, y1], [x2, 700]];
  },
  // x~680 — double-rise bus
  () => {
    const x1 = jitter(680, 15), y1 = jitter(660, 6), x2 = jitter(740, 15);
    const y2 = jitter(625, 8), x3 = jitter(800, 15);
    return [[x1, 700], [x1, y1], [x2, y1], [x2, y2], [x3, y2], [x3, 700]];
  },
  // x~850 — bump, exits back to bottom
  () => {
    const x1 = jitter(850, 15), y1 = jitter(645, 8), x2 = jitter(920, 15);
    return [[x1, 700], [x1, y1], [x2, y1], [x2, 700]];
  },
  // x~50 — pin rise, exits left
  () => {
    const x1 = jitter(50, 10), y1 = jitter(630, 8);
    return [[x1, 700], [x1, y1], [0, y1]];
  },
  // x~960 — rise, exits right
  () => {
    const x1 = jitter(960, 10), y1 = jitter(625, 8);
    return [[x1, 700], [x1, y1], [1000, y1]];
  },
];

const templatesByZone: Record<Zone, PointTemplate[]> = {
  left: leftTemplates,
  right: rightTemplates,
  top: topTemplates,
  bottom: bottomTemplates,
};

// Each template's "entry" coordinate for spacing — Y for left/right, X for top/bottom
const TEMPLATE_ENTRY: Record<Zone, number[]> = {
  left:   [30, 80, 135, 190, 250, 310, 370, 420, 480, 540, 600, 660, 35, 110],
  right:  [30, 80, 135, 190, 250, 310, 370, 420, 480, 540, 600, 660, 965, 890],
  top:    [100, 200, 350, 450, 550, 700, 850, 950],
  bottom: [100, 230, 400, 520, 680, 850, 50, 960],
};

const SNAKE_COUNT: Record<Zone, number> = {
  left: 9, right: 9, top: 5, bottom: 5,
};

// Pick template that favors distance from active snakes (with randomness)
const makeSnake = (zone: Zone, excludeIdxs: Set<number>, activeEntries?: number[]): SnakeState => {
  const templates = templatesByZone[zone];
  const entries = TEMPLATE_ENTRY[zone];
  const available = Array.from({ length: templates.length }, (_, i) => i)
    .filter(i => !excludeIdxs.has(i));

  let idx: number;
  if (available.length === 0) {
    idx = randInt(0, templates.length);
  } else if (!activeEntries || activeEntries.length === 0) {
    idx = available[randInt(0, available.length)];
  } else {
    // Score each available template, pick randomly from top 3 best-spaced
    const scored = available.map(i => ({
      i,
      dist: Math.min(...activeEntries.map(e => Math.abs(entries[i] - e))),
    }));
    scored.sort((a, b) => b.dist - a.dist);
    const topN = scored.slice(0, Math.min(3, scored.length));
    idx = topN[randInt(0, topN.length)].i;
  }

  const pts = templates[idx]();
  const isSide = zone === 'left' || zone === 'right';
  return {
    d: circuit(pts),
    color: pick(['primary', 'secondary', 'accent'] as const),
    dashLen:randInt(40, 75),
    gapLen:randInt(450, 500),
    dur: isSide ? rand(12, 30) : rand(12, 25),
    reverse: Math.random() > 0.5,
    opacity: rand(0.15, 0.30),
    zone,
    templateIdx: idx,
    strokeWidth: rand(2.5, 7),
  };
};

interface SnakeSlot {
  zone: Zone;
  state: SnakeState;
  tracePath: SVGPathElement | null;
  trailPath: SVGPathElement | null;
  headPath: SVGPathElement | null;
  startTime: number;
  progress: number;
  initialDelay: number;
}

const BackgroundGrid = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const slotsRef = useRef<SnakeSlot[]>([]);
  const rafRef = useRef<number>(0);

  const initSlots = useCallback(() => {
    const slots: SnakeSlot[] = [];
    const zones: Zone[] = ['left', 'right', 'top', 'bottom'];
    const usedByZone: Record<Zone, Set<number>> = {
      left: new Set(), right: new Set(), top: new Set(), bottom: new Set(),
    };

    // Interleave zones so snakes appear across all sides simultaneously
    const activeEntries: Record<Zone, number[]> = {
      left: [], right: [], top: [], bottom: [],
    };
    const maxCount = Math.max(...Object.values(SNAKE_COUNT));
    for (let i = 0; i < maxCount; i++) {
      for (const zone of zones) {
        if (i >= SNAKE_COUNT[zone]) continue;
        const state = makeSnake(zone, usedByZone[zone], activeEntries[zone]);
        usedByZone[zone].add(state.templateIdx);
        activeEntries[zone].push(TEMPLATE_ENTRY[zone][state.templateIdx]);
        slots.push({
          zone,
          state,
          tracePath: null,
          trailPath: null,
          headPath: null,
          startTime: 0,
          progress: 0,
          initialDelay: rand(i * 0.4, i * 0.4 + 1.5),
        });
      }
    }
    return slots;
  }, []);

  const applyState = useCallback((slot: SnakeSlot) => {
    const { state, tracePath, trailPath, headPath } = slot;
    if (!tracePath || !trailPath || !headPath) return;

    const colorVar = state.color === 'primary' ? 'p' : state.color === 'accent' ? 'a' : 's';
    const strokeColor = `var(--${colorVar})`;

    // Start everything invisible — the animation loop handles reveal
    tracePath.setAttribute('d', state.d);
    tracePath.style.stroke = `oklch(${strokeColor})`;
    tracePath.style.strokeOpacity = '0';
    tracePath.style.strokeWidth = String(state.strokeWidth);

    const trailDash = state.dashLen * 2.5;
    const trailGap = state.gapLen;
    trailPath.setAttribute('d', state.d);
    trailPath.style.stroke = `oklch(${strokeColor})`;
    trailPath.style.strokeOpacity = '0';
    trailPath.style.strokeWidth = String(state.strokeWidth + 1);
    trailPath.setAttribute('stroke-dasharray', `${trailDash.toFixed(0)} ${trailGap.toFixed(0)}`);

    const headTotal = state.dashLen + state.gapLen;
    headPath.setAttribute('d', state.d);
    headPath.style.stroke = `oklch(${strokeColor})`;
    headPath.style.strokeOpacity = '0';
    headPath.style.strokeWidth = String(state.strokeWidth);
    headPath.setAttribute('stroke-dasharray', `${state.dashLen} ${state.gapLen}`);
    headPath.setAttribute('stroke-dashoffset', String(state.reverse ? -headTotal : 0));
    headPath.setAttribute('filter', 'url(#snake-glow)');
  }, []);

  const animate = useCallback((timestamp: number) => {
    const slots = slotsRef.current;
    for (const slot of slots) {
      if (!slot.headPath) continue;
      if (slot.startTime === 0) slot.startTime = timestamp;

      const elapsed = (timestamp - slot.startTime) / 1000;

      // Stagger initial appearance
      if (elapsed < slot.initialDelay) {
        slot.headPath.style.strokeOpacity = '0';
        slot.trailPath!.style.strokeOpacity = '0';
        slot.tracePath!.style.strokeOpacity = '0';
        continue;
      }

      const activeElapsed = elapsed - slot.initialDelay;
      const progress = Math.min(activeElapsed / slot.state.dur, 1);
      slot.progress = progress;

      // Smooth fade in (10%), gentle fade out (15%)
      let fade = 1;
      if (progress < 0.10) fade = progress / 0.10;
      else if (progress > 0.85) fade = (1 - progress) / 0.15;

      const { state } = slot;
      const headTotal = state.dashLen + state.gapLen;
      const headOffset = state.reverse
        ? -headTotal * (1 - progress)
        : -headTotal * progress;

      // Trail uses a longer dash but must stay centered on the head dash.
      // Offset the trail so its dash midpoint aligns with the head's dash midpoint.
      const trailDash = state.dashLen * 2.5;
      const trailGap = state.gapLen;
      const trailTotal = trailDash + trailGap;
      const headMid = headOffset + state.dashLen / 2;
      const trailOffset = headMid - trailDash / 2;

      slot.headPath.setAttribute('stroke-dashoffset', String(headOffset));
      slot.headPath.style.strokeOpacity = String(state.opacity * fade);
      slot.trailPath!.setAttribute('stroke-dashoffset', String(trailOffset));
      slot.trailPath!.style.strokeOpacity = String(state.opacity * 0.3 * fade);
      slot.tracePath!.style.strokeOpacity = String(0.035 * fade);

      if (progress >= 1) {
        const siblings = slots.filter(s => s !== slot && s.zone === slot.zone);
        const inUse = new Set(siblings.map(s => s.state.templateIdx));
        const entries = siblings.map(s => TEMPLATE_ENTRY[s.zone][s.state.templateIdx]);
        slot.state = makeSnake(slot.zone, inUse, entries);
        slot.startTime = timestamp;
        slot.initialDelay = 0;
        slot.progress = 0;
        applyState(slot);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [applyState]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const slots = initSlots();
    slotsRef.current = slots;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('stroke-linejoin', 'round');

    for (const slot of slots) {
      const trace = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      slot.tracePath = trace;
      slot.trailPath = trail;
      slot.headPath = head;
      applyState(slot);

      g.appendChild(trace);
      g.appendChild(trail);
      g.appendChild(head);
    }

    svg.appendChild(g);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      svg.removeChild(g);
    };
  }, [initSlots, applyState, animate]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-base-100">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="glow-tl" cx="5%" cy="10%" r="30%">
            <stop offset="0%" className="[stop-color:oklch(var(--p))]" stopOpacity="0.04" />
            <stop offset="100%" className="[stop-color:oklch(var(--p))]" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-br" cx="95%" cy="90%" r="30%">
            <stop offset="0%" className="[stop-color:oklch(var(--s))]" stopOpacity="0.03" />
            <stop offset="100%" className="[stop-color:oklch(var(--s))]" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="700" fill="url(#glow-tl)" />
        <rect width="1000" height="700" fill="url(#glow-br)" />
      </svg>
    </div>
  );
};

export default BackgroundGrid;
