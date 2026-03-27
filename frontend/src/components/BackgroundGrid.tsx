import { useRef, useEffect, useCallback } from 'react';

type Zone = 'left' | 'right' | 'top' | 'bottom';

interface SnakeState {
  d: string;
  color: 'primary' | 'secondary';
  dashLen: number;
  gapLen: number;
  dur: number; // seconds
  reverse: boolean;
  opacity: number;
  zone: Zone;
  templateIdx: number;
}

const jitter = (base: number, range = 30) => base + (Math.random() - 0.5) * range;
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const f = (n: number) => n.toFixed(0);

// --- Path templates (original hand-crafted structure + jitter) ---

const leftTemplates = [
  () => {
    const y1=jitter(80),y2=jitter(120),y3=jitter(200),y4=jitter(250),y5=jitter(340),y6=jitter(380),y7=jitter(460);
    const x1=jitter(60,20),x2=jitter(30,15),x3=jitter(50,20);
    return `M0,${f(y1)} Q40,${f(y1)} ${f(x1)},${f(y2)} L${f(x1)},${f(y3)} Q${f(x1)},${f(jitter(230,15))} ${f(x2)},${f(y4)} L${f(x2)},${f(y5)} Q${f(x2)},${f(jitter(360,15))} ${f(x3)},${f(y6)} L${f(x3)},${f(y7)}`;
  },
  () => {
    const y1=jitter(300),x1=jitter(80,20),x2=jitter(120,20),x3=jitter(150,20);
    const y2=jitter(330),y3=jitter(360),y4=jitter(450),y5=jitter(500);
    const x4=jitter(80,20),y6=jitter(540),x5=jitter(60,15),y7=jitter(600);
    return `M0,${f(y1)} Q50,${f(y1)} ${f(x1)},${f(y2)} L${f(x2)},${f(y2)} Q${f(x3)},${f(y2)} ${f(x3)},${f(y3)} L${f(x3)},${f(y4)} Q${f(x3)},${f(jitter(480,15))} ${f(jitter(120,15))},${f(y5)} L${f(x4)},${f(y6)} Q${f(x5)},${f(jitter(560,15))} ${f(x5)},${f(y7)} L${f(x5)},700`;
  },
  () => {
    const x0=jitter(30,15),x1=jitter(60,20),x2=jitter(120,20),x3=jitter(170,20);
    const y1=jitter(60,20),y2=jitter(90),y3=jitter(160),y4=jitter(200);
    const x4=jitter(140,15),x5=jitter(90,15),x6=jitter(50,15);
    return `M${f(x0)},0 Q${f(x0)},${f(jitter(40,15))} ${f(x1)},${f(y1)} L${f(x2)},${f(y1)} Q${f(jitter(150,15))},${f(y1)} ${f(x3)},${f(y2)} L${f(x3)},${f(y3)} Q${f(x3)},${f(jitter(190,15))} ${f(x4)},${f(y4)} L${f(x5)},${f(y4)} Q${f(jitter(60,15))},${f(y4)} ${f(x6)},${f(jitter(230))}`;
  },
  () => {
    const y1=jitter(520),x1=jitter(70,20),y2=jitter(560),x2=jitter(100,20);
    const y3=jitter(610),x3=jitter(40,15),y4=jitter(660);
    return `M0,${f(y1)} Q${f(jitter(35,10))},${f(y1)} ${f(x1)},${f(y2)} L${f(x2)},${f(y2)} Q${f(jitter(120,15))},${f(y2)} ${f(x2)},${f(y3)} L${f(x3)},${f(y3)} Q${f(jitter(20,10))},${f(y3)} ${f(x3)},${f(y4)} L${f(x3)},700`;
  },
];

