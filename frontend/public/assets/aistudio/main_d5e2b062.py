import asyncio
import datetime
import json
import os
import traceback
from functools import wraps

import bcrypt
import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from prisma import Prisma

load_dotenv()

app = Flask(__name__, template_folder="templates")
app.secret_key = os.getenv("SECRET_KEY", "app-secret-key")
JWT_SECRET = os.getenv("JWT_SECRET", "jwt-secret-token")


@app.after_request
def add_no_cache_headers(response):
  """Prevent browser from caching pages - Back after logout must not show dashboard."""
  response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
  response.headers["Pragma"] = "no-cache"
  response.headers["Expires"] = "0"
  return response


# ================= HELPERS =================
def run_async(coro):
  """Open a Prisma connection, run the coroutine, always disconnect."""

  async def wrapper():
    db = Prisma()
    await db.connect()
    try:
      return await coro(db)
    finally:
      if db.is_connected():
        await db.disconnect()

  return asyncio.run(wrapper())


def server_error(msg="Something went wrong on the server."):
  """Full traceback goes to the terminal, user only sees a safe message."""
  traceback.print_exc()
  return jsonify({"error": msg}), 500


class PayloadError(Exception):
  pass


def parse_expense_payload(data):
  title = (data.get("title") or "").strip()
  amount = data.get("amount")
  category_id = data.get("categoryId") or data.get("category_id")
  expense_by_id = data.get("expenseById")
  raw_shares = data.get("shareWithIds") or data.get("shares") or []

  if not title or amount is None or not category_id or not expense_by_id:
    raise PayloadError("Title, Amount, Category and Expense By are required!")

  amount = float(amount)
  if amount <= 0:
    raise PayloadError("Amount must be greater than 0!")

  return (
      title,
      amount,
      int(category_id),
      int(expense_by_id),
      [int(uid) for uid in raw_shares],
  )


def merge_mandatory_ids(share_ids, creator_id, payer_id):
  """Creator and payer must always be part of the share list (no duplicates)."""
  return list(dict.fromkeys(list(share_ids) + [creator_id, payer_id]))


def can_access_expense(exp, user_id):
  """A user can see an expense only if he is the payer or a participant."""
  return exp.expenseById == user_id or user_id in (exp.shareUserIds or [])


async def validate_expense_refs(db, category_id, user_ids):
  if not await db.category.find_unique(where={"id": category_id}):
    return jsonify({"error": f"Category not found: {category_id}"}), 400

  found = await db.user.find_many(where={"id": {"in": user_ids}})
  found_ids = {u.id for u in found}
  missing = [uid for uid in user_ids if uid not in found_ids]
  if missing:
    return jsonify({"error": f"Users not found: {missing}"}), 400
  return None


async def build_expense_list(db, expenses):
  """Convert Prisma expense rows to JSON dicts (names are mapped manually)."""
  user_ids = set()
  cat_ids = set()
  for e in expenses:
    user_ids.add(e.createdById)
    user_ids.add(e.expenseById)
    user_ids.update(e.shareUserIds or [])
    if getattr(e, "updatedById", None):
      user_ids.add(e.updatedById)
    cat_ids.add(e.categoryId)

  users_map = {}
  if user_ids:
    users = await db.user.find_many(where={"id": {"in": list(user_ids)}})
    users_map = {u.id: u.name for u in users}

  cat_map = {}
  if cat_ids:
    cats = await db.category.find_many(where={"id": {"in": list(cat_ids)}})
    cat_map = {c.id: c.name for c in cats}

  result = []
  for exp in expenses:
    share_ids = list(exp.shareUserIds or [])
    updated_by_id = getattr(exp, "updatedById", None)
    result.append({
        "id": exp.id,
        "title": exp.title,
        "amount": exp.amount,
        "categoryId": exp.categoryId,
        "categoryName": cat_map.get(exp.categoryId, "Unknown"),
        "status": exp.status,
        "createdById": exp.createdById,
        "createdByName": users_map.get(exp.createdById, "Unknown"),
        "expenseById": exp.expenseById,
        "expenseByName": users_map.get(exp.expenseById, "Unknown"),
        "createdAt": str(exp.createdAt),
        "updatedAt": str(exp.updatedAt) if exp.updatedAt else None,
        "updatedById": updated_by_id,
        "updatedByName": users_map.get(updated_by_id) if updated_by_id else None,
        "shareUserIds": share_ids,
        "shares": [users_map.get(uid, f"User#{uid}") for uid in share_ids],
    })
  return result


VALID_STATUS_FILTERS = ("all", "pending", "completed")


def expense_matches_search(item, search):
  """Every word typed must appear somewhere (title, category, people, amount, status)."""
  haystack = " ".join([
      str(item.get("title", "")),
      str(item.get("categoryName", "")),
      str(item.get("createdByName", "")),
      str(item.get("expenseByName", "")),
      str(item.get("status", "")),
      str(item.get("amount", "")),
      " ".join(item.get("shares", [])),
  ]).lower()
  return all(word in haystack for word in search.lower().split())


# ================= LOG HELPERS =================
def fmt_amount(value):
  value = float(value)
  return "₹" + (str(int(value)) if value.is_integer() else f"{value:.2f}")


async def get_users_map(db, user_ids):
  ids = [uid for uid in set(user_ids) if uid is not None]
  if not ids:
    return {}
  users = await db.user.find_many(where={"id": {"in": ids}})
  return {u.id: u.name for u in users}


async def get_category_name(db, category_id):
  cat = await db.category.find_unique(where={"id": category_id})
  return cat.name if cat else "Unknown"


def _names(users_map, ids):
  return [users_map.get(uid, f"User#{uid}") for uid in ids]


def _parse_changes(raw):
  try:
    data = json.loads(raw or "[]")
    return data if isinstance(data, list) else []
  except (ValueError, TypeError):
    return []


def _change_messages(changes):
  """Plain-English sentences for a list of change dicts (also used by the API)."""
  out = []
  for c in changes:
    field = c.get("field", "")
    if isinstance(c.get("added"), list) or isinstance(c.get("removed"), list):
      out += [f"Added {n} to shared members" for n in c.get("added") or []]
      out += [f"Removed {n} from shared members" for n in c.get("removed") or []]
    elif c.get("from") is not None:
      out.append(f'{field} changed from "{c["from"]}" to "{c.get("to")}"')
  return out


def _per_person(amount, count):
  return float(amount) / count if count else float(amount)


async def compute_changes(db, old, title, amount, category_id, payer_id, share_ids):
  """Compare the stored expense with the submitted values -> list of changes."""
  old_share = list(old.shareUserIds or [])
  new_share = list(share_ids)
  users_map = await get_users_map(
      db, set(old_share) | set(new_share) | {old.expenseById, payer_id}
  )

  changes = []
  if (old.title or "") != title:
    changes.append({"field": "Title", "type": "text", "from": old.title, "to": title})

  if abs(float(old.amount) - float(amount)) > 1e-9:
    changes.append({
        "field": "Amount",
        "type": "amount",
        "from": fmt_amount(old.amount),
        "to": fmt_amount(amount),
    })

  if old.categoryId != category_id:
    changes.append({
        "field": "Category",
        "type": "category",
        "from": await get_category_name(db, old.categoryId),
        "to": await get_category_name(db, category_id),
    })

  if old.expenseById != payer_id:
    changes.append({
        "field": "Expense By",
        "type": "payer",
        "from": users_map.get(old.expenseById, f"User#{old.expenseById}"),
        "to": users_map.get(payer_id, f"User#{payer_id}"),
    })

  added = [uid for uid in new_share if uid not in old_share]
  removed = [uid for uid in old_share if uid not in new_share]
  if added or removed:
    changes.append({
        "field": "Shared With",
        "type": "members",
        "added": _names(users_map, added),
        "removed": _names(users_map, removed),
    })

  # Derived: each person's share moves when amount or members change
  old_pp = _per_person(old.amount, len(old_share))
  new_pp = _per_person(amount, len(new_share))
  if changes and abs(old_pp - new_pp) > 0.005:
    changes.append({
        "field": "Per Person Share",
        "type": "derived",
        "from": fmt_amount(old_pp),
        "to": fmt_amount(new_pp),
    })

  return changes


