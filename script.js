
const cur = document.getElementById('cursorGatePage'); // ← updated ID

let lastTrailX = 0, lastTrailY = 0;
let trailCount = 0;

document.addEventListener('mousemove', e => {
    cur.style.left = e.clientX + 'px';
    cur.style.top  = e.clientY + 'px';

    const dx   = e.clientX - lastTrailX;
    const dy   = e.clientY - lastTrailY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 4) {
        spawnTrailStar(e.clientX, e.clientY, 'normal');
        spawnTrailStar(e.clientX + (Math.random()-0.5)*18, e.clientY + (Math.random()-0.5)*18, 'mini');
        spawnTrailStar(e.clientX + (Math.random()-0.5)*28, e.clientY + (Math.random()-0.5)*28, 'mini');
        if (dist > 8) {
            spawnTrailStar(e.clientX + (Math.random()-0.5)*35, e.clientY + (Math.random()-0.5)*35, 'big');
            spawnTrailStar(e.clientX + (Math.random()-0.5)*22, e.clientY + (Math.random()-0.5)*22, 'mini');
        }
        lastTrailX = e.clientX;
        lastTrailY = e.clientY;
        trailCount++;
    }
});

function spawnTrailStar(x, y, type = 'normal') {
    const star   = document.createElement('div');
    const isStar4 = trailCount % 2 === 0 && type !== 'mini';
    star.className = isStar4 ? 'trail-star star4' : 'trail-star';

    let sz;
    if      (type === 'mini') sz = 2 + Math.random() * 4;
    else if (type === 'big')  sz = 9 + Math.random() * 8;
    else                      sz = 5 + Math.random() * 6;

    const dur    = 0.4 + Math.random() * 0.6;
    const ox     = (Math.random()-0.5) * 8;
    const oy     = (Math.random()-0.5) * 8;
    const colors = ['#ffd700','#fff8c0','#ffe066','#ffffff','#e8c0ff','#ffb3de','#c8aaff'];
    const col    = colors[Math.floor(Math.random() * colors.length)];

    star.style.cssText = `
        left:${x + ox}px;
        top:${y + oy}px;
        width:${sz}px;
        height:${sz}px;
        background:${col};
        box-shadow:0 0 ${sz*1.5}px ${col}, 0 0 ${sz*3}px rgba(255,200,60,0.4);
        --dur:${dur}s;
    `;
    document.body.appendChild(star);
    setTimeout(() => star.remove(), dur * 1000 + 50);
}


const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

function resize() {
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
}
resize();
window.addEventListener('resize', resize);

let glowAmt  = 0;
let hoverAmt = 0;
let isHover  = false;
const ripples = [];

function getHairCenter() {
    const r = document.getElementById('hair-zone').getBoundingClientRect();
    return {
        x: r.left + r.width  * 0.5,
        y: r.top  + r.height * 0.4,
        r: Math.max(r.width, r.height) * 0.7
    };
}

let shimTime = 0;
let lastT    = 0;

