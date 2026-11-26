"""
Smart Python Lab – Flask backend
Topic #08: Conditional statements (smart decision making)
Topic #06: Input & output (console simulator)
"""
import ast
import operator
import random
from datetime import datetime

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

PASS_MARK = 40
VOTING_AGE = 18
GRADE_STEPS = [(90, "A"), (75, "B"), (60, "C"), (40, "D")]


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def payload():
    """Return the JSON body of a request, or an empty dict."""
    return request.get_json(silent=True) or {}


def to_int(value):
    """Convert user input to int. Returns None if it is not a valid whole number."""
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def fail(message, status=400):
    return jsonify({"ok": False, "message": message}), status


def step(check, result):
    """One decision in the trace: the condition text and whether it was True."""
    return {"check": check, "result": bool(result)}


# ---------------------------------------------------------------
# Topic #08 – Conditional statements
# ---------------------------------------------------------------
def check_voting(age):
    """
    if / elif / else: decides voting eligibility.
    Returns the decision plus a trace of every condition that was checked.
    """
    trace = [step(f"age < 0", age < 0)]
    if age < 0:
        return {"eligible": False, "message": "Age cannot be negative.",
                "years_left": None, "trace": trace}

    trace.append(step(f"age >= {VOTING_AGE}", age >= VOTING_AGE))
    if age >= VOTING_AGE:
        return {"eligible": True, "message": "Eligible to vote.",
                "years_left": 0, "trace": trace}

    years_left = VOTING_AGE - age
    return {"eligible": False,
            "message": f"Not eligible yet. Wait {years_left} more year(s).",
            "years_left": years_left, "trace": trace}


def grade_decision(marks):
    """Chained if / elif / else that returns (letter, trace)."""
    trace = []
    for limit, letter in GRADE_STEPS:
        hit = marks >= limit
        trace.append(step(f"marks >= {limit}", hit))
        if hit:
            return letter, trace
    trace.append(step("else (below 40)", True))
    return "F", trace


def get_grade(marks):
    return grade_decision(marks)[0]


def check_pass_fail(marks):
    """if / else: pass or fail."""
    return "PASS" if marks >= PASS_MARK else "FAIL"


@app.route("/api/vote", methods=["POST"])
def api_vote():
    age = to_int(payload().get("age"))
    if age is None:
        return fail("Please enter a whole number for age.")
    result = check_voting(age)
    return jsonify({"ok": True, "age": age, **result})


@app.route("/api/result", methods=["POST"])
def api_result():
    marks = to_int(payload().get("marks"))
    if marks is None:
        return fail("Please enter a whole number for marks.")
    if not 0 <= marks <= 100:
        return fail("Marks must be between 0 and 100.")

    status = check_pass_fail(marks)
    grade, grade_trace = grade_decision(marks)
    trace = [step(f"marks >= {PASS_MARK} (pass mark)", marks >= PASS_MARK)] + grade_trace
    message = (
        f"Congratulations, you passed with grade {grade}."
        if status == "PASS"
        else "You did not pass this time. Review the material and try again."
    )
    return jsonify({
        "ok": True, "marks": marks, "status": status,
        "grade": grade, "message": message, "trace": trace,
    })


# ---------------------------------------------------------------
# Topic #06 – Input & output
# ---------------------------------------------------------------
@app.route("/api/personalize", methods=["POST"])
def api_personalize():
    data = payload()
    name = str(data.get("name", "")).strip()
    age = to_int(data.get("age"))
    marks = to_int(data.get("marks"))

    if not name:
        return fail("Name cannot be empty.")
    if age is None or marks is None:
        return fail("Age and marks must be whole numbers.")
    if not 0 <= marks <= 100:
        return fail("Marks must be between 0 and 100.")

    lines = [
        f"Hello, {name}!",
        f"You are {age} years old and scored {marks}/100.",
        f"Grade: {get_grade(marks)}  |  Status: {check_pass_fail(marks)}",
    ]
    return jsonify({"ok": True, "lines": lines})


# Safe calculator: only numbers and + - * / ** are allowed (no eval()).
ALLOWED_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_node(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.UnaryOp) and type(node.op) in ALLOWED_OPS:
        return ALLOWED_OPS[type(node.op)](_eval_node(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_OPS:
        left, right = _eval_node(node.left), _eval_node(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 1000:
            raise ValueError("Exponent too large.")
        return ALLOWED_OPS[type(node.op)](left, right)
    raise ValueError("Only numbers and + - * / ** are allowed.")


@app.route("/api/calc", methods=["POST"])
def api_calc():
    expr = str(payload().get("expression", "")).strip()
    if not expr:
        return fail("Enter an expression, for example 12 * (3 + 4).")
    try:
        value = _eval_node(ast.parse(expr, mode="eval").body)
    except ZeroDivisionError:
        return fail("Cannot divide by zero.")
    except (ValueError, SyntaxError):
        return fail("Invalid expression.")
    return jsonify({"ok": True, "result": round(value, 6)})


@app.route("/api/student", methods=["POST"])
def api_student():
    data = payload()
    name = str(data.get("name", "")).strip() or "Unknown"
    age = to_int(data.get("age"))
    marks = to_int(data.get("marks"))
    if age is None or marks is None or not 0 <= marks <= 100:
        return fail("Provide a valid age and marks (0–100).")

    record = {
        "student_id": f"CSE{random.randint(1000, 9999)}",
        "name": name.title(),
        "age": age,
        "marks": marks,
        "grade": get_grade(marks),
        "status": check_pass_fail(marks),
        "voting_eligible": check_voting(age)["eligible"],
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    return jsonify({"ok": True, "record": record})


# ---------------------------------------------------------------
# Pages
# ---------------------------------------------------------------
@app.route("/")
def home():
    return render_template("home.html")


@app.route("/conditionals")
def conditionals():
    return render_template("conditionals.html")


@app.route("/input-output")
def io_console():
    return render_template("io.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.errorhandler(404)
def not_found(_):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