async def write_creation_log(db, expense):
  """Snapshot of what the creator entered. Never breaks expense creation."""
  try:
    share_ids = list(expense.shareUserIds or [])
    users_map = await get_users_map(
        db, set(share_ids) | {expense.expenseById, expense.createdById}
    )
    snapshot = [
        {"field": "Title", "to": expense.title},
        {"field": "Amount", "to": fmt_amount(expense.amount)},
        {"field": "Category", "to": await get_category_name(db, expense.categoryId)},
        {"field": "Expense By", "to": users_map.get(expense.expenseById, "Unknown")},
        {"field": "Shared With", "to": ", ".join(_names(users_map, share_ids))},
    ]
    await db.expenselog.create(
        data={
            "expenseId": expense.id,
            "userId": expense.createdById,
            "action": "created",
            "changes": json.dumps(snapshot),
        }
    )
    print(f"[LOG] created-log saved for expense #{expense.id}")
    return None
  except Exception as e:
    print(f"[LOG][ERROR] could not save created-log for expense #{expense.id}")
    traceback.print_exc()
    return f"{type(e).__name__}: {e}"


async def write_update_log(db, expense_id, user_id, changes):
  try:
    await db.expenselog.create(
        data={
            "expenseId": expense_id,
            "userId": user_id,
            "action": "updated",
            "changes": json.dumps(changes),
        }
    )
    print(f"[LOG] update-log saved for expense #{expense_id}: {len(changes)} change(s)")
    return None
  except Exception as e:
    print(f"[LOG][ERROR] could not save update-log for expense #{expense_id}")
    traceback.print_exc()
    return f"{type(e).__name__}: {e}"


async def build_log_entries(db, exp):
  """Logs for one expense (oldest first). Old expenses without logs get a basic entry."""
  log_error = None
  try:
    logs = await db.expenselog.find_many(
        where={"expenseId": exp.id}, order={"createdAt": "asc"}
    )
  except Exception as e:
    traceback.print_exc()
    log_error = f"{type(e).__name__}: {e}"
    logs = []

  updated_by = getattr(exp, "updatedById", None)
  user_ids = {exp.createdById} | {log.userId for log in logs}
  if updated_by:
    user_ids.add(updated_by)
  users_map = await get_users_map(db, user_ids)

  entries = []
  if not any(log.action == "created" for log in logs):
    entries.append({
        "id": None,
        "action": "created",
        "userId": exp.createdById,
        "userName": users_map.get(exp.createdById, "Unknown"),
        "createdAt": exp.createdAt.isoformat(),
        "changes": [],
    })

  for log in logs:
    entries.append({
        "id": log.id,
        "action": log.action,
        "userId": log.userId,
        "userName": users_map.get(log.userId, "Unknown"),
        "createdAt": log.createdAt.isoformat(),
        "changes": _parse_changes(log.changes),
    })

  if updated_by and not any(log.action == "updated" for log in logs):
    entries.append({
        "id": None,
        "action": "updated",
        "userId": updated_by,
        "userName": users_map.get(updated_by, "Unknown"),
        "createdAt": exp.updatedAt.isoformat() if exp.updatedAt else None,
        "changes": [],
    })

  for e in entries:
    e["legacy"] = e["id"] is None  # no ExpenseLog row (edited before logging existed)
    e["messages"] = _change_messages(e["changes"])

  return entries, log_error


# ================= AUTH DECORATOR =================
def token_required(f):
  @wraps(f)
  def decorated(*args, **kwargs):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
      return jsonify({"error": "Unauthorized: token missing!"}), 401

    token = auth_header.split(" ")[1]
    try:
      payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
      token_user_id = payload.get("user_id")

      # Session user and token user must be the same person
      session_user_id = session.get("user_id")
      if session_user_id is not None and session_user_id != token_user_id:
        return jsonify({"error": "Session mismatch, please login again!"}), 401

      request.user_id = token_user_id
      request.user_email = payload.get("email")
    except jwt.ExpiredSignatureError:
      return jsonify({"error": "Token expired!"}), 401
    except jwt.InvalidTokenError:
      return jsonify({"error": "Invalid token!"}), 401

    return f(*args, **kwargs)

  return decorated


# ================= HTML PAGES =================
@app.route("/")
def home():
  return render_template("login.html")


@app.route("/register")
def register_page():
  return render_template("register.html")