function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT     = ts;
    shimTime += dt;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hoverAmt += ((isHover ? 1 : 0) - hoverAmt) * 0.08;
    glowAmt   = Math.max(0, glowAmt - dt * 1.5);

    const total = hoverAmt * 0.5 + glowAmt;

    if (total > 0.01) {
        const { x, y, r } = getHairCenter();


        const g = ctx.createRadialGradient(x, y, 10, x, y, r);
        g.addColorStop(0,   `rgba(255,215,0,${0.28 * total})`);
        g.addColorStop(0.5, `rgba(255,160,30,${0.12 * total})`);
        g.addColorStop(1,   'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);


        if (total > 0.2) {
            const hz = document.getElementById('hair-zone').getBoundingClientRect();
            for (let li = 0; li < 2; li++) {
                const lt    = ((shimTime * 0.5 + li * 0.5) % 1);
                const py    = hz.top  + lt * hz.height;
                const px    = hz.left + hz.width * (0.4 + Math.sin(lt * Math.PI * 3 + shimTime) * 0.2);
                const alpha = Math.sin(lt * Math.PI) * total * 0.8;
                if (alpha < 0.05) continue;
                const sg = ctx.createRadialGradient(px, py, 0, px, py, 14);
                sg.addColorStop(0, `rgba(255,248,180,${alpha})`);
                sg.addColorStop(1, 'transparent');
                ctx.fillStyle = sg;
                ctx.beginPath();
                ctx.arc(px, py, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }


    for (let i = ripples.length - 1; i >= 0; i--) {
        const rp  = ripples[i];
        rp.r     += dt * 100;
        rp.alpha -= dt * 1.6;
        if (rp.alpha <= 0) { ripples.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = rp.alpha;
        ctx.strokeStyle = 'rgba(255,215,0,0.85)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);


const hairZone = document.getElementById('hair-zone');

hairZone.addEventListener('mouseenter', () => {
    isHover = true;
    cur.classList.add('on-hair');
});
hairZone.addEventListener('mouseleave', () => {
    isHover = false;
    cur.classList.remove('on-hair');
});


let count      = 0;
let done       = false;
let apiLoading = false;
let speechTimer;
const dots = document.querySelectorAll('.dot');

const fallbacks = [
    'Oh… someone touched my hair…',
    'It feels warm… like magic…',
    'I think I can trust you… the tower opens for you.'
];


async function handleTouch(x, y) {
    if (count >= 3 || done || apiLoading) return;
    apiLoading = true;

    glowAmt = 1;
    ripples.push({ x, y, r: 0, alpha: 1 });
    burst(x, y);

    dots[count].classList.add('active');
    count++;

    const bg = document.getElementById('bg');
    bg.style.transform = 'scale(1.04)';
    setTimeout(() => bg.style.transform = 'scale(1)', 300);

    if (count >= 3) done = true;

    showSpeech('✦  ✦  ✦');

    const mood = count === 1 ? 'shy and startled'
        : count === 2 ? 'enchanted and hopeful'
            :                'fully enchanted, gate opening';
    try {
        const res  = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 60,
                system: `You are Rapunzel. Someone touched your long magical hair. Reply in fairy-tale voice. ONE sentence, max 12 words. No quotes or asterisks. Mood: ${mood}. If this is the 3rd touch, say something like "I think I can trust you, the tower opens for you."`,
                messages: [{ role: 'user', content: `Touch ${count} of 3.` }]
            })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text?.trim() || fallbacks[count - 1];
        showSpeech(text);
        if (done) setTimeout(enter, 2200);
    } catch {
        showSpeech(fallbacks[count - 1]);
        if (done) setTimeout(enter, 2200);
    } finally {
        apiLoading = false;
    }
}

function showSpeech(text) {
    const el = document.getElementById('speech');
    el.textContent = text === '✦  ✦  ✦' ? text : `"${text}"`;
    el.classList.add('show');
    clearTimeout(speechTimer);
    if (text !== '✦  ✦  ✦')
        speechTimer = setTimeout(() => el.classList.remove('show'), 3800);
}


function burst(x, y) {
    const colors = ['#fff9c0','#ffd700','#ffb830','#ffffff','#f0c060'];
    for (let i = 0; i < 20; i++) {
        const el  = document.createElement('div');
        el.className = 'sp';
        const sz  = 3 + Math.random() * 7;
        const ang = Math.random() * Math.PI * 2;
        const d   = 30 + Math.random() * 80;
        const dur = 0.5 + Math.random() * 0.6;
        el.style.cssText = `
            width:${sz}px; height:${sz}px;
            left:${x}px; top:${y}px;
            background:${colors[Math.floor(Math.random() * colors.length)]};
            box-shadow:0 0 ${sz}px rgba(255,200,60,.5);
            --tx:${Math.cos(ang)*d}px;
            --ty:${Math.sin(ang)*d - 15}px;
            --d:${dur}s;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), dur * 1000 + 100);
    }
}

function enter() {
    document.getElementById('transition').classList.add('show');
    setTimeout(() => {
        // HOME PAGE:
        window.location.href = 'home.html';
    }, 2500);
}


hairZone.addEventListener('click', e => handleTouch(e.clientX, e.clientY));
hairZone.addEventListener('touchstart', e => {
    e.preventDefault();
    handleTouch(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });