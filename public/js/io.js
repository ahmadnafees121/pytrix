/* ==========================================================
   Smart Python Lab – Topic #06: input & output page
   Personalized output, calculator, student record and a
   terminal-style console that logs input() and print().
   ========================================================== */
(function () {
  const Lab = window.Lab;

  function el(id) { return document.getElementById(id); }

  function asBlock(lines) {
    return "<pre>" + lines.map(Lab.escapeHtml).join("\n") + "</pre>";
  }

  /* ---------- Quick-fill chips that fill several fields ---------- */
  /* main.js handles .chips[data-target]; these ones carry several
     values at once (data-name / data-age / data-marks). */
  function initFillChips() {
    document.querySelectorAll(".chips[data-fill]").forEach(function (group) {
      group.addEventListener("click", function (e) {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        const form = group.closest("form");
        if (!form) return;
        ["name", "age", "marks"].forEach(function (key) {
          const value = chip.getAttribute("data-" + key);
          if (value === null) return;
          const camel = key.charAt(0).toUpperCase() + key.slice(1);
          const input = form.querySelector('[id$="' + camel + '"]');
          if (!input) return;
          input.value = value;
          input.classList.add("flash");
          setTimeout(function () { input.classList.remove("flash"); }, 400);
        });
        const first = form.querySelector("input");
        if (first) first.focus();
      });
    });
  }

  /* ---------- Personalized output ---------- */
  function initPersonal() {
    const form = el("personalForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const button = form.querySelector("button[type=submit]");
      Lab.withLoading(button, async function () {
        const data = await Lab.post("/api/personalize", {
          name: el("pName").value,
          age: el("pAge").value,
          marks: el("pMarks").value,
        });
        const out = el("pOut");
        if (!data.ok) {
          Lab.showResult(out, Lab.escapeHtml(data.message), "error");
          Lab.toast(data.message, "error");
          return;
        }
        Lab.showResult(out, asBlock(data.lines), "success");
        Lab.toast("Output printed 🖨️", "success");
      });
    });
  }

  /* ---------- Calculator ---------- */
  function runCalc(expression) {
    return Lab.post("/api/calc", { expression: expression }).then(function (data) {
      const out = el("calcOut");
      if (!data.ok) {
        Lab.showResult(out, Lab.escapeHtml(data.message), "error");
        return data;
      }
      Lab.showResult(out, asBlock([expression, "= " + data.result]), "success");
      return data;
    });
  }

  function initCalc() {
    const form = el("calcForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const button = form.querySelector("button[type=submit]");
      const value = el("calcIn").value;
      Lab.withLoading(button, async function () { await runCalc(value); });
    });
  }

  /* ---------- Student record ---------- */
  function initStudent() {
    const form = el("studentForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const button = form.querySelector("button[type=submit]");
      Lab.withLoading(button, async function () {
        const data = await Lab.post("/api/student", {
          name: el("sName").value,
          age: el("sAge").value,
          marks: el("sMarks").value,
        });
        const out = el("sOut");
        if (!data.ok) {
          Lab.showResult(out, Lab.escapeHtml(data.message), "error");
          Lab.toast(data.message, "error");
          return;
        }
        const r = data.record;
        const rows = [
          ["student_id", r.student_id],
          ["name", r.name],
          ["age", r.age],
          ["marks", r.marks],
          ["grade", r.grade],
          ["status", r.status],
          ["voting_eligible", String(r.voting_eligible)],
          ["generated_at", r.generated_at],
        ];
        Lab.showResult(
          out,
          "<table class=\"grade-table\"><tbody>" + rows.map(function (row) {
            return "<tr><td><code>" + Lab.escapeHtml(String(row[0])) + "</code></td><td>" +
              Lab.escapeHtml(String(row[1])) + "</td></tr>";
          }).join("") + "</tbody></table>",
          "success"
        );
        Lab.toast(r.student_id + " created · grade " + r.grade, "success");
      });
    });
  }

  /* ---------- Console ---------- */
  const consoleEl = el("console");
  const history = [];
  let historyIndex = -1;

  function stamp() {
    const now = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }

  function log(kind, text) {
    if (!consoleEl) return;
    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = '<span class="ts">' + stamp() + "</span>" +
      '<span class="' + kind + '">' + Lab.escapeHtml(text) + "</span>";
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function printHelp() {
    [
      "Available commands:",
      '  print("text")        echo a line, like print() in Python',
      "  vote <age>           check voting eligibility   (if / else)",
      "  grade <marks>        get pass-fail and grade    (if / elif / else)",
      "  calc <expression>    safe maths, e.g. 12 * (3 + 4)",
      "  student <name> <age> <marks>   build a full record",
      "  history              show the commands you typed",
      "  clear                empty the console",
    ].forEach(function (line) { log("sys", line); });
  }

  async function runCommand(raw) {
    const input = raw.trim();
    if (!input) return;

    log("in", ">>> " + input);
    history.push(input);
    historyIndex = history.length;

    const parts = input.split(/\s+/);
    const command = parts.shift().toLowerCase();
    const rest = parts.join(" ");

    try {
      if (command === "help") {
        printHelp();
      } else if (command === "clear") {
        consoleEl.innerHTML = "";
      } else if (command === "history") {
        if (!history.length) return log("sys", "No commands yet.");
        history.forEach(function (item, i) { log("sys", (i + 1) + "  " + item); });
      } else if (command === "print" || command === "echo") {
        // print("hello") and print(hello) should both work for a beginner.
        const text = rest.replace(/^["']|["']$/g, "").trim();
        log("out", text.length ? text : "");
      } else if (command === "vote") {
        if (!rest) return log("err", "Usage: vote <age>");
        const data = await Lab.post("/api/vote", { age: rest });
        log(data.ok ? "out" : "err", data.ok ? "age " + data.age + " → " + data.message : data.message);
        if (data.ok) data.trace.forEach(function (t) {
          log("sys", "   checked " + t.check + " → " + (t.result ? "True" : "False"));
        });
      } else if (command === "grade") {
        if (!rest) return log("err", "Usage: grade <marks>");
        const data = await Lab.post("/api/result", { marks: rest });
        if (!data.ok) return log("err", data.message);
        log("out", "marks " + data.marks + " → " + data.status + ", grade " + data.grade);
        log("sys", "   " + data.message);
      } else if (command === "calc") {
        if (!rest) return log("err", "Usage: calc <expression>");
        const data = await runCalc(rest);
        if (data.ok) log("out", rest + " = " + data.result);
        else log("err", data.message);
      } else if (command === "student") {
        const fields = rest.split(/\s+/);
        const marks = fields.pop();
        const age = fields.pop();
        const name = fields.join(" ") || "Unknown";
        const data = await Lab.post("/api/student", { name: name, age: age, marks: marks });
        if (!data.ok) return log("err", data.message);
        const r = data.record;
        log("out", "Student record created for " + r.name);
        ["student_id: " + r.student_id, "age: " + r.age, "marks: " + r.marks,
          "grade: " + r.grade, "status: " + r.status,
          "voting_eligible: " + r.voting_eligible, "generated_at: " + r.generated_at
        ].forEach(function (line) { log("sys", "   " + line); });
      } else {
        log("err", "Unknown command: " + command + ' — type "help" for the list.');
      }
    } catch (err) {
      log("err", "Command failed: " + err.message);
    }
  }

  function initConsole() {
    const form = el("cmdForm");
    if (!consoleEl || !form) return;

    log("sys", "Smart Python Lab console · type help for the list of commands.");
    log("sys", "Everything you type is sent to the Flask backend, just like input() and print().");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = el("cmd");
      runCommand(input.value);
      input.value = "";
    });

    el("consoleClear").addEventListener("click", function () {
      consoleEl.innerHTML = "";
      log("sys", "Console cleared.");
    });

    // ↑ / ↓ walk through previous commands.
    el("cmd").addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        if (!history.length) return;
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        this.value = history[historyIndex] || "";
        this.setSelectionRange(this.value.length, this.value.length);
      } else if (e.key === "ArrowDown") {
        if (!history.length) return;
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        this.value = history[historyIndex] || "";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initFillChips();
    initPersonal();
    initCalc();
    initStudent();
    initConsole();
  });
})();