@app.route("/dashboard")
def dashboard():
  if "user_id" not in session:
    return redirect(url_for("home"))
  username = session.get("user_name", "User")
  return render_template("dashboard.html", username=username)


@app.route("/expenses")
def expense_list_page():
  if "user_id" not in session:
    return redirect(url_for("home"))
  username = session.get("user_name", "User")
  return render_template("expense_list.html", username=username)


@app.route("/add-expense")
def add_expense_page():
  if "user_id" not in session:
    return redirect(url_for("home"))
  username = session.get("user_name", "User")
  return render_template("add_expense.html", username=username)


@app.route("/logout")
def logout():
  session.clear()
  session.modified = True
  # logged_out=1 -> login page must NOT auto-redirect to dashboard
  resp = redirect("/?logged_out=1")
  resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
  return resp


# ================= AUTH APIs =================
@app.route("/api/logout", methods=["POST"])
@token_required
def logout_api():
  session.clear()
  session.modified = True
  return jsonify({"message": "Logged out successfully!"}), 200


@app.route("/api/register", methods=["POST"])
def register():
  data = request.get_json(silent=True) or {}
  name = (data.get("name") or "").strip()
  email = (data.get("email") or "").strip()
  password = data.get("password")

  if not name or not email or not password:
    return jsonify({"error": "All fields are required!"}), 400

  async def _register(db):
    try:
      existing_user = await db.user.find_unique(where={"email": email})
      if existing_user:
        return jsonify({"error": "User with this email is already registered!"}), 400

      hashed_password = bcrypt.hashpw(
          password.encode("utf-8"), bcrypt.gensalt()
      ).decode("utf-8")

      new_user = await db.user.create(
          data={"name": name, "email": email, "passwordHash": hashed_password}
      )
      return (
          jsonify({
              "message": "User is successfully registered!",
              "userId": new_user.id,
          }),
          201,
      )
    except Exception:
      return server_error()

  return run_async(_register)


@app.route("/api/login", methods=["POST"])
def login():
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip()
  password = data.get("password")

  if not email or not password:
    return jsonify({"error": "Email and Password is required!"}), 400

  async def _login(db):
    try:
      user = await db.user.find_unique(where={"email": email})
      if not user:
        return jsonify({"error": "User not found, please signup!"}), 404

      if not bcrypt.checkpw(
          password.encode("utf-8"), user.passwordHash.encode("utf-8")
      ):
        return jsonify({"error": "Wrong password!"}), 401

      payload = {
          "user_id": user.id,
          "email": user.email,
          "name": user.name,
          "exp": datetime.datetime.now(datetime.timezone.utc)
          + datetime.timedelta(days=1),
      }
      token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

      session.clear()
      session["user_name"] = user.name
      session["user_id"] = user.id
      return (
          jsonify({
              "message": "Login successful!",
              "token": token,
              "name": user.name,
              "user_id": user.id,
              "time": str(user.createdAt),
          }),
          200,
      )
    except Exception:
      return server_error()

  return run_async(_login)


@app.route("/api/users", methods=["GET"])
@token_required
def get_users():
  async def _get_users(db):
    try:
      users = await db.user.find_many()
      result = [{"id": u.id, "name": u.name, "email": u.email} for u in users]
      return jsonify(result), 200
    except Exception:
      return server_error()

  return run_async(_get_users)


# ================= CATEGORY APIs =================
@app.route("/api/categories", methods=["GET"])
@token_required
def get_categories():
  async def _get_categories(db):
    try:
      categories = await db.category.find_many(
          include={"createdBy": True}, order={"createdAt": "desc"}
      )
      result = [{
          "id": cat.id,
          "name": cat.name,
          "createdById": cat.createdById,
          "createdByName": cat.createdBy.name if cat.createdBy else "Unknown",
          "createdAt": str(cat.createdAt),
          "updatedAt": str(cat.updatedAt),
      } for cat in categories]
      return jsonify(result), 200
    except Exception:
      return server_error()

  return run_async(_get_categories)


