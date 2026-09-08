/*
  * Aplikasi Express
  * - Keamanan: helmet, CORS, parsing JSON
  * - (Opsional) Rate limit global pada prefix /api
  * - Health check dan rute /api/sav
  */
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { ALLOWED_ORIGINS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_ENABLED } from './config/constants';
import { savRouter } from './routes/savRoutes';

const app = express();

app.use(helmet());
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
}));
app.use(express.json());

const swaggerPath = path.resolve(__dirname, '../docs/openapi.yaml');
const swaggerDocument = YAML.load(swaggerPath);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rate limit global (berdasarkan X-User-Id atau alamat IP)
if (RATE_LIMIT_ENABLED) {
    const apiLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW_MS,
        max: RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: express.Request) => {
            // Utamakan header X-User-Id; jika tidak ada gunakan IP. Wajib mengembalikan string.
            const userIdHeader = req.headers['x-user-id'];
            const id = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
            return String(id ?? req.ip);
        }
    });
    app.use('/api', apiLimiter);
}

// Health check sederhana
app.get('/', (req: express.Request, res) => {
    // Override CSP from helmet to allow inline scripts/styles for this status page
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline' fonts.googleapis.com; font-src fonts.googleapis.com fonts.gstatic.com; img-src 'self' data:;"
    );

    const uptimeSeconds = Math.floor(process.uptime());
    const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Statify API</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg: #060a12;
            --surface: rgba(255,255,255,0.04);
            --border: rgba(255,255,255,0.08);
            --accent: #6366f1;
            --accent2: #22d3ee;
            --green: #10b981;
            --text: #f1f5f9;
            --muted: #64748b;
            --card-glow: rgba(99,102,241,0.12);
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* ── canvas background ── */
        #bg { position: fixed; inset: 0; z-index: 0; }

        /* ── main card ── */
        .card {
            position: relative;
            z-index: 10;
            width: min(520px, 92vw);
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px 44px;
            backdrop-filter: blur(20px);
            box-shadow: 0 0 60px var(--card-glow), 0 24px 64px rgba(0,0,0,0.5);
            animation: fadeUp .6s ease both;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ── header ── */
        .header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 32px;
        }
        .logo {
            width: 44px; height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--accent), var(--accent2));
            display: flex; align-items: center; justify-content: center;
            font-size: 22px;
            flex-shrink: 0;
            box-shadow: 0 0 20px rgba(99,102,241,0.5);
        }
        .title-block h1 {
            font-size: 1.35rem;
            font-weight: 700;
            letter-spacing: -0.3px;
            line-height: 1.2;
        }
        .title-block span {
            font-size: .78rem;
            color: var(--muted);
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── status pill ── */
        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 28px;
        }
        .pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 14px;
            border-radius: 100px;
            font-size: .78rem;
            font-weight: 600;
            background: rgba(16,185,129,0.12);
            color: var(--green);
            border: 1px solid rgba(16,185,129,0.3);
        }
        .dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            background: var(--green);
            box-shadow: 0 0 6px var(--green);
            animation: blink 1.8s ease infinite;
        }
        @keyframes blink {
            0%,100% { opacity: 1; }
            50%      { opacity: .3; }
        }
        .timestamp {
            font-size: .75rem;
            color: var(--muted);
            font-family: 'JetBrains Mono', monospace;
        }

        /* ── divider ── */
        .divider {
            height: 1px;
            background: var(--border);
            margin: 4px 0 24px;
        }

        /* ── stats grid ── */
        .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 28px;
        }
        .stat {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 14px 16px;
            transition: border-color .2s, background .2s;
        }
        .stat:hover {
            border-color: rgba(99,102,241,0.4);
            background: rgba(99,102,241,0.06);
        }
        .stat-label {
            font-size: .68rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .8px;
            margin-bottom: 6px;
            font-weight: 500;
        }
        .stat-value {
            font-size: 1.1rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            background: linear-gradient(135deg, var(--accent2), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* ── endpoints ── */
        .endpoints-title {
            font-size: .72rem;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: .8px;
            font-weight: 500;
            margin-bottom: 10px;
        }
        .ep-list { display: flex; flex-direction: column; gap: 8px; }
        .ep {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: rgba(255,255,255,0.025);
            border: 1px solid var(--border);
            border-radius: 10px;
            font-family: 'JetBrains Mono', monospace;
            font-size: .78rem;
            cursor: default;
            transition: border-color .2s, background .2s;
        }
        .ep:hover {
            border-color: rgba(34,211,238,0.3);
            background: rgba(34,211,238,0.04);
        }
        .method {
            padding: 2px 8px;
            border-radius: 5px;
            font-size: .65rem;
            font-weight: 700;
            flex-shrink: 0;
        }
        .get  { background: rgba(16,185,129,0.18); color: #34d399; }
        .post { background: rgba(99,102,241,0.18); color: #a5b4fc; }
        .ep-path { color: #94a3b8; flex: 1; }
        .ep-desc { color: var(--muted); font-size: .68rem; font-family: 'Inter', sans-serif; }

        /* ── footer ── */
        .footer {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .footer-left { font-size: .72rem; color: var(--muted); }
        .footer-right {
            font-size: .7rem;
            color: var(--muted);
            font-family: 'JetBrains Mono', monospace;
        }
        .version-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 6px;
            background: rgba(99,102,241,0.12);
            border: 1px solid rgba(99,102,241,0.2);
            color: #a5b4fc;
            font-size: .7rem;
            font-weight: 500;
        }
    </style>
</head>
<body>
<canvas id="bg"></canvas>

<div class="card">
    <div class="header">
        <div class="logo">&#x3A3;</div>
        <div class="title-block">
            <h1>Statify API</h1>
            <span>Statistical Analysis Backend</span>
        </div>
    </div>

    <div class="status-row">
        <div class="pill"><span class="dot"></span> System Online</div>
        <span class="timestamp" id="clock"></span>
    </div>

    <div class="divider"></div>

    <div class="grid">
        <div class="stat">
            <div class="stat-label">Uptime</div>
            <div class="stat-value" id="uptime-val"></div>
        </div>
        <div class="stat">
            <div class="stat-label">Memory</div>
            <div class="stat-value">${memMb} MB</div>
        </div>
        <div class="stat">
            <div class="stat-label">Node</div>
            <div class="stat-value">${process.version}</div>
        </div>
    </div>

    <div class="endpoints-title">Available Endpoints</div>
    <div class="ep-list">
        <div class="ep">
            <span class="method get">GET</span>
            <span class="ep-path">/api/sav</span>
            <span class="ep-desc">Parse SPSS .sav file</span>
        </div>
        <div class="ep">
            <span class="method get">GET</span>
            <span class="ep-path">/api-docs</span>
            <span class="ep-desc">OpenAPI documentation</span>
        </div>
        <div class="ep">
            <span class="method get">GET</span>
            <span class="ep-path">/</span>
            <span class="ep-desc">Health check</span>
        </div>
    </div>

    <div class="footer">
        <span class="footer-left">Tim Statify &copy; 2026 &mdash; STIS Statistics</span>
        <span class="version-badge">v1.0.0</span>
    </div>
</div>

<script>
    const canvas = document.getElementById('bg');
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function initParticles() {
        particles = Array.from({ length: 70 }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.4 + .4,
            vx: (Math.random() - .5) * .25,
            vy: (Math.random() - .5) * .25,
            alpha: Math.random() * .5 + .1,
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // faint radial glow
        const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*.6);
        grd.addColorStop(0, 'rgba(99,102,241,0.06)');
        grd.addColorStop(1, 'rgba(6,10,18,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = \`rgba(99,102,241,\${(1 - dist/120) * 0.15})\`;
                    ctx.lineWidth = .6;
                    ctx.stroke();
                }
            }
        }

        // dots
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = \`rgba(99,102,241,\${p.alpha})\`;
            ctx.fill();

            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
        });

        requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();
    window.addEventListener('resize', () => { resize(); initParticles(); });

    // ── real-time clock & uptime ──
    let serverUptime = ${uptimeSeconds};
    const pageLoadTime = Date.now();

    function fmtUptime(s) {
        if (s < 60)   return s + 's';
        if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
        return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm ' + (s%60) + 's';
    }

    function tick() {
        const elapsed = Math.floor((Date.now() - pageLoadTime) / 1000);
        document.getElementById('uptime-val').textContent = fmtUptime(serverUptime + elapsed);

        const now = new Date();
        const wib = new Date(now.getTime() + 7 * 3600 * 1000);
        const pad = n => String(n).padStart(2, '0');
        document.getElementById('clock').textContent =
            wib.getUTCFullYear() + '/' +
            pad(wib.getUTCMonth()+1) + '/' +
            pad(wib.getUTCDate()) + ' ' +
            pad(wib.getUTCHours()) + ':' +
            pad(wib.getUTCMinutes()) + ':' +
            pad(wib.getUTCSeconds()) + ' WIB';
    }

    tick();
    setInterval(tick, 1000);
</script>
</body>
</html>`;
    res.status(200).send(htmlResponse);
});

app.use('/api/sav', savRouter);

export { app };