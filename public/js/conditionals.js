/* ==========================================================
   Smart Python Lab – Topic #08: conditional statements page
   Talks to /api/vote and /api/result and renders the decision
   trace the backend returns.
   ========================================================== */
(function () {
  const Lab = window.Lab;

  function el(id) { return document.getElementById(id); }

  /* ---------- Decision trace ---------- */
  function renderTrace(target, trace, title) {
    if (!target) return;
    if (!trace || !trace.length) { target.innerHTML = ""; return; }

    let html = '<div class="trace"><div class="trace-title">' +
      Lab.escapeHtml(title || "Conditions Python checked") + "</div>";
    trace.forEach(function (item, i) {
      html += '<div class="trace-item" style="animation-delay:' + (i * 70) + 'ms">' +
        '<span class="trace-icon ' + (item.result ? "yes" : "no") + '">' +
        (item.result ? "✓" : "✗") + "</span>" +
        "<code>" + Lab.escapeHtml(item.check) + "</code>" +
        '<span class="trace-res">' + (item.result ? "True" : "False") + "</span>" +
        "</div>";
    });
    target.innerHTML = html + "</div>";
  }

  /* ---------- Voting eligibility ---------- */
  /* The backend tells us how many years are left, so the threshold is
     age + years_left. That keeps this script free of hard-coded rules. */
  function eligibilityPercent(data) {
    const age = Number(data.age);
    if (!isFinite(age) || age <= 0) return 0;
    if (data.eligible) return 100;
    if (!data.years_left) return 0;
    const threshold = age + Number(data.years_left);
    if (!threshold) return 100;
    return Math.max(0, Math.min(100, Math.round((age / threshold) * 100)));
  }

  function showVote(data) {
    const out = el("voteOut");

    if (!data.ok) {
      Lab.showResult(out, Lab.escapeHtml(data.message), "error");
      renderTrace(el("voteTrace"), []);
      Lab.toast(data.message, "error");
      return;
    }

    const pct = eligibilityPercent(data);
    const label = data.eligible ? "Old enough to vote" : (data.years_left ? "Progress towards voting age" : "Invalid age");
    Lab.showResult(
      out,
      '<div class="meter-label"><span>' + Lab.escapeHtml(label) + "</span><span>" + pct + "%</span></div>" +
      '<div class="meter"><div class="meter-fill" id="voteMeter"></div></div>' +
      '<p class="result-msg">' + Lab.escapeHtml(data.message) + "</p>",
      data.ok && data.eligible ? "success" : "info"
    );

    // Width is set after paint so the CSS transition animates from 0.
    const fill = el("voteMeter");
    if (fill) requestAnimationFrame(function () { fill.style.width = pct + "%"; });

    renderTrace(el("voteTrace"), data.trace, "if / elif / else trace");
    Lab.toast(data.eligible ? "Eligible to vote 🗳️" : data.message, data.eligible ? "success" : "info");
  }

  function initVote() {
    const form = el("voteForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const button = form.querySelector("button[type=submit]");
      Lab.withLoading(button, async function () {
        showVote(await Lab.post("/api/vote", { age: el("voteAge").value }));
      });
    });
  }

  /* ---------- Pass / fail and grade ---------- */
  function showResult(data) {
    const gradeOut = el("gradeOut");
    const resultOut = el("resultOut");

    if (!data.ok) {
      Lab.showResult(resultOut, Lab.escapeHtml(data.message), "error");
      if (gradeOut) gradeOut.innerHTML = "";
      renderTrace(el("resultTrace"), []);
      Lab.toast(data.message, "error");
      return;
    }

    const passed = data.status === "PASS";
    if (gradeOut) {
      gradeOut.innerHTML =
        '<div class="grade-display">' +
        '<div class="grade-badge g-' + Lab.escapeHtml(data.grade) + '">' + Lab.escapeHtml(data.grade) + "</div>" +
        '<div class="grade-info">' +
        '<div class="grade-status ' + (passed ? "pass" : "fail") + '">' + Lab.escapeHtml(data.status) + "</div>" +
        '<p class="muted">Marks ' + data.marks + " / 100</p>" +
        "</div></div>";
    }
    Lab.showResult(resultOut, Lab.escapeHtml(data.message), passed ? "success" : "error");
    renderTrace(el("resultTrace"), data.trace, "Chained if / elif / else trace");
    Lab.toast("Grade " + data.grade + " · " + data.status, passed ? "success" : "error");
  }

  function initResult() {
    const form = el("resultForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const button = form.querySelector("button[type=submit]");
      Lab.withLoading(button, async function () {
        showResult(await Lab.post("/api/result", { marks: el("marks").value }));
      });
    });
  }

  /* ---------- Interactive Yes / No flowchart ---------- */
  /* Each node is one condition, exactly like a nested if / elif / else chain. */
  const FLOW = {
    attendance: {
      question: "Did the student attend at least 75% of the classes?",
      code: "if attendance >= 0.75:",
      yes: "passMark",
      no: { text: "Result withheld — attendance is below 75%.", tone: "error", step: "attendance >= 0.75 → False" }
    },
    passMark: {
      question: "Is the marks score 40 or above?",
      code: "elif marks >= 40:",
      yes: "gradeA",
      no: { text: "FAIL — the student has to retake the exam.", tone: "error", step: "marks >= 40 → False" }
    },
    gradeA: {
      question: "Is it 90 or above?",
      code: "if marks >= 90:",
      yes: { text: "Grade A — a distinction! 🎉", tone: "success", step: "marks >= 90 → True" },
      no: "gradeB"
    },
    gradeB: {
      question: "Is it 75 or above?",
      code: "elif marks >= 75:",
      yes: { text: "Grade B — very good.", tone: "success", step: "marks >= 75 → True" },
      no: "gradeC"
    },
    gradeC: {
      question: "Is it 60 or above?",
      code: "elif marks >= 60:",
      yes: { text: "Grade C — a solid pass.", tone: "success", step: "marks >= 60 → True" },
      no: { text: "Grade D — passed, but keep practising.", tone: "success", step: "else → grade D" }
    }
  };

  let flowKey = "attendance";
  let flowSteps = [];

  function renderFlowPath() {
    const path = el("flowPath");
    if (!path) return;
    path.innerHTML = flowSteps.length
      ? flowSteps.map(function (s) { return '<span class="path-chip">' + Lab.escapeHtml(s) + "</span>"; }).join("")
      : "";
  }

  function endFlow(end) {
    flowSteps.push(end.step);
    renderFlowPath();
    const node = el("flowNode");
    node.innerHTML =
      '<div class="flow-node end ' + end.tone + '">' + Lab.escapeHtml(end.text) + "</div>" +
      '<p class="muted" style="margin-top:14px">Reached a leaf of the decision tree.</p>';
    el("flowBranch").innerHTML =
      '<button class="btn btn-ghost btn-small" type="button" data-flow="restart">Start again</button>';
  }

  function renderFlow() {
    const node = el("flowNode");
    const branch = el("flowBranch");
    if (!node || !branch) return;

    const step = FLOW[flowKey];
    if (!step) { el("flowPath").innerHTML = ""; return; }

    node.innerHTML =
      '<div class="flow-node">' + Lab.escapeHtml(step.question) + "</div>" +
      '<div class="flow-arrow" aria-hidden="true">↓</div>' +
      '<code>' + Lab.escapeHtml(step.code) + "</code>";
    branch.innerHTML =
      '<button class="btn btn-primary btn-small" type="button" data-flow="yes">Yes</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-flow="no">No</button>';
    renderFlowPath();
  }

  function answerFlow(answer) {
    const step = FLOW[flowKey];
    if (!step) return;
    const next = answer === "yes" ? step.yes : step.no;
    if (typeof next === "string") {
      flowSteps.push(step.code + " → " + (answer === "yes" ? "True" : "False"));
      flowKey = next;
      renderFlow();
      return;
    }
    if (next && next.text) endFlow(next);
  }

  function resetFlow() {
    flowKey = "attendance";
    flowSteps = [];
    renderFlow();
  }

  function initFlow() {
    const branch = el("flowBranch");
    if (!branch) return;
    branch.addEventListener("click", function (e) {
      const button = e.target.closest("[data-flow]");
      if (!button) return;
      const action = button.getAttribute("data-flow");
      if (action === "restart") resetFlow();
      else answerFlow(action);
    });
    const reset = el("flowReset");
    if (reset) reset.addEventListener("click", resetFlow);
    renderFlow();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initVote();
    initResult();
    initFlow();
  });
})();
