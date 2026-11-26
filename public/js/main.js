/* ==========================================================
   Smart Python Lab – shared scripts
   ========================================================== */
window.Lab = (function () {

  /* ---------- Escape text before inserting it as HTML ---------- */
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Result box ---------- */
  function showResult(el, html, type) {
    el.className = "result " + (type || "info");
    el.innerHTML = html;
  }

  /* ---------- Toast notifications ---------- */
  function toast(message, type) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const t = document.createElement("div");
    t.className = "toast " + (type || "info");
    t.textContent = message;
    stack.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  }

  /* ---------- Call the Python backend ---------- */
  async function post(path, body) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      return await res.json();
    } catch (e) {
      return { ok: false, message: "Could not reach the server. Is app.py running?" };
    }
  }

  /* ---------- Disable a button while a request runs ---------- */
  async function withLoading(button, task) {
    if (!button) return task();
    const label = button.textContent;
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = "Working…";
    try { return await task(); }
    finally {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.textContent = label;
    }
  }

  /* ---------- Navigation ---------- */
  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Quick-fill chips ---------- */
  function initChips() {
    document.querySelectorAll(".chips[data-target]").forEach(function (group) {
      const input = document.getElementById(group.getAttribute("data-target"));
      group.addEventListener("click", function (e) {
        const chip = e.target.closest(".chip");
        if (!chip || !input) return;
        input.value = chip.getAttribute("data-value");
        input.focus();
        input.classList.add("flash");
        setTimeout(function () { input.classList.remove("flash"); }, 400);
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3D tilt on hover ---------- */
  function initTilt() {
    if (window.matchMedia("(hover: none)").matches) return;
    document.querySelectorAll(".tilt").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(900px) rotateX(" + (-y * 6) + "deg) rotateY(" + (x * 8) + "deg) translateY(-4px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Cursor glow ---------- */
  function initGlow() {
    const glow = document.getElementById("glow");
    if (!glow || window.matchMedia("(hover: none)").matches) return;
    window.addEventListener("mousemove", function (e) {
      glow.style.transform = "translate(" + (e.clientX - 200) + "px, " + (e.clientY - 200) + "px)";
    });
  }

  /* ---------- 3D background (Three.js) ---------- */
  function initBackground() {
    const canvas = document.getElementById("bg");
    if (!canvas || typeof THREE === "undefined") return;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 7;

    scene.add(new THREE.AmbientLight(0x6366f1, 0.35));
    const light = new THREE.PointLight(0x22d3ee, 1.6);
    light.position.set(4, 4, 6);
    scene.add(light);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.2, 0.34, 180, 28),
      new THREE.MeshStandardMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.55 })
    );
    knot.position.set(3.2, 0.6, 0);
    scene.add(knot);

    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0, 1),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.4 })
    );
    ico.position.set(-3.4, -1.4, -1);
    scene.add(ico);

    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - 0.5) * 22;
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.03 })
    );
    scene.add(stars);

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();

    let mx = 0, my = 0;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    });

    function frame() {
      requestAnimationFrame(frame);
      knot.rotation.x += 0.003;
      knot.rotation.y += 0.005;
      ico.rotation.x -= 0.002;
      ico.rotation.y += 0.004;
      stars.rotation.y += 0.0005;
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (-my * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    frame();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initChips();
    initReveal();
    initTilt();
    initGlow();
    initBackground();
  });

  return {
    escapeHtml: escapeHtml,
    showResult: showResult,
    toast: toast,
    post: post,
    withLoading: withLoading,
  };
})();
