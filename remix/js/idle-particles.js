// ═══════════════════════════════════════════════════════════════════════════════
// IDLE-PARTICLES.JS — Partículas decorativas no estado idle (pré-play)
// Sonhário v1.2
//
// Partículas de formas e cores aleatórias, com movimento orgânico (Perlin noise),
// repulsão do mouse, rotação e oscilação de tamanho.
// Quantidade = 13 + nº de materiais não-legacy (cap 300).
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const IDLE_BASE = 13;
const IDLE_CAP = 300;
const IDLE_FADE_MS = 1500;

// Shapes: 0=circle, 1=rect, 2=triangle, 3=ellipse, 4=square, 5=polygon
const IDLE_SHAPE_COUNT = 6;

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO
// ─────────────────────────────────────────────────────────────────────────────

let idleParticles = [];
let idleActive = false;
let idleFading = false;
let idleFadeStart = 0;
let idleSpinning = false;
let idleSpinStart = 0;
let playBtnHovered = false;

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR PARTÍCULA
// ─────────────────────────────────────────────────────────────────────────────

function createIdleParticle() {
    const shapeType = Math.floor(Math.random() * IDLE_SHAPE_COUNT);
    const minSide = Math.min(width, height);
    const sz = minSide * (0.006 + Math.random() * 0.022);

    const p = {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: sz,
        shape: shapeType,
        hue: Math.random() * 360,
        sat: 30 + Math.random() * 50,
        bri: 40 + Math.random() * 50,
        alpha: 0.15 + Math.random() * 0.45,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.015,
        nox: Math.random() * 10000,
        noy: Math.random() * 10000,
        sizePhase: Math.random() * Math.PI * 2,
        sizeFreq: 0.3 + Math.random() * 0.5,
        sizeAmp: 0.05 + Math.random() * 0.2,
        aspect: 0.35 + Math.random() * 0.45,
        polyVerts: null
    };

    if (shapeType === 5) {
        const n = 4 + Math.floor(Math.random() * 4);
        p.polyVerts = [];
        for (let i = 0; i < n; i++) {
            p.polyVerts.push({
                a: (Math.PI * 2 / n) * i + (Math.random() - 0.5) * 0.6,
                r: 0.4 + Math.random() * 0.6
            });
        }
    }

    return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT / FADE OUT
// ─────────────────────────────────────────────────────────────────────────────

function initIdleParticles(materialCount) {
    const target = Math.min(IDLE_BASE + materialCount, IDLE_CAP);
    // Adiciona partículas sem recriar as existentes
    while (idleParticles.length < target) {
        idleParticles.push(createIdleParticle());
    }
    idleActive = true;
    idleFading = false;
    console.log(`✨ ${idleParticles.length} partículas idle (${IDLE_BASE} base + ${materialCount} materiais)`);
}

function spinIdleParticles() {
    if (!idleActive) return;
    idleSpinning = true;
    idleSpinStart = millis();
    playBtnHovered = true; // keep attraction active
}

function fadeOutIdleParticles() {
    if (!idleActive) return;
    idleFading = true;
    idleFadeStart = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE + DRAW (chamar a cada frame no draw())
// ─────────────────────────────────────────────────────────────────────────────

function updateIdleParticles() {
    if (!idleActive || idleParticles.length === 0) return;

    const t = millis() * 0.001;
    let globalAlpha = 1;

    if (idleFading) {
        const elapsed = millis() - idleFadeStart;
        globalAlpha = Math.max(0, 1 - elapsed / IDLE_FADE_MS);
        if (globalAlpha <= 0) {
            idleActive = false;
            idleParticles = [];
            return;
        }
    }

    push();
    colorMode(HSB, 360, 100, 100, 1);
    noStroke();

    const repelRadius = Math.min(width, height) * 0.15;

    for (const p of idleParticles) {
        // Perlin noise acceleration
        const nx = noise(p.nox + t * 0.08) - 0.5;
        const ny = noise(p.noy + t * 0.08) - 0.5;
        p.vx += nx * 0.015;
        p.vy += ny * 0.015;

        // Play button hover: attract + pulsating repel = ondulação
        if (playBtnHovered) {
            const cx = width / 2;
            const cy = height / 2;
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minSide = Math.min(width, height);
            const coreBase = minSide * 0.054;

            if (dist > 1) {
                // Tangential spin force (computed early so attraction can scale with it)
                const spinElapsed = idleSpinning ? (millis() - idleSpinStart) * 0.001 : 0;
                const tangent = idleSpinning ? Math.min(0.07 + spinElapsed * 0.04, 0.30) : 0.008;

                // Attract toward center (scales proportionally with spin: ratio 3:1)
                const attrBase = idleSpinning ? tangent * 3 : 0.12;
                const attr = attrBase * Math.min(dist / minSide, 1);
                p.vx += (dx / dist) * attr;
                p.vy += (dy / dist) * attr;

                // Pulsating repulsion: Perlin noise by angle + time (organic, never repeats)
                const angle = (Math.atan2(dy, dx) + Math.PI) / Math.PI; // 0-2 normalized
                const pulse = 0.9 + noise(angle * 2.25, t * 0.375) * 1.2;
                const coreR = coreBase * pulse;

                if (dist < coreR * 2.5) {
                    const repel = 0.25 * (1 - dist / (coreR * 2.5));
                    p.vx -= (dx / dist) * repel;
                    p.vy -= (dy / dist) * repel;
                }

                // Tangential force: gentle drift or accelerating spin (loading)
                p.vx += (-dy / dist) * tangent;
                p.vy += (dx / dist) * tangent;
            }
        } else if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
            // Normal mouse repulsion (when not hovering play btn)
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < repelRadius && dist > 1) {
                const force = (1 - dist / repelRadius) * 0.3;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        }

        // Damping
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -p.size * 2) p.x = width + p.size;
        if (p.x > width + p.size * 2) p.x = -p.size;
        if (p.y < -p.size * 2) p.y = height + p.size;
        if (p.y > height + p.size * 2) p.y = -p.size;

        // Rotate
        p.rot += p.rotSpd;

        // Size oscillation
        const s = p.size * (1 + Math.sin(t * p.sizeFreq + p.sizePhase) * p.sizeAmp);

        // Draw
        fill(p.hue, p.sat, p.bri, p.alpha * globalAlpha);

        push();
        translate(p.x, p.y);
        rotate(p.rot);

        switch (p.shape) {
            case 0: // circle
                ellipse(0, 0, s, s);
                break;
            case 1: // rectangle
                rectMode(CENTER);
                rect(0, 0, s * 1.5, s * p.aspect);
                break;
            case 2: // triangle
                const h2 = s * 0.866;
                triangle(0, -h2 / 2, -s / 2, h2 / 2, s / 2, h2 / 2);
                break;
            case 3: // ellipse
                ellipse(0, 0, s * 1.4, s * p.aspect);
                break;
            case 4: // square
                rectMode(CENTER);
                rect(0, 0, s, s);
                break;
            case 5: // polygon
                if (p.polyVerts) {
                    beginShape();
                    for (const v of p.polyVerts) {
                        vertex(Math.cos(v.a) * s * v.r * 0.5, Math.sin(v.a) * s * v.r * 0.5);
                    }
                    endShape(CLOSE);
                }
                break;
        }

        pop();
    }

    pop();
}