const rightTemplates = [
  () => {
    const y1=jitter(120),x1=jitter(940,20),y2=jitter(150),y3=jitter(240);
    const x2=jitter(970,15),y4=jitter(290),y5=jitter(380),x3=jitter(950,20),y6=jitter(420);
    return `M1000,${f(y1)} Q${f(jitter(960,15))},${f(y1)} ${f(x1)},${f(y2)} L${f(x1)},${f(y3)} Q${f(x1)},${f(jitter(270,15))} ${f(x2)},${f(y4)} L${f(x2)},${f(y5)} Q${f(x2)},${f(jitter(400,15))} ${f(x3)},${f(y6)} L${f(x3)},${f(jitter(500))}`;
  },
  () => {
    const y1=jitter(400),x1=jitter(920,20),x2=jitter(880,20),y2=jitter(430);
    const x3=jitter(850,20),y3=jitter(460),y4=jitter(540),x4=jitter(880,20);
    const y5=jitter(590),x5=jitter(920,20),y6=jitter(620),x6=jitter(940,15);
    return `M1000,${f(y1)} Q${f(jitter(950,15))},${f(y1)} ${f(x1)},${f(y2)} L${f(x2)},${f(y2)} Q${f(x3)},${f(y2)} ${f(x3)},${f(y3)} L${f(x3)},${f(y4)} Q${f(x3)},${f(jitter(570,15))} ${f(x4)},${f(y5)} L${f(x5)},${f(y6)} Q${f(x6)},${f(jitter(640,15))} ${f(x6)},${f(jitter(670,15))} L${f(x6)},700`;
  },
  () => {
    const x0=jitter(970,15),x1=jitter(940,20),y1=jitter(60,20);
    const x2=jitter(880,20),x3=jitter(830,20),y2=jitter(90),y3=jitter(150);
    const x4=jitter(860,15),y4=jitter(200),x5=jitter(910,15),x6=jitter(950,15);
    return `M${f(x0)},0 Q${f(x0)},${f(jitter(40,15))} ${f(x1)},${f(y1)} L${f(x2)},${f(y1)} Q${f(jitter(850,15))},${f(y1)} ${f(x3)},${f(y2)} L${f(x3)},${f(y3)} Q${f(x3)},${f(jitter(180,15))} ${f(x4)},${f(y4)} L${f(x5)},${f(y4)} Q${f(jitter(940,15))},${f(y4)} ${f(x6)},${f(jitter(230))}`;
  },
  () => {
    const y1=jitter(50,20),x2=jitter(930,20),y2=jitter(80);
    const y3=jitter(130),x3=jitter(960,15),y4=jitter(170);
    return `M1000,${f(y1)} Q${f(jitter(960,15))},${f(y1)} ${f(x2)},${f(y2)} L${f(x2)},${f(y3)} Q${f(x2)},${f(jitter(145,10))} ${f(x3)},${f(y4)} L${f(x3)},${f(jitter(210,20))}`;
  },
];

const topTemplates = [
  () => {
    const x1=jitter(250,40),x2=jitter(270,20),x3=jitter(340,20),x4=jitter(370,40);
    const y1=jitter(30,10),y2=jitter(60,15),y3=jitter(40,10);
    return `M${f(x1)},0 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(50,10))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(360,15))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},0`;
  },
  () => {
    const x1=jitter(600,40),x2=jitter(620,20),x3=jitter(680,20),x4=jitter(710,40);
    const y1=jitter(25,10),y2=jitter(55,15),y3=jitter(35,10);
    return `M${f(x1)},0 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(45,10))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(700,15))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},0`;
  },
  () => {
    const x1=jitter(450,40),x2=jitter(470,20),x3=jitter(530,20),x4=jitter(550,40);
    const y1=jitter(20,8),y2=jitter(45,12),y3=jitter(25,8);
    return `M${f(x1)},0 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(35,8))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(540,10))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},0`;
  },
];

const bottomTemplates = [
  () => {
    const x1=jitter(300,40),x2=jitter(320,20),x3=jitter(380,20),x4=jitter(410,40);
    const y1=jitter(670,10),y2=jitter(640,15),y3=jitter(660,10);
    return `M${f(x1)},700 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(650,10))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(400,15))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},700`;
  },
  () => {
    const x1=jitter(650,40),x2=jitter(670,20),x3=jitter(730,20),x4=jitter(760,40);
    const y1=jitter(675,10),y2=jitter(645,15),y3=jitter(665,10);
    return `M${f(x1)},700 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(655,10))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(750,15))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},700`;
  },
  () => {
    const x1=jitter(500,40),x2=jitter(520,20),x3=jitter(580,20),x4=jitter(600,40);
    const y1=jitter(680,8),y2=jitter(655,12),y3=jitter(675,8);
    return `M${f(x1)},700 L${f(x1)},${f(y1)} Q${f(x1)},${f(jitter(665,8))} ${f(x2)},${f(y2)} L${f(x3)},${f(y2)} Q${f(jitter(590,10))},${f(y2)} ${f(x4)},${f(y3)} L${f(x4)},700`;
  },
];

const templatesByZone: Record<Zone, Array<() => string>> = {
  left: leftTemplates,
  right: rightTemplates,
  top: topTemplates,
  bottom: bottomTemplates,
};

const makeSnake = (zone: Zone, lastIdx: number): SnakeState => {
  const templates = templatesByZone[zone];
  let idx: number;
  if (templates.length > 1) {
    do { idx = randInt(0, templates.length); } while (idx === lastIdx);
  } else {
    idx = 0;
  }
  const isSide = zone === 'left' || zone === 'right';
  return {
    d: templates[idx](),
    color: (zone === 'left' || zone === 'top') ? 'primary' : 'secondary',
    dashLen: isSide ? randInt(30, 50) : randInt(20, 35),
    gapLen: isSide ? randInt(400, 550) : randInt(180, 250),
    dur: isSide ? rand(10, 18) : rand(8, 13),
    reverse: Math.random() > 0.5,
    opacity: rand(0.10, 0.22),
    zone,
    templateIdx: idx,
  };
};

// Each snake slot: owns refs for its 3 path elements, drives animation via rAF
interface SnakeSlot {
  zone: Zone;
  state: SnakeState;
  tracePath: SVGPathElement | null;
  trailPath: SVGPathElement | null;
  headPath: SVGPathElement | null;
  startTime: number;
  progress: number; // 0→1
}

const BackgroundGrid = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const slotsRef = useRef<SnakeSlot[]>([]);
  const rafRef = useRef<number>(0);

  // Build initial slots once
  const initSlots = useCallback(() => {
    const slots: SnakeSlot[] = [];
    const zones: Zone[] = ['left', 'right', 'top', 'bottom'];
    for (const zone of zones) {
      const count = templatesByZone[zone].length;
      for (let i = 0; i < count; i++) {
        slots.push({
          zone,
          state: makeSnake(zone, -1),
          tracePath: null,
          trailPath: null,
          headPath: null,
          startTime: 0,
          progress: 0,
        });
      }
    }
    return slots;
  }, []);

  // Apply current snake state to DOM elements
  const applyState = useCallback((slot: SnakeSlot) => {
    const { state, tracePath, trailPath, headPath } = slot;
    if (!tracePath || !trailPath || !headPath) return;

    const strokeColor = `var(--${state.color === 'primary' ? 'p' : 's'})`;

    // Trace (static dim path)
    tracePath.setAttribute('d', state.d);
    tracePath.style.stroke = `oklch(${strokeColor})`;
    tracePath.style.strokeOpacity = '0.04';

    // Trail
    const trailDash = state.dashLen * 2.5;
    const trailGap = state.gapLen;
    trailPath.setAttribute('d', state.d);
    trailPath.style.stroke = `oklch(${strokeColor})`;
    trailPath.style.strokeOpacity = String(state.opacity * 0.35);
    trailPath.style.strokeWidth = '2.5';
    trailPath.setAttribute('stroke-dasharray', `${trailDash.toFixed(0)} ${trailGap.toFixed(0)}`);

    // Head
    headPath.setAttribute('d', state.d);
    headPath.style.stroke = `oklch(${strokeColor})`;
    headPath.style.strokeOpacity = String(state.opacity);
    headPath.setAttribute('stroke-dasharray', `${state.dashLen} ${state.gapLen}`);
  }, []);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    const slots = slotsRef.current;
    for (const slot of slots) {
      if (!slot.headPath) continue;

      // Initialize start time
      if (slot.startTime === 0) slot.startTime = timestamp;

      const elapsed = (timestamp - slot.startTime) / 1000;
      const progress = Math.min(elapsed / slot.state.dur, 1);
      slot.progress = progress;

      const { state } = slot;
      const headTotal = state.dashLen + state.gapLen;
      const headOffset = state.reverse
        ? -headTotal * (1 - progress)
        : -headTotal * progress;

      const trailDash = state.dashLen * 2.5;
      const trailGap = state.gapLen;
      const trailTotal = trailDash + trailGap;
      const trailOffset = state.reverse
        ? -trailTotal * (1 - progress)
        : -(trailTotal * progress - state.dashLen * 0.3);

      slot.headPath.setAttribute('stroke-dashoffset', String(headOffset));
      slot.trailPath!.setAttribute('stroke-dashoffset', String(trailOffset));

      // When done, regenerate with a new path
      if (progress >= 1) {
        slot.state = makeSnake(slot.zone, slot.state.templateIdx);
        slot.startTime = timestamp;
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

    // Create DOM elements for each slot
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('stroke-linejoin', 'round');

    for (const slot of slots) {
      const trace = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trace.style.strokeWidth = '1.5';
      const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      head.style.strokeWidth = '1.5';

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
