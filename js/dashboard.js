// ============================================================
// MASTER DASHBOARD 3D PARALLAX CAROUSEL & LIVE STATS
// ============================================================

class MzaCarousel {
  constructor(root, opts = {}) {
    if (!root) return;
    this.root = root;
    this.viewport = root.querySelector(".mzaCarousel-viewport");
    this.track = root.querySelector(".mzaCarousel-track");
    this.slides = Array.from(root.querySelectorAll(".mzaCarousel-slide"));
    this.prevBtn = root.querySelector(".mzaCarousel-prev");
    this.nextBtn = root.querySelector(".mzaCarousel-next");
    this.pagination = root.querySelector(".mzaCarousel-pagination");
    this.progressBar = root.querySelector(".mzaCarousel-progressBar");
    this.isFF = typeof InstallTrigger !== "undefined";
    this.n = this.slides.length;
    this.state = {
      index: 0,
      pos: 0,
      width: 0,
      height: 0,
      gap: 28,
      dragging: false,
      pointerId: null,
      x0: 0,
      v: 0,
      t0: 0,
      animating: false,
      hovering: false,
      startTime: 0,
      pausedAt: 0,
      rafId: 0
    };
    this.opts = Object.assign(
      {
        gap: 28,
        peek: 0.15,
        rotateY: 34,
        zDepth: 150,
        scaleDrop: 0.09,
        blurMax: 2.0,
        activeLeftBias: 0.12,
        interval: 5000,
        transitionMs: 900,
        keyboard: true,
        breakpoints: [
          {
            mq: "(max-width: 1200px)",
            gap: 24,
            peek: 0.12,
            rotateY: 28,
            zDepth: 120,
            scaleDrop: 0.08,
            activeLeftBias: 0.1
          },
          {
            mq: "(max-width: 1000px)",
            gap: 18,
            peek: 0.09,
            rotateY: 22,
            zDepth: 90,
            scaleDrop: 0.07,
            activeLeftBias: 0.09
          },
          {
            mq: "(max-width: 768px)",
            gap: 14,
            peek: 0.06,
            rotateY: 16,
            zDepth: 70,
            scaleDrop: 0.06,
            activeLeftBias: 0.08
          }
        ]
      },
      opts
    );
    if (this.isFF) {
      this.opts.rotateY = 10;
      this.opts.zDepth = 0;
      this.opts.blurMax = 0;
    }
    this._init();
  }
  _init() {
    this._setupDots();
    this._bind();
    this._measure();
    this.goTo(0, false);
    this._startCycle();
    this._loop();
  }
  _setupDots() {
    if (!this.pagination) return;
    this.pagination.innerHTML = "";
    this.dots = this.slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mzaCarousel-dot";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", `Go to slide ${i + 1}`);
      b.addEventListener("click", () => {
        this.goTo(i);
      });
      this.pagination.appendChild(b);
      return b;
    });
  }
  _bind() {
    if (this.prevBtn) this.prevBtn.addEventListener("click", () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener("click", () => this.next());
    if (this.opts.keyboard) {
      this.root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") this.prev();
        if (e.key === "ArrowRight") this.next();
      });
    }
    const pe = this.viewport;
    if (pe) {
      pe.addEventListener("pointerdown", (e) => this._onDragStart(e));
      pe.addEventListener("pointermove", (e) => this._onDragMove(e));
      pe.addEventListener("pointerup", (e) => this._onDragEnd(e));
      pe.addEventListener("pointercancel", (e) => this._onDragEnd(e));
      pe.addEventListener("pointermove", (e) => this._onTilt(e));
    }
    this.root.addEventListener("mouseenter", () => {
      this.state.hovering = true;
      this.state.pausedAt = performance.now();
    });
    this.root.addEventListener("mouseleave", () => {
      if (this.state.pausedAt) {
        this.state.startTime += performance.now() - this.state.pausedAt;
        this.state.pausedAt = 0;
      }
      this.state.hovering = false;
    });
    this.ro = new ResizeObserver(() => this._measure());
    if (this.viewport) this.ro.observe(this.viewport);
  }
  _measure() {
    if (!this.viewport) return;
    const viewRect = this.viewport.getBoundingClientRect();
    this.state.width = viewRect.width;
    this.state.height = viewRect.height;
    this.slideW = Math.min(840, this.state.width * (1 - this.opts.peek * 2));
  }
  _onTilt(e) {
    const r = this.viewport.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width - 0.5;
    const my = (e.clientY - r.top) / r.height - 0.5;
    this.root.style.setProperty("--mzaTiltX", (my * -6).toFixed(3));
    this.root.style.setProperty("--mzaTiltY", (mx * 6).toFixed(3));
  }
  _onDragStart(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    
    // Allow direct clicks on interactive links and buttons
    if (e.target.closest('a, button, input, select, textarea, .mzaBtn')) {
        return;
    }

    this.state.dragging = true;
    this.state.pointerId = e.pointerId;
    this.viewport.setPointerCapture(e.pointerId);
    this.state.x0 = e.clientX;
    this.state.t0 = performance.now();
    this.state.v = 0;
    this.state.pausedAt = performance.now();
  }
  _onDragMove(e) {
    if (!this.state.dragging || e.pointerId !== this.state.pointerId) return;
    const dx = e.clientX - this.state.x0;
    const dt = Math.max(16, performance.now() - this.state.t0);
    this.state.v = dx / dt;
    const slideSpan = this.slideW + this.state.gap;
    this.state.pos = this._mod(this.state.index - dx / slideSpan, this.n);
    this._render();
  }
  _onDragEnd(e) {
    if (!this.state.dragging || (e && e.pointerId !== this.state.pointerId)) return;
    this.state.dragging = false;
    try {
      if (this.state.pointerId != null) this.viewport.releasePointerCapture(this.state.pointerId);
    } catch {}
    this.state.pointerId = null;
    if (this.state.pausedAt) {
      this.state.startTime += performance.now() - this.state.pausedAt;
      this.state.pausedAt = 0;
    }
    const v = this.state.v;
    const threshold = 0.18;
    let target = Math.round(this.state.pos - Math.sign(v) * (Math.abs(v) > threshold ? 0.5 : 0));
    this.goTo(this._mod(target, this.n));
  }
  _startCycle() {
    this.state.startTime = performance.now();
    this._renderProgress(0);
  }
  _loop() {
    const step = (t) => {
      if (!this.state.dragging && !this.state.hovering && !this.state.animating) {
        const elapsed = t - this.state.startTime;
        const p = Math.min(1, elapsed / this.opts.interval);
        this._renderProgress(p);
        if (elapsed >= this.opts.interval) this.next();
      }
      this.state.rafId = requestAnimationFrame(step);
    };
    this.state.rafId = requestAnimationFrame(step);
  }
  _renderProgress(p) {
    if (this.progressBar) this.progressBar.style.transform = `scaleX(${p})`;
  }
  prev() {
    this.goTo(this._mod(this.state.index - 1, this.n));
  }
  next() {
    this.goTo(this._mod(this.state.index + 1, this.n));
  }
  goTo(i, animate = true) {
    const start = this.state.pos || this.state.index;
    const end = this._nearest(start, i);
    const dur = animate ? this.opts.transitionMs : 0;
    const t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 4);
    this.state.animating = true;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const p = dur ? ease(t) : 1;
      this.state.pos = start + (end - start) * p;
      this._render();
      if (t < 1) requestAnimationFrame(step);
      else this._afterSnap(i);
    };
    requestAnimationFrame(step);
  }
  _afterSnap(i) {
    this.state.index = this._mod(Math.round(this.state.pos), this.n);
    this.state.pos = this.state.index;
    this.state.animating = false;
    this._render(true);
    this._startCycle();
  }
  _nearest(from, target) {
    let d = target - Math.round(from);
    if (d > this.n / 2) d -= this.n;
    if (d < -this.n / 2) d += this.n;
    return Math.round(from) + d;
  }
  _mod(i, n) {
    return ((i % n) + n) % n;
  }
  _render(markActive = false) {
    const span = this.slideW + this.state.gap;
    const tiltX = parseFloat(this.root.style.getPropertyValue("--mzaTiltX") || 0);
    const tiltY = parseFloat(this.root.style.getPropertyValue("--mzaTiltY") || 0);
    for (let i = 0; i < this.n; i++) {
      let d = i - this.state.pos;
      if (d > this.n / 2) d -= this.n;
      if (d < -this.n / 2) d += this.n;
      const weight = Math.max(0, 1 - Math.abs(d) * 2);
      const biasActive = -this.slideW * this.opts.activeLeftBias * weight;
      const tx = d * span + biasActive;
      const depth = -Math.abs(d) * this.opts.zDepth;
      const rot = -d * this.opts.rotateY;
      const scale = 1 - Math.min(Math.abs(d) * this.opts.scaleDrop, 0.42);
      const blur = Math.min(Math.abs(d) * this.opts.blurMax, this.opts.blurMax);
      const z = Math.round(1000 - Math.abs(d) * 10);
      const s = this.slides[i];
      if (s) {
        if (this.isFF) {
          s.style.transform = `translate(${tx}px,-50%) scale(${scale})`;
          s.style.filter = "none";
        } else {
          s.style.transform = `translate3d(${tx}px,-50%,${depth}px) rotateY(${rot}deg) scale(${scale})`;
          s.style.filter = `blur(${blur}px)`;
        }
        s.style.zIndex = z;
        if (markActive) s.dataset.state = Math.round(this.state.index) === i ? "active" : "rest";

        const card = s.querySelector(".mzaCard");
        if (card) {
          const parBase = Math.max(-1, Math.min(1, -d));
          const parX = parBase * 48 + tiltY * 2.0;
          const parY = tiltX * -1.5;
          const bgX = parBase * -64 + tiltY * -2.4;
          card.style.setProperty("--mzaParX", `${parX.toFixed(2)}px`);
          card.style.setProperty("--mzaParY", `${parY.toFixed(2)}px`);
          card.style.setProperty("--mzaParBgX", `${bgX.toFixed(2)}px`);
          card.style.setProperty("--mzaParBgY", `${(parY * 0.35).toFixed(2)}px`);
        }
      }
    }
    const active = this._mod(Math.round(this.state.pos), this.n);
    if (this.dots) {
      this.dots.forEach((d, i) => d.setAttribute("aria-selected", i === active ? "true" : "false"));
    }
  }
}

// Master Dashboard Stats Loader & Carousel Init
document.addEventListener('DOMContentLoaded', () => {
    const carouselEl = document.getElementById("mzaCarousel");
    if (carouselEl) {
        new MzaCarousel(carouselEl, { transitionMs: 900 });
    }

    if (document.getElementById('masterDashboardPage')) {
        loadMasterDashboardStats();
    }
});

async function loadMasterDashboardStats() {
    // 0. Load Consolidated Master Net Monthly Profit & Expenses Summary
    try {
        const summary = await apiFetch('/api/dashboard/monthly-summary');
        
        const mIncome = document.getElementById('masterTotalIncome');
        const mExp = document.getElementById('masterTotalExpenses');
        const mNetProfit = document.getElementById('masterOverallNetProfit');
        const mNetMarginRate = document.getElementById('masterNetMarginRate');
        const mMonthLabel = document.getElementById('masterMonthLabel');

        if (mIncome) mIncome.innerText = "₹ " + formatCurrency(summary.totalGrossIncome);
        if (mExp) mExp.innerText = "₹ " + formatCurrency(summary.totalGrossExpenses);
        if (mNetProfit) {
            mNetProfit.innerText = "₹ " + formatCurrency(summary.overallNetMonthlyProfit);
            mNetProfit.style.color = summary.overallNetMonthlyProfit >= 0 ? '#ffffff' : 'var(--status-danger)';
        }

        const marginRate = summary.totalGrossIncome > 0 ? Math.round((summary.overallNetMonthlyProfit / summary.totalGrossIncome) * 100) : 0;
        if (mNetMarginRate) mNetMarginRate.innerText = `Net Profit Margin: ${marginRate}% (${summary.currentMonth})`;
        if (mMonthLabel) mMonthLabel.innerText = `Consolidated Month (${summary.currentMonth})`;

        // Module Contribution Breakdown
        const bPetrol = document.getElementById('breakdownPetrol');
        const bShop = document.getElementById('breakdownShop');
        const bBusiness = document.getElementById('breakdownBusiness');
        const bAgri = document.getElementById('breakdownAgri');
        const bHome = document.getElementById('breakdownHome');

        const agriMod = summary.modules.agriculture || summary.modules.agri || { profit: 0 };
        const petrolMod = summary.modules.petrol || { profit: 0 };
        const shopMod = summary.modules.shop || { profit: 0 };
        const bizMod = summary.modules.business || { profit: 0 };
        const homeMod = summary.modules.home || { profit: 0 };

        if (bPetrol) bPetrol.innerText = "₹ " + formatCurrency(petrolMod.profit);
        if (bShop) bShop.innerText = "₹ " + formatCurrency(shopMod.profit);
        if (bBusiness) bBusiness.innerText = "₹ " + formatCurrency(bizMod.profit);
        if (bAgri) bAgri.innerText = "₹ " + formatCurrency(agriMod.profit);
        if (bHome) bHome.innerText = "₹ " + formatCurrency(homeMod.profit);

    } catch (e) {
        console.warn("Dashboard: Master monthly summary fetch failed", e);
    }

    // 1. Petrol Bunk Metrics
    try {
        const slips = await apiFetch('/api/petrol-bunk/slips');
        let totalUnpaid = 0;
        if (Array.isArray(slips)) {
            slips.forEach(s => {
                if (!s.is_paid) {
                    totalUnpaid += (parseFloat(s.qty_liters) || 0) * (parseFloat(s.rate_per_liter) || 0);
                }
            });
        }
        const petrolKpi = document.getElementById('dashPetrolKpi');
        const petrolSub = document.getElementById('dashPetrolSub');
        if (petrolKpi) petrolKpi.innerText = "₹ " + formatCurrency(totalUnpaid);
        if (petrolSub) petrolSub.innerText = `Unpaid Credit (${Array.isArray(slips) ? slips.length : 0} Slips)`;
    } catch (e) {
        console.warn("Dashboard: Petrol stats fetch failed", e);
    }

    // 2. Shop Rent Metrics
    try {
        const tenants = await apiFetch('/api/shop-rent/tenants');
        let totalRent = 0;
        if (Array.isArray(tenants)) {
            tenants.forEach(t => totalRent += (parseFloat(t.monthly_rent) || 0));
        }
        const shopKpi = document.getElementById('dashShopKpi');
        const shopSub = document.getElementById('dashShopSub');
        if (shopKpi) shopKpi.innerText = "₹ " + formatCurrency(totalRent);
        if (shopSub) shopSub.innerText = `Monthly Rent (${Array.isArray(tenants) ? tenants.length : 0} Tenants)`;
    } catch (e) {
        console.warn("Dashboard: Shop Rent stats fetch failed", e);
    }

    // 3. Business Ledger Metrics
    try {
        const txs = await apiFetch('/api/business/transactions');
        let profit = 0;
        if (Array.isArray(txs)) {
            txs.forEach(t => {
                if (t.company_paid_status === 1) {
                    profit += (parseFloat(t.net_profit) || 0);
                }
            });
        }
        const bizKpi = document.getElementById('dashBusinessKpi');
        const bizSub = document.getElementById('dashBusinessSub');
        if (bizKpi) {
            bizKpi.innerText = "₹ " + formatCurrency(profit);
            bizKpi.style.color = profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
        }
        if (bizSub) bizSub.innerText = `Trade Profit (${Array.isArray(txs) ? txs.length : 0} Trips)`;
    } catch (e) {
        console.warn("Dashboard: Business stats fetch failed", e);
    }

    // 4. Agriculture Metrics
    try {
        const records = await apiFetch('/api/agriculture/records');
        let rev = 0;
        if (Array.isArray(records)) {
            records.forEach(r => {
                if (r.record_type === 'INCOME') rev += (parseFloat(r.amount) || 0);
            });
        }
        const agriKpi = document.getElementById('dashAgriKpi');
        const agriSub = document.getElementById('dashAgriSub');
        if (agriKpi) agriKpi.innerText = "₹ " + formatCurrency(rev);
        if (agriSub) agriSub.innerText = `Harvest Sales (${Array.isArray(records) ? records.length : 0} Logs)`;
    } catch (e) {
        console.warn("Dashboard: Agriculture stats fetch failed", e);
    }

    // 5. Home Module Metrics
    try {
        const homeTx = await apiFetch('/api/home/transactions');
        let income = 0, exp = 0;
        if (Array.isArray(homeTx)) {
            homeTx.forEach(h => {
                const amt = parseFloat(h.amount) || 0;
                if (h.transaction_type === 'INCOME') income += amt;
                else exp += amt;
            });
        }
        const surplus = income - exp;
        const homeKpi = document.getElementById('dashHomeKpi');
        const homeSub = document.getElementById('dashHomeSub');
        if (homeKpi) homeKpi.innerText = "₹ " + formatCurrency(surplus);
        if (homeSub) homeSub.innerText = `Family Surplus (${Array.isArray(homeTx) ? homeTx.length : 0} Items)`;
    } catch (e) {
        console.warn("Dashboard: Home stats fetch failed", e);
    }
}