@app.route("/api/categories", methods=["POST"])
@token_required
def add_category():
  data = request.get_json(silent=True) or {}
  name = (data.get("name") or "").strip()

  if not name:
    return jsonify({"error": "Category name is required!"}), 400

  async def _create_category(db):
    try:
      existing = await db.category.find_unique(where={"name": name})
      if existing:
        return jsonify({"error": "Category with this name already exists!"}), 400

      new_cat = await db.category.create(
          data={"name": name, "createdById": request.user_id}
      )
      return (
          jsonify({
              "message": "Category created successfully!",
              "category": {
                  "id": new_cat.id,
                  "name": new_cat.name,
                  "createdById": new_cat.createdById,
              },
          }),
          201,
      )
    except Exception:
      return server_error()

  return run_async(_create_category)


@app.route("/api/categories/<int:category_id>", methods=["PUT"])
@token_required
def update_category(category_id):
  data = request.get_json(silent=True) or {}
  name = (data.get("name") or "").strip()

  if not name:
    return jsonify({"error": "Category name is required for update!"}), 400

  async def _update_category(db):
    try:
      category = await db.category.find_unique(where={"id": category_id})
      if not category:
        return jsonify({"error": "Category not found!"}), 404

      updated_cat = await db.category.update(
          where={"id": category_id}, data={"name": name}
      )
      return (
          jsonify({
              "message": "Category updated successfully!",
              "category": {"id": updated_cat.id, "name": updated_cat.name},
          }),
          200,
      )
    except Exception:
      return server_error()

  return run_async(_update_category)


@app.route("/api/categories/<int:category_id>", methods=["DELETE"])
@token_required
def delete_category(category_id):
  async def _delete_category(db):
    try:
      category = await db.category.find_unique(where={"id": category_id})
      if not category:
        return jsonify({"error": "Category not found!"}), 404

      used = await db.expense.count(where={"categoryId": category_id})
      if used:
        return (
            jsonify({"error": "Cannot delete category because it is being used in expenses!"}),
            400,
        )

      await db.category.delete(where={"id": category_id})
      return jsonify({"message": "Category deleted successfully!"}), 200
    except Exception:
      return server_error()

  return run_async(_delete_category)


# ================= EXPENSE APIs =================
@app.route("/api/expenses", methods=["GET"])
@token_required
def get_expenses():
  """Only expenses where the logged-in user is 'Expense By' or in 'Share With'.
  Optional filters: ?search=<text>&status=All|Pending|Completed"""

  # ?search=dinner&status=Pending   (both optional; status: All | Pending | Completed)
  search = (request.args.get("search") or "").strip()[:100]
  status = (request.args.get("status") or "all").strip().lower()
  if status not in VALID_STATUS_FILTERS:
    return jsonify({"error": "Invalid status filter. Use All, Pending or Completed."}), 400

  async def _get_expenses(db):
    try:
      user_id = int(request.user_id)

      all_expenses = await db.expense.find_many(order={"createdAt": "desc"})
      visible = [e for e in all_expenses if can_access_expense(e, user_id)]

      if status != "all":
        visible = [e for e in visible if (e.status or "").lower() == status]

      result = await build_expense_list(db, visible)
      if search:
        result = [item for item in result if expense_matches_search(item, search)]

      return jsonify(result), 200
    except Exception:
      return server_error("Failed to load expenses.")

  return run_async(_get_expenses)


@app.route("/api/expenses", methods=["POST"])
@token_required
def add_expense():
  data = request.get_json(silent=True) or {}

  try:
    title, amount, category_id, payer_id, shares = parse_expense_payload(data)
    creator_id = int(request.user_id)
  except PayloadError as e:
    return jsonify({"error": str(e)}), 400
  except (ValueError, TypeError):
    return jsonify({"error": "Invalid IDs or amount format!"}), 400

  share_ids = merge_mandatory_ids(shares, creator_id, payer_id)

  async def _create_expense(db):
    try:
      error = await validate_expense_refs(db, category_id, share_ids)
      if error:
        return error

      new_expense = await db.expense.create(
          data={
              "title": title,
              "amount": amount,
              "categoryId": category_id,
              "status": "Pending",
              "createdById": creator_id,
              "expenseById": payer_id,
              "shareUserIds": share_ids,
          }
      )
      log_error = await write_creation_log(db, new_expense)

      return (
          jsonify({
              "message": "Expense successfully added!",
              "expenseId": new_expense.id,
              "logError": log_error,
          }),
          201,
      )
    except Exception:
      return server_error("Failed to add expense.")

  return run_async(_create_expense)


@app.route("/api/expenses/<int:expense_id>", methods=["GET"])
@token_required
def get_expense(expense_id):
  async def _get_expense(db):
    try:
      exp = await db.expense.find_unique(where={"id": expense_id})
      if not exp or not can_access_expense(exp, int(request.user_id)):
        return jsonify({"error": "Expense not found"}), 404

      data = (await build_expense_list(db, [exp]))[0]
      data["logs"], data["logError"] = await build_log_entries(db, exp)
      return jsonify(data), 200
    except Exception:
      return server_error("Failed to load expense.")

  return run_async(_get_expense)


@app.route("/api/expenses/<int:expense_id>/logs", methods=["GET"])
@token_required
def get_expense_logs(expense_id):
  """Activity log only: who created / edited, when, and exactly what changed."""

  async def _get_logs(db):
    try:
      exp = await db.expense.find_unique(where={"id": expense_id})
      if not exp or not can_access_expense(exp, int(request.user_id)):
        return jsonify({"error": "Expense not found"}), 404

      logs, log_error = await build_log_entries(db, exp)
      return jsonify({"expenseId": exp.id, "logs": logs, "logError": log_error}), 200
    except Exception:
      return server_error("Failed to load logs.")

  return run_async(_get_logs)


@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
@token_required
def update_expense(expense_id):
  data = request.get_json(silent=True) or {}

  try:
    title, amount, category_id, payer_id, shares = parse_expense_payload(data)
  except PayloadError as e:
    return jsonify({"error": str(e)}), 400
  except (ValueError, TypeError):
    return jsonify({"error": "Invalid IDs or amount format!"}), 400

  async def _update_expense(db):
    try:
      existing = await db.expense.find_unique(where={"id": expense_id})
      if not existing or not can_access_expense(existing, int(request.user_id)):
        return jsonify({"error": "Expense not found"}), 404

      # Original creator and the payer always stay in the share list
      share_ids = merge_mandatory_ids(shares, existing.createdById, payer_id)

      error = await validate_expense_refs(db, category_id, share_ids)
      if error:
        return error

      changes = await compute_changes(
          db, existing, title, amount, category_id, payer_id, share_ids
      )
      if not changes:
        return (
            jsonify({
                "message": "No changes detected.",
                "expenseId": expense_id,
                "noChanges": True,
            }),
            200,
        )

      updated = await db.expense.update(
          where={"id": expense_id},
          data={
              "title": title,
              "amount": amount,
              "categoryId": category_id,
              "expenseById": payer_id,
              "shareUserIds": share_ids,
              "updatedById": int(request.user_id),
          },
      )
      log_error = await write_update_log(db, expense_id, int(request.user_id), changes)

      return (
          jsonify({
              "message": "Expense updated successfully!",
              "expenseId": updated.id,
              "logError": log_error,
          }),
          200,
      )
    except Exception:
      return server_error("Failed to update expense.")

  return run_async(_update_expense)


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
@token_required
def delete_expense(expense_id):
  async def _delete_expense(db):
    try:
      expense = await db.expense.find_unique(where={"id": expense_id})
      if not expense or not can_access_expense(expense, int(request.user_id)):
        return jsonify({"error": "Expense not found"}), 404

      if expense.createdById != int(request.user_id):
        return (
            jsonify({"error": "Only the person who created this expense can delete it!"}),
            403,
        )

      try:
        await db.expenselog.delete_many(where={"expenseId": expense_id})
      except Exception:
        traceback.print_exc()

      await db.expense.delete(where={"id": expense_id})
      return jsonify({"message": "Expense deleted successfully"}), 200
    except Exception:
      return server_error("Failed to delete expense.")

  return run_async(_delete_expense)


def startup_check():
  """Tells you right at startup if this Python process has the NEW Prisma client."""
  try:
    ok = hasattr(Prisma(), "expenselog")
  except Exception:
    ok = False
  if ok:
    print("[CHECK] OK: Prisma client has ExpenseLog (logs will be saved).")
  else:
    print("[CHECK] PROBLEM: Prisma client has NO ExpenseLog. Run `prisma generate` "
          "in THIS python environment, then restart Flask.")


if __name__ == "__main__":
  startup_check()
  app.run(debug=True, port=5000, use_reloader=False)