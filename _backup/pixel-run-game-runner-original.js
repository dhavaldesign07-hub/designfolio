// ---------- Pixel Run Game (footer) ----------
(function(){
  const REF_W = 1440, REF_H = 512;
  const ART = 4.8;
  const GROUND_RATIO = 393 / REF_H;
  const NEAR_DASH_RATIO = 422.5 / REF_H;
  const FAR_DASH_RATIO = 448 / REF_H;
  const HORIZON_THICK = 4.5, DASH_THICK = 5, DASH_PERIOD = 128;
  const NEAR_DASH_ON = 45, FAR_DASH_ON = 23;
  const A_HORIZON = 0.331, A_NEAR = 0.199, A_FAR = 0.15, A_SPRITE = 0.331, A_CLOUD = 0.26;
  const BLOCK_UNITS = 11;
  const IDLE_RESUME = 4;
  const A_HUD_LABEL = 0.33, A_HUD_VALUE = 0.42;

  const COLOR_CACHE = new Map();
  const clamp01 = n => n < 0 ? 0 : n > 1 ? 1 : n;

  function hslToRgb(h, s, l){
    const hh = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = l - c / 2;
    let r=0,g=0,b=0;
    if (hh<60) [r,g,b]=[c,x,0]; else if (hh<120) [r,g,b]=[x,c,0]; else if (hh<180) [r,g,b]=[0,c,x];
    else if (hh<240) [r,g,b]=[0,x,c]; else if (hh<300) [r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
    return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
  }

  function parseColorRaw(raw, fallback){
    let s = raw.trim();
    if (s.charAt(0) === "#"){
      let h = s.slice(1).trim();
      if (h.length===3||h.length===4) h = h.split("").map(c=>c+c).join("");
      if (h.length!==6 && h.length!==8) return fallback;
      const ch = i => parseInt(h.slice(i,i+2),16);
      const r=ch(0), g=ch(2), b=ch(4);
      if (!Number.isFinite(r)||!Number.isFinite(g)||!Number.isFinite(b)) return fallback;
      const a = h.length===8 ? ch(6)/255 : 1;
      return [r,g,b, clamp01(Number.isFinite(a)?a:1)];
    }
    const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
    if (fn){
      const name = fn[1].toLowerCase();
      const parts = fn[2].split(/[,/\s]+/).filter(Boolean);
      if (parts.length<3) return fallback;
      const num = t => parseFloat(t);
      const alphaTok = parts[3];
      const alpha = alphaTok===undefined ? 1 : (alphaTok.endsWith("%") ? num(alphaTok)/100 : num(alphaTok));
      if (!Number.isFinite(alpha)) return fallback;
      if (name.charAt(0)==="r"){
        const chan = t => t.endsWith("%") ? Math.round(num(t)*255/100) : Math.round(num(t));
        const r=chan(parts[0]), g=chan(parts[1]), b=chan(parts[2]);
        if (!Number.isFinite(r)||!Number.isFinite(g)||!Number.isFinite(b)) return fallback;
        return [r,g,b, clamp01(alpha)];
      }
      const hue=num(parts[0]), sat=num(parts[1])/100, lig=num(parts[2])/100;
      if (!Number.isFinite(hue)||!Number.isFinite(sat)||!Number.isFinite(lig)) return fallback;
      const [r,g,b] = hslToRgb(hue, clamp01(sat), clamp01(lig));
      return [r,g,b, clamp01(alpha)];
    }
    return fallback;
  }
  function parseColor(input, fallback){
    if (!input) return fallback;
    const hit = COLOR_CACHE.get(input);
    if (hit) return hit;
    const out = parseColorRaw(input, fallback);
    COLOR_CACHE.set(input, out);
    return out;
  }

  const RUNNER_BODY = ["....########....","..############..",".##############.","################","################","###..######..###","###..######..###","################","################","################","###..........###",".##############.","..############..","....########...."];
  const RUNNER_LEGS_A = ["...##......##...","..###......###.."];
  const RUNNER_LEGS_B = ["..###......###..","...##......##..."];
  const RUNNER_LEGS_AIR = ["..###......###..",".###........###."];
  const CLOUD = ["....#####.......","..########..##..","################",".##############."];
  const BLOCK = ["..############..",".##############.","################","################","################","################","################","################","################","################","################","################","################","################",".##############.","..############.."];
  const GLYPHS = [
    ["..####..","..####..","..####..","..####..","...##...",".######.","........","........"],
    ["........",".#....#.",".#....#.",".######.",".#....#.",".#....#.","........","........"],
    ["........",".######.","....#...","...#....","..#.....",".######.","........","........"],
    ["........","..####..",".#....#.",".#....#.",".#....#.","..####..","........","........"]
  ];
  const FONT = {
    "0":["###","#.#","#.#","#.#","###"], "1":[".#.","##.",".#.",".#.","###"],
    "2":["###","..#","###","#..","###"], "3":["###","..#","###","..#","###"],
    "4":["#.#","#.#","###","..#","..#"], "5":["###","#..","###","..#","###"],
    "6":["###","#..","###","#.#","###"], "7":["###","..#","..#","..#","..#"],
    "8":["###","#.#","###","#.#","###"], "9":["###","#.#","###","..#","###"],
    "S":["###","#..","###","..#","###"], "C":["###","#..","#..","#..","###"],
    "O":["###","#.#","#.#","#.#","###"], "R":["###","#.#","###","#.#","#.#"],
    "E":["###","#..","###","#..","###"], "B":["##.","#.#","##.","#.#","##."],
    "T":["###",".#.",".#.",".#.",".#."], " ":["...","...","...","...","..."]
  };

  function rng(w){ w.seed = (w.seed * 1664525 + 1013904223) >>> 0; return w.seed / 4294967296; }

  function initPixelRunGame(host, options){
    const opts = options || {};
    const startSpeed = opts.startSpeed ?? 420;
    const maxSpeed = opts.maxSpeed ?? 980;
    const gravity = opts.gravity ?? 4780;
    const jumpV = opts.jump ?? 1480;
    const showHud = opts.showHud ?? true;
    const attract = opts.attract ?? true;
    const farDashSpeed = opts.farDashSpeed ?? 100;
    const getBackground = opts.getBackground || (() => "#00164C");
    const getInk = opts.getInk || (() => "#ffffff");

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    function fresh(best, played){
      return { t:0, dist:0, speed:startSpeed, playerY:0, playerV:0, grounded:true,
        obstacles:[], clouds:[], dead:false, deadAt:0, score:0, best, nextGap:180, seed:20260818, played };
    }
    let world = fresh(0, false);
    let idle = 1e9;
    let hovering = false;

    const inkAt = a => { const [r,g,b,ia] = parseColor(getInk(), [255,255,255,1]); return `rgba(${r},${g},${b},${a*ia})`; };
    const bgFill = () => { const [r,g,b,a] = parseColor(getBackground(), [0,0,0,1]); return `rgba(${r},${g},${b},${a})`; };

    function stamp(rows, ox, oy, unit){
      for (let r=0;r<rows.length;r++){
        const y0 = Math.round(oy+r*unit), y1 = Math.round(oy+(r+1)*unit);
        let c=0;
        while (c<rows[r].length){
          if (rows[r][c]!=="#"){ c++; continue; }
          let e=c; while (e<rows[r].length && rows[r][e]==="#") e++;
          const x0=Math.round(ox+c*unit), x1=Math.round(ox+e*unit);
          ctx.fillRect(x0,y0,x1-x0,y1-y0);
          c=e;
        }
      }
    }
    function blit(rows, ox, oy, unit, alpha, knock){
      ctx.fillStyle = inkAt(alpha);
      stamp(rows, ox, oy, unit);
      if (knock){
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        const kx = ox + ((rows[0].length - knock[0].length)/2)*unit;
        const ky = oy + ((rows.length - knock.length)/2)*unit;
        stamp(knock, kx, ky, unit);
        ctx.globalCompositeOperation = prev;
      }
    }

    function paint(w,h){
      const S = Math.max(0.3, Math.min(w/REF_W, h/REF_H, 3));
      const px = ART*S;
      const groundY = h*GROUND_RATIO;
      const playerX = w*0.08;

      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = bgFill();
      ctx.fillRect(0,0,w,h);

      for (const cl of world.clouds) blit(CLOUD, cl.x, cl.y*h, px*cl.scale, A_CLOUD*(0.7+0.3*cl.depth));

      ctx.fillStyle = inkAt(A_HORIZON);
      ctx.fillRect(0, Math.round(groundY), w, Math.max(1, Math.round(HORIZON_THICK*S)));

      function dashRow(ratio, on, alpha, phase){
        const period = DASH_PERIOD*S, len = on*S, y = Math.round(h*ratio), th = Math.max(1, Math.round(DASH_THICK*S));
        ctx.fillStyle = inkAt(alpha);
        const start = -((phase % period)+period)%period;
        for (let x=start; x<w; x+=period) ctx.fillRect(Math.round(x), y, Math.round(len), th);
      }
      dashRow(NEAR_DASH_RATIO, NEAR_DASH_ON, A_NEAR, world.dist);
      const farMul = farDashSpeed/100;
      dashRow(FAR_DASH_RATIO, FAR_DASH_ON, A_FAR, world.dist*farMul);

      for (const ob of world.obstacles){
        const bu = BLOCK_UNITS*px;
        for (let i=0;i<ob.stack;i++){
          blit(BLOCK, ob.x, groundY-(i+1)*bu, bu/16, A_SPRITE, GLYPHS[(ob.glyph+i)%GLYPHS.length]);
        }
      }

      const bodyH = RUNNER_BODY.length*px;
      const feet = groundY - world.playerY;
      blit(RUNNER_BODY, playerX, feet-bodyH-2*px, px, A_SPRITE);
      const legs = !world.grounded ? RUNNER_LEGS_AIR : (Math.floor(world.dist/(28*S))%2 ? RUNNER_LEGS_A : RUNNER_LEGS_B);
      blit(legs, playerX, feet-2*px, px, A_SPRITE);

      if (!showHud) return;
      const fpx = 2.85*S;
      function text(s, rightX, y, alpha){
        const cw = 4*fpx, total = s.length*cw - fpx;
        let x = rightX - total;
        ctx.fillStyle = inkAt(alpha);
        for (const ch of s){
          const g = FONT[ch] ?? FONT[" "];
          for (let r=0;r<5;r++) for (let c=0;c<3;c++) if (g[r][c]==="#")
            ctx.fillRect(Math.round(x+c*fpx), Math.round(y+r*fpx), Math.round(x+(c+1)*fpx)-Math.round(x+c*fpx), Math.round(y+(r+1)*fpx)-Math.round(y+r*fpx));
          x += cw;
        }
      }
      const pad = n => String(Math.floor(n)).padStart(5,"0").slice(-5);
      const rightBest = w - 77*S, rightScore = rightBest - 190*S;
      const labelY = h*0.07, valueY = h*0.133;
      text("SCORE", rightScore, labelY, A_HUD_LABEL);
      text(pad(world.score), rightScore, valueY, A_HUD_VALUE);
      text("BEST", rightBest, labelY, A_HUD_LABEL);
      text(pad(world.best), rightBest, valueY, A_HUD_VALUE);
    }

    function jumpWindow(stack, sp, S){
      const px = ART*S, v = jumpV*S, g = gravity*S, top = stack*BLOCK_UNITS*px;
      const disc = v*v - 2*g*top;
      const tX = (10*px + BLOCK_UNITS*px*0.76)/sp;
      if (disc<=0) return { ok:false, lead:0 };
      const root = Math.sqrt(disc), t1=(v-root)/g, t2=(v+root)/g;
      return { ok: t2-t1 > tX*1.25, lead: t1 + (t2-t1-tX)/2 };
    }

    function doJump(){
      if (world.dead || !world.grounded) return;
      const r = host.getBoundingClientRect();
      const w = r.width || REF_W, h = r.height || REF_H;
      const S = Math.max(0.3, Math.min(w/REF_W, h/REF_H, 3));
      world.playerV = jumpV*S;
      world.grounded = false;
    }

    function seed(w,h){
      const S = Math.max(0.3, Math.min(w/REF_W, h/REF_H, 3));
      const px = ART*S;
      world.clouds = [
        { x:w*0.17, y:0.18, scale:1.15, depth:0.2 },
        { x:w*0.44, y:0.11, scale:0.85, depth:0.7 },
        { x:w*0.78, y:0.26, scale:1.35, depth:0.45 }
      ];
      const sp = startSpeed*S;
      world.obstacles = [];
      for (const [at,want,glyph] of [[0.62,2,0],[1.02,1,2]]){
        let stack = want;
        while (stack>0 && !jumpWindow(stack, sp, S).ok) stack--;
        if (stack>0) world.obstacles.push({ x: w*at, stack, glyph });
      }
      world.dist = 40*px;
    }

    function step(dt, w, h){
      const S = Math.max(0.3, Math.min(w/REF_W, h/REF_H, 3));
      const px = ART*S;
      const groundY = h*GROUND_RATIO;
      const playerX = w*0.08;

      world.t += dt;
      idle += dt;

      if (world.dead){
        if (world.t - world.deadAt > 0.9){
          const best = Math.max(world.best, world.score);
          const played = world.played;
          world = fresh(best, played);
          seed(w,h);
        }
        return;
      }

      const cap = Math.max(startSpeed, maxSpeed);
      const sp = Math.min(cap, startSpeed + world.dist/260) * S;
      world.speed = sp;
      world.dist += sp*dt;
      world.score = world.dist/24;

      if (!world.grounded){
        world.playerV -= gravity*S*dt;
        world.playerY += world.playerV*dt;
        if (world.playerY<=0){ world.playerY=0; world.playerV=0; world.grounded=true; }
      }

      for (const ob of world.obstacles) ob.x -= sp*dt;
      world.obstacles = world.obstacles.filter(o=>o.x > -20*px);
      const last = world.obstacles.length ? Math.max(...world.obstacles.map(o=>o.x)) : -Infinity;

      const flight = 2*jumpV/gravity;
      const clear = (sp/S)*flight + (BLOCK_UNITS+20)*ART;
      if (last < w - (clear+world.nextGap)*S){
        const r = rng(world);
        let stack = r<0.55 ? 1 : r<0.87 ? 2 : 3;
        while (stack>0 && !jumpWindow(stack, sp, S).ok) stack--;
        if (stack>0) world.obstacles.push({ x: w+8*px, stack, glyph: Math.floor(rng(world)*GLYPHS.length) });
        world.nextGap = rng(world)*380;
      }

      for (const cl of world.clouds) cl.x -= sp*dt*(0.12+0.22*cl.depth);
      world.clouds = world.clouds.filter(c=>c.x > -30*px);
      if (world.clouds.length<5 && rng(world)<0.012){
        world.clouds.push({ x:w+10*px, y:0.1+rng(world)*0.42, scale:0.75+rng(world)*0.9, depth:rng(world) });
      }

      const auto = attract && (!world.played || idle > IDLE_RESUME);
      if (auto && world.grounded){
        const bu = BLOCK_UNITS*px;
        const plFront = playerX + 13*px;
        let next=null, gap=Infinity;
        for (const ob of world.obstacles){
          const left = ob.x + bu*0.12;
          if (left + bu*0.76 <= plFront) continue;
          if (left - plFront < gap){ gap = left - plFront; next = ob; }
        }
        if (next){
          const win = jumpWindow(next.stack, sp, S);
          if (win.ok && gap <= sp*win.lead) doJump();
        }
      }

      const pl = { x: playerX+3*px, y: groundY-world.playerY-16*px+2*px, w:10*px, h:14*px };
      for (const ob of world.obstacles){
        const bu = BLOCK_UNITS*px;
        const box = { x: ob.x+bu*0.12, y: groundY-ob.stack*bu, w: bu*0.76, h: ob.stack*bu };
        if (pl.x<box.x+box.w && pl.x+pl.w>box.x && pl.y<box.y+box.h && pl.y+pl.h>box.y){
          world.dead = true; world.deadAt = world.t; world.best = Math.max(world.best, world.score);
          break;
        }
      }
    }

    let w=0, h=0;
    function measure(){
      const r = host.getBoundingClientRect();
      const cw = Math.max(1, Math.round(host.clientWidth || r.width || REF_W));
      const ch = Math.max(1, Math.round(host.clientHeight || r.height || REF_H));
      if (cw===w && ch===h) return false;
      w=cw; h=ch;
      const dpr = Math.min(2, window.devicePixelRatio||1);
      canvas.width = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
      canvas.style.width = w+"px";
      canvas.style.height = h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      return true;
    }

    measure();
    if (!world.obstacles.length) seed(w,h);
    paint(w,h);

    const ro = new ResizeObserver(() => { if (measure()) paint(w,h); });
    ro.observe(host);

    let last = 0;
    function frame(now){
      const prev = last || now;
      last = now;
      const dt = Math.min(0.05, (now-prev)/1000);
      if (dt>0) step(dt,w,h);
      paint(w,h);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function play(){ world.played = true; idle = 0; }
    host.tabIndex = 0;
    host.style.outline = "none";
    host.style.cursor = "pointer";
    host.style.touchAction = "manipulation";
    window.addEventListener("keydown", (e) => {
      const mine = hovering || document.activeElement === host;
      if (!mine) return;
      if (e.code==="Space" || e.code==="ArrowUp" || e.key===" " || e.key==="ArrowUp"){
        e.preventDefault(); play(); doJump();
      }
    }, { passive:false });
    host.addEventListener("pointerdown", (e) => { e.preventDefault(); play(); doJump(); });
    host.addEventListener("pointerenter", () => { hovering = true; });
    host.addEventListener("pointerleave", () => { hovering = false; });
  }

  const gameHost = document.getElementById("foot-game");
  if (gameHost){
    initPixelRunGame(gameHost, {
      getBackground: () => getComputedStyle(document.documentElement).getPropertyValue("--footer-bg").trim(),
      getInk: () => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim()
    });
  }
})();
</script>

</body>
</html>
