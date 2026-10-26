/* Fetch Mobility — site interactions (vanilla JS + GSAP ScrollTrigger) */

(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
    var animate = hasGsap && !reduceMotion;
    var desktop = window.matchMedia("(min-width: 861px)");

    if (hasGsap) {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* pinned sequences fall back to their final state when nothing animates */
    if (!animate) {
        document.documentElement.classList.add("no-anim");
    }

    /* live Bengaluru clock in the meta bar */
    var clock = document.querySelector("[data-clock]");

    if (clock && window.Intl) {
        var fmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
        var tick = function () {
            clock.textContent = "IST " + fmt.format(new Date()).toLowerCase();
        };
        tick();
        setInterval(tick, 15000);
    }

    /* menu */
    var menuBtn = document.querySelector(".menu-btn");
    var menu = document.getElementById("menu");

    function setMenu(open) {
        document.body.classList.toggle("menu-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.textContent = open ? "close" : "menu";
        menu.setAttribute("aria-hidden", String(!open));
        if (open) {
            var first = menu.querySelector("a");
            if (first) first.focus();
        }
    }

    if (menuBtn && menu) {
        menuBtn.addEventListener("click", function () {
            setMenu(!document.body.classList.contains("menu-open"));
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
                setMenu(false);
                menuBtn.focus();
            }
        });
    }

    /* reveal on scroll */
    var revealEls = document.querySelectorAll("[data-reveal]");

    if ("IntersectionObserver" in window && !reduceMotion) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -8% 0px" });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add("is-in"); });
    }

    /* word scrub: words darken one by one as the block scrolls past.
       The full sentence stays available to assistive tech. */
    document.querySelectorAll(".scrub").forEach(function (el) {
        var text = el.textContent.trim().replace(/\s+/g, " ");
        var words = text.split(" ");
        el.textContent = "";

        var sr = document.createElement("span");
        sr.className = "visually-hidden";
        sr.textContent = text;
        el.appendChild(sr);

        var vis = document.createElement("span");
        vis.setAttribute("aria-hidden", "true");
        var spans = words.map(function (w, i) {
            var s = document.createElement("span");
            s.className = "w";
            s.textContent = w;
            vis.appendChild(s);
            if (i < words.length - 1) vis.appendChild(document.createTextNode(" "));
            return s;
        });
        el.appendChild(vis);

        if (!animate) {
            spans.forEach(function (s) { s.classList.add("on"); });
            return;
        }

        ScrollTrigger.create({
            trigger: el,
            start: "top 82%",
            end: "bottom 45%",
            onUpdate: function (self) {
                var n = Math.round(self.progress * spans.length);
                spans.forEach(function (s, i) { s.classList.toggle("on", i < n); });
            }
        });
    });

    /* ------------------------------------------------------------------
       hero: the e-trike rides into the stage, then the scroll scrubs it
       ------------------------------------------------------------------ */
    var ride = document.querySelector(".ride");

    if (ride) {
        var stage = ride.querySelector(".stage");
        var rider = ride.querySelector(".rider");
        var body = ride.querySelector(".rider-body");
        var ghosts = ride.querySelectorAll(".rider .ghost");
        var shadow = ride.querySelector(".rider-shadow");
        var streaks = ride.querySelectorAll(".streaks span");
        var callout = ride.querySelector(".stage-callout");
        var word = ride.querySelector(".stage-word");

        if (animate) {
            /* hand the CSS centring (translateX(-50%)) over to GSAP */
            gsap.set(rider, { x: 0, xPercent: -50 });

            var enter = gsap.timeline({ delay: 0.25 });
            var dist = function () { return stage.clientWidth * (desktop.matches ? 0.75 : 1.1); };

            enter.from(word, { y: 60, opacity: 0, duration: 1.6, ease: "expo.out" }, 0)
                .from(body, { x: dist, duration: 2, ease: "expo.out" }, 0)
                .from(shadow, { scaleX: 0.4, opacity: 0, duration: 1.4, ease: "expo.out" }, 0.1)
                /* braking: the rear lifts a touch around the front wheel, then settles */
                .to(body, { rotate: -2.2, transformOrigin: "12% 96%", duration: 0.35, ease: "power2.out" }, 0.95)
                .to(body, { rotate: 0, duration: 1.1, ease: "elastic.out(1, 0.45)" }, 1.3)
                .from(".ride-foot h1 > *", { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12 }, 0.6)
                .from(".stage-corner", { opacity: 0, duration: 0.8, stagger: 0.08 }, 1);

            /* ghost trail collapses into the body as it slows */
            ghosts.forEach(function (g, i) {
                enter.fromTo(g,
                    { x: (i + 1) * 70, opacity: 0.32 - i * 0.09 },
                    { x: 0, opacity: 0, duration: 1.3 + i * 0.12, ease: "power3.out" }, 0);
            });

            /* speed streaks whoosh past while the trike is still moving fast */
            streaks.forEach(function (s, i) {
                enter.fromTo(s,
                    { x: 0, opacity: 0.85 },
                    { x: function () { return -stage.clientWidth * 1.5; }, opacity: 0, duration: 0.55 + (i % 3) * 0.15, ease: "power1.in" },
                    0.02 + i * 0.06);
            });

            /* scroll: the trike moves aside (desktop) or lifts and shrinks (phones)
               and the product callout comes in */
            var scrub = gsap.timeline({
                scrollTrigger: { trigger: ride, start: "top top", end: "bottom bottom", scrub: 0.8 }
            });

            scrub.to(rider, {
                x: function () { return desktop.matches ? -stage.clientWidth * 0.2 : 0; },
                y: function () { return desktop.matches ? 0 : -stage.clientHeight * 0.29; },
                scale: function () { return desktop.matches ? 1.06 : 0.6; },
                ease: "power1.inOut",
                duration: 1
            }, 0)
                .to(word, { xPercent: -8, opacity: 0.05, ease: "none", duration: 1 }, 0)
                .fromTo(callout, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, 0.45);
        }
    }

    /* ------------------------------------------------------------------
       gauge: needle sweeps and stats light up while the band is pinned
       ------------------------------------------------------------------ */
    var gaugeTrack = document.querySelector(".gauge-track");

    if (gaugeTrack) {
        var needle = gaugeTrack.querySelector(".needle");
        var stats = gaugeTrack.querySelectorAll(".stat");
        var gLabel = gaugeTrack.querySelector(".gauge-label");
        var current = -1;

        var setStat = function (i) {
            if (i === current) return;
            current = i;
            stats.forEach(function (s, n) { s.classList.toggle("is-on", n === i); });
            if (gLabel) gLabel.textContent = stats[i].getAttribute("data-label");
        };

        setStat(0);

        if (animate) {
            ScrollTrigger.create({
                trigger: gaugeTrack,
                start: "top top",
                end: "bottom bottom",
                onUpdate: function (self) {
                    var p = self.progress;
                    needle.style.transform = "rotate(" + (-80 + 160 * p) + "deg)";
                    setStat(Math.min(stats.length - 1, Math.floor(p * stats.length)));
                }
            });
        } else {
            stats.forEach(function (s) { s.classList.add("is-on"); });
        }
    }

    /* ------------------------------------------------------------------
       tabs
       ------------------------------------------------------------------ */
    document.querySelectorAll("[role=tablist]").forEach(function (list) {
        var tabs = Array.prototype.slice.call(list.querySelectorAll("[role=tab]"));

        var select = function (tab, focus) {
            tabs.forEach(function (t) {
                var on = t === tab;
                t.setAttribute("aria-selected", String(on));
                t.tabIndex = on ? 0 : -1;
                var panel = document.getElementById(t.getAttribute("aria-controls"));
                panel.classList.toggle("is-on", on);
                panel.hidden = false;
                panel.setAttribute("aria-hidden", String(!on));
            });
            if (focus) tab.focus();
        };

        tabs.forEach(function (t, i) {
            t.addEventListener("click", function () { select(t); });
            t.addEventListener("keydown", function (e) {
                var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (n) {
                    e.preventDefault();
                    select(tabs[(i + n + tabs.length) % tabs.length], true);
                }
            });
        });
    });

    /* ------------------------------------------------------------------
       pledges light up as they pass the middle of the screen
       ------------------------------------------------------------------ */
    var pledges = document.querySelectorAll(".pledge");

    if (pledges.length) {
        var lightPledges = function () {
            var mark = window.innerHeight * 0.62;
            pledges.forEach(function (p) {
                p.classList.toggle("is-on", reduceMotion || p.getBoundingClientRect().top < mark);
            });
        };
        window.addEventListener("scroll", lightPledges, { passive: true });
        lightPledges();
    }

    /* ------------------------------------------------------------------
       product close-up: a "camera" moves across the e-trike
       targets are fractions of the cut-out image (u = x, v = y)
       ------------------------------------------------------------------ */
    var closeup = document.querySelector(".closeup");

    if (closeup) {
        var cam = closeup.querySelector(".camera");
        var rig = closeup.querySelector(".camera-rig");
        var items = closeup.querySelectorAll(".closeup-info article");
        var buttons = closeup.querySelectorAll(".closeup-list button");
        var bar = closeup.querySelector(".closeup-progress i");
        var counter = closeup.querySelector("[data-count]");
        var shot = -1;
        var RATIO = 786 / 1349;

        var layout = function () {
            var H = cam.clientHeight, W = cam.clientWidth;
            var h = Math.min(H * 0.86, (W * 0.86) / RATIO);
            var w = h * RATIO;
            rig.style.width = w + "px";
            rig.style.height = h + "px";
            return { W: W, H: H, w: w, h: h };
        };

        var frame = function (i) {
            var L = layout();
            var it = items[i];
            var s = parseFloat(it.getAttribute("data-s"));
            var u = parseFloat(it.getAttribute("data-u"));
            var v = parseFloat(it.getAttribute("data-v"));
            if (s === 1) {
                return { x: (L.W - L.w) / 2, y: (L.H - L.h) / 2 + L.H * 0.02, scale: 1 };
            }
            return { x: L.W / 2 - u * L.w * s, y: L.H / 2 - v * L.h * s, scale: s };
        };

        var go = function (i, instant) {
            if (i === shot && !instant) return;
            shot = i;
            items.forEach(function (a, n) { a.classList.toggle("is-on", n === i); });
            buttons.forEach(function (b, n) {
                b.classList.toggle("is-on", n === i);
                b.setAttribute("aria-current", n === i ? "step" : "false");
            });
            cam.classList.toggle("is-zoomed", i > 0);
            if (counter) counter.textContent = "0" + (i + 1) + " / 0" + items.length;
            var f = frame(i);
            if (hasGsap) {
                gsap.to(rig, { x: f.x, y: f.y, scale: f.scale, duration: instant || reduceMotion ? 0 : 1.3, ease: "expo.inOut", overwrite: true });
            } else {
                rig.style.transform = "translate(" + f.x + "px," + f.y + "px) scale(" + f.scale + ")";
            }
        };

        var progressOf = function () {
            var r = closeup.getBoundingClientRect();
            var total = closeup.offsetHeight - window.innerHeight;
            return Math.max(0, Math.min(1, -r.top / total));
        };

        var onScroll = function () {
            var p = progressOf();
            if (bar) bar.style.width = p * 100 + "%";
            go(Math.min(items.length - 1, Math.floor(p * items.length * 0.999)));
        };

        buttons.forEach(function (b, i) {
            b.addEventListener("click", function () {
                var total = closeup.offsetHeight - window.innerHeight;
                var top = closeup.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: top + total * (i + 0.5) / items.length, behavior: reduceMotion ? "auto" : "smooth" });
            });
        });

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", function () { go(shot < 0 ? 0 : shot, true); });
        go(0, true);
        onScroll();
    }

    /* timeline progress line (about) */
    var timeline = document.querySelector(".timeline");

    if (timeline) {
        var tbar = timeline.querySelector(".timeline-progress");
        var milestones = timeline.querySelectorAll(".milestone");

        var updateTimeline = function () {
            var rect = timeline.getBoundingClientRect();
            var mark = window.innerHeight * 0.6;
            tbar.style.height = Math.max(0, Math.min(rect.height - 16, mark - rect.top)) + "px";
            milestones.forEach(function (m) {
                m.classList.toggle("is-reached", reduceMotion || m.getBoundingClientRect().top + 10 < mark);
            });
        };

        window.addEventListener("scroll", updateTimeline, { passive: true });
        window.addEventListener("resize", updateTimeline);
        updateTimeline();
    }

    /* legal pages: highlight the current section in the table of contents */
    var tocLinks = document.querySelectorAll(".toc a");

    if (tocLinks.length && "IntersectionObserver" in window) {
        var map = {};
        tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
        var tocIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    tocLinks.forEach(function (a) { a.classList.remove("is-active"); });
                    var link = map[entry.target.id];
                    if (link) link.classList.add("is-active");
                }
            });
        }, { rootMargin: "-30% 0px -60% 0px" });
        document.querySelectorAll(".legal-body section[id]").forEach(function (s) { tocIo.observe(s); });
    }

    /* contact form (Formspree) */
    var form = document.getElementById("contactForm");

    if (form) {
        var status = form.querySelector(".form-status");
        var submit = form.querySelector("button[type=submit]");

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            status.className = "form-status";
            status.textContent = "Sending…";
            submit.disabled = true;

            fetch("https://formspree.io/f/xjkkpaen", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                    name: form.elements.name.value,
                    email: form.elements.email.value,
                    message: form.elements.message.value
                })
            })
                .then(function (response) {
                    if (!response.ok) throw new Error("Request failed");
                    status.classList.add("ok");
                    status.textContent = "Thanks — your message is on its way. We'll get back to you soon.";
                    form.reset();
                })
                .catch(function () {
                    status.classList.add("err");
                    status.textContent = "Something went wrong. Please try again or email connect@fetchmobility.in.";
                })
                .finally(function () {
                    submit.disabled = false;
                });
        });
    }
})();
