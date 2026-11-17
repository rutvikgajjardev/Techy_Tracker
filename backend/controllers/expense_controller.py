"""
Expense Controller
Handles full lifecycle with Prisma DB persistence:
- Create Expense + Normalized ExpenseParticipant rows (payer settled=True, others settled=False)
- Update Expense + Sync ExpenseParticipant.isSettled & settledAt when status changes to COMPLETED/PENDING
- Delete Expense
- Logs (ExpenseAuditLog): Returns chronological change logs
"""
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from flask import Blueprint, jsonify, request
from backend.controllers.auth_controller import token_required
from backend.services.audit_service import AuditService
from backend.db import with_db

expense_bp = Blueprint("expenses", __name__)


def _serialize_participant(p, exp):
    is_payer = p.userId == exp.paidById
    is_settled = is_payer or bool(p.isSettled) or exp.status == "COMPLETED"
    return {
        "userId": p.userId,
        "name": p.user.name if p.user else f"User #{p.userId}",
        "upi_id": getattr(p.user, "upi_id", None) if getattr(p, "user", None) else None,
        "shareAmount": float(p.shareAmount),
        "isSettled": is_settled,
        "settledAt": p.settledAt.isoformat() if getattr(p, "settledAt", None) else None,
        "owesToUserId": None if is_settled else exp.paidById,
        "owesToName": None if is_settled else (exp.paidBy.name if getattr(exp, "paidBy", None) else None),
        "owesToUpiId": None if is_settled else (getattr(exp.paidBy, "upi_id", None) if getattr(exp, "paidBy", None) else None),
    }


def _compute_expense_status(exp):
    """
    Computes real status based on participant settlement:
    - If all participants who are not the payer have paid/settled, status is COMPLETED.
    - If any participant still owes money, status is PENDING.
    """
    if not getattr(exp, "participants", None):
        return "COMPLETED"
    non_payers = [p for p in exp.participants if p.userId != exp.paidById]
    if len(non_payers) == 0:
        return "COMPLETED"
    all_settled = all(bool(p.isSettled) for p in non_payers)
    return "COMPLETED" if all_settled else "PENDING"


def serialize_expense(exp, include_audit=False):
    """
    Unified serializer for Expense models into consistent JSON format across all endpoints.
    Eliminates redundant dict transformations and ensures contract consistency.
    """
    real_status = _compute_expense_status(exp)

    audit_trail = []
    if include_audit and getattr(exp, "auditLogs", None):
        for log in exp.auditLogs:
            diff_data = log.diff
            if isinstance(diff_data, str):
                try:
                    diff_data = json.loads(diff_data)
                except Exception:
                    diff_data = []
            audit_trail.append({
                "id": log.id,
                "action": log.action,
                "summary": log.summary,
                "diff": diff_data,
                "actorId": log.actorId,
                "actorName": log.actor.name if getattr(log, "actor", None) else "User",
                "actorEmail": getattr(log.actor, "email", None) if getattr(log, "actor", None) else None,
                "createdAt": log.createdAt.isoformat() if getattr(log, "createdAt", None) else None,
            })

    return {
        "id": exp.id,
        "title": exp.title,
        "description": exp.description,
        "amount": float(exp.amount),
        "currency": "INR",
        "status": real_status,
        "expenseDate": exp.expenseDate.isoformat() if getattr(exp, "expenseDate", None) else None,
        "createdAt": exp.createdAt.isoformat() if getattr(exp, "createdAt", None) else None,
        "updatedAt": exp.updatedAt.isoformat() if getattr(exp, "updatedAt", None) else None,
        "categoryId": exp.categoryId,
        "categoryName": exp.category.name if getattr(exp, "category", None) else "General",
        "createdById": exp.createdById,
        "createdByName": exp.createdBy.name if getattr(exp, "createdBy", None) else "User",
        "paidById": exp.paidById,
        "paidByName": exp.paidBy.name if getattr(exp, "paidBy", None) else "Unknown",
        "paidByUpiId": getattr(exp.paidBy, "upi_id", None) if getattr(exp, "paidBy", None) else None,
        "images": getattr(exp, "images", []) or [],
        "participants": [_serialize_participant(p, exp) for p in (getattr(exp, "participants", []) or [])],
        "auditTrail": audit_trail,
    }


@expense_bp.route("", methods=["GET"])
@token_required
@with_db
async def get_expenses(db, current_user_id):
    """
    Advanced Filtering & Sorting:
    - status: 'all' | 'pending' | 'completed'
    - category_id: optional category filter (used in Category-wise view)
    - date_range: 'year' | 'month' | 'week' | 'custom'
    - paid_by: specific user ID
    - sort: 'newer' | 'older' | 'amount_high' | 'amount_low'
    - search: text query matching title, category, or users
    """
    status_filter = (request.args.get("status") or "all").upper()
    category_id = request.args.get("category_id")
    date_range = request.args.get("date_range", "all")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    paid_by = request.args.get("paid_by")
    sort_by = request.args.get("sort", "newer")
    search = (request.args.get("search") or "").strip().lower()

    where_clause = {}

    if status_filter in ("PENDING", "COMPLETED"):
        where_clause["status"] = status_filter

    if category_id and category_id != "all":
        where_clause["categoryId"] = int(category_id)

    if paid_by and paid_by != "all":
        where_clause["paidById"] = int(paid_by)

    # Date Range Filter
    now = datetime.now(timezone.utc)
    if date_range == "week":
        start_dt = now - timedelta(days=7)
        where_clause["expenseDate"] = {"gte": start_dt}
    elif date_range == "month":
        start_dt = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        where_clause["expenseDate"] = {"gte": start_dt}
    elif date_range == "year":
        start_dt = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        where_clause["expenseDate"] = {"gte": start_dt}
    elif date_range == "custom" and start_date_str and end_date_str:
        try:
            start_dt = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            where_clause["expenseDate"] = {"gte": start_dt, "lte": end_dt}
        except ValueError:
            pass

    # Ordering
    order_clause = {"expenseDate": "desc"}
    if sort_by == "older":
        order_clause = {"expenseDate": "asc"}
    elif sort_by == "amount_high":
        order_clause = {"amount": "desc"}
    elif sort_by == "amount_low":
        order_clause = {"amount": "asc"}

    expenses = await db.expense.find_many(
        where=where_clause,
        include={
            "category": True,
            "paidBy": True,
            "createdBy": True,
            "participants": {"include": {"user": True}},
            "auditLogs": {
                "include": {"actor": True},
                "order_by": {"createdAt": "desc"}
            }
        },
        order=order_clause
    )

    output = []
    for e in expenses:
        participant_names = [p.user.name for p in e.participants if p.user]
        haystack = f"{e.title} {e.description or ''} {e.category.name if e.category else ''} {e.paidBy.name} {' '.join(participant_names)}".lower()
        if search and search not in haystack:
            continue

        real_status = _compute_expense_status(e)
        if e.status != real_status:
            await db.expense.update(where={"id": e.id}, data={"status": real_status})
            e.status = real_status

        output.append(serialize_expense(e, include_audit=True))

    return jsonify({"success": True, "count": len(output), "expenses": output}), 200


@expense_bp.route("", methods=["POST"])
@token_required
@with_db
async def create_expense(db, current_user_id):
    """
    Creates a new Expense in Prisma DB along with ExpenseParticipant rows and initial Audit Log.
    """
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip() or None
    amount = float(data.get("amount") or 0)
    category_id = data.get("categoryId")
    category_name = (data.get("categoryName") or "").strip()
    paid_by_id = int(data.get("paidById") or current_user_id)
    participant_ids = data.get("participantUserIds") or [paid_by_id]
    expense_date_str = data.get("expenseDate")
    raw_images = data.get("images") or []
    if isinstance(raw_images, str):
        raw_images = [raw_images]
    clean_images = [str(x).strip() for x in raw_images if str(x).strip()]

    if not title or amount <= 0:
        return jsonify({"success": False, "error": "Valid title and positive amount (INR) are required"}), 400

    try:
        # 1. Resolve Category: create on-the-fly if new name, or find existing
        target_cat_id = None
        if category_name:
            all_cats = await db.category.find_many()
            for c in all_cats:
                if c.name.strip().lower() == category_name.lower():
                    target_cat_id = c.id
                    break
            if not target_cat_id:
                new_cat = await db.category.create(
                    data={"name": category_name}
                )
                target_cat_id = new_cat.id
        elif category_id:
            try:
                cat = await db.category.find_unique(where={"id": int(category_id)})
                if cat:
                    target_cat_id = cat.id
            except (ValueError, TypeError):
                pass

        if not target_cat_id:
            first_cat = await db.category.find_first(order={"id": "asc"})
            if not first_cat:
                first_cat = await db.category.create(
                    data={"name": "General"}
                )
            target_cat_id = first_cat.id

        # 2. Verify Paid By user exists or fallback to current user
        target_payer_id = paid_by_id
        payer_user = await db.user.find_unique(where={"id": target_payer_id})
        if not payer_user:
            target_payer_id = current_user_id

        # 3. Deduplicate and validate participant user IDs
        raw_uids = []
        for uid in participant_ids:
            try:
                raw_uids.append(int(uid))
            except (ValueError, TypeError):
                pass
        unique_uids = list(dict.fromkeys(raw_uids))

        existing_users = await db.user.find_many(where={"id": {"in": unique_uids}})
        existing_uid_set = {u.id for u in existing_users}
        valid_participant_ids = [u for u in unique_uids if u in existing_uid_set]

        if not valid_participant_ids:
            valid_participant_ids = [target_payer_id]
        elif target_payer_id not in valid_participant_ids:
            valid_participant_ids.append(target_payer_id)

        now = datetime.now(timezone.utc)
        exp_dt = now
        if expense_date_str:
            try:
                parsed_dt = datetime.fromisoformat(expense_date_str.replace("Z", "+00:00"))
                exp_dt = parsed_dt if parsed_dt.tzinfo else parsed_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                exp_dt = now

        share_amount = round(amount / max(len(valid_participant_ids), 1), 2)

        non_payer_participants = [uid for uid in valid_participant_ids if uid != target_payer_id]
        initial_status = "COMPLETED" if len(non_payer_participants) == 0 else "PENDING"

        new_exp = await db.expense.create(
            data={
                "title": title,
                "description": description,
                "amount": Decimal(str(amount)),
                "status": initial_status,
                "expenseDate": exp_dt,
                "images": clean_images,
                "category": {"connect": {"id": target_cat_id}},
                "createdBy": {"connect": {"id": current_user_id}},
                "paidBy": {"connect": {"id": target_payer_id}},
                "participants": {
                    "create": [
                        {
                            "userId": int(uid),
                            "shareAmount": Decimal(str(share_amount)),
                            "isSettled": int(uid) == target_payer_id,
                            "settledAt": now if int(uid) == target_payer_id else None,
                        }
                        for uid in valid_participant_ids
                    ]
                },
            },
            include={
                "category": True,
                "paidBy": True,
                "createdBy": True,
                "participants": {"include": {"user": True}},
            },
        )

        await AuditService.record_creation(db, new_exp.id, current_user_id, title, amount)

        return jsonify({
            "success": True,
            "expense": serialize_expense(new_exp)
        }), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Failed to record expense: {str(e)}"}), 500


@expense_bp.route("/<int:expense_id>", methods=["PUT", "PATCH"])
@token_required
@with_db
async def update_expense(db, current_user_id, expense_id):
    """
    Updates an Expense in Prisma DB and syncs ExpenseParticipant.isSettled in database:
    - When status is updated to 'COMPLETED', all ExpenseParticipant rows are updated with
      isSettled = True and settledAt = now in the database so pending amounts vanish.
    - When status is updated to 'PENDING', only the payer's participant row has isSettled = True,
      and all other participants have isSettled = False (owing shareAmount to paidBy).
    """
    data = request.get_json(silent=True) or {}

    try:
        old_exp = await db.expense.find_unique(
            where={"id": expense_id},
            include={"participants": True}
        )
        if not old_exp:
            return jsonify({"success": False, "error": "Expense not found"}), 404

        users = await db.user.find_many()
        cats = await db.category.find_many()
        users_map = {u.id: u.name for u in users}
        cats_map = {c.id: c.name for c in cats}

        new_title = data.get("title", old_exp.title)
        new_desc = data.get("description", old_exp.description)
        new_amount = float(data.get("amount", float(old_exp.amount)))
        target_cat_id = old_exp.categoryId
        new_cat_name = (data.get("categoryName") or "").strip()
        if new_cat_name:
            matched_cat = next((c for c in cats if c.name.strip().lower() == new_cat_name.lower()), None)
            if matched_cat:
                target_cat_id = matched_cat.id
            else:
                new_cat = await db.category.create(
                    data={"name": new_cat_name}
                )
                target_cat_id = new_cat.id
        elif "categoryId" in data:
            try:
                cat = await db.category.find_unique(where={"id": int(data["categoryId"])})
                if cat:
                    target_cat_id = cat.id
            except (ValueError, TypeError):
                pass
        target_paid_by_id = int(data.get("paidById", old_exp.paidById))
        new_status = data.get("status", old_exp.status)
        raw_participant_ids = data.get("participantUserIds") or [p.userId for p in old_exp.participants]

        # 2. Validate Paid By
        payer_user = await db.user.find_unique(where={"id": target_paid_by_id})
        if not payer_user:
            target_paid_by_id = old_exp.paidById

        # 3. Deduplicate and validate participant IDs
        raw_uids = []
        for uid in raw_participant_ids:
            try:
                raw_uids.append(int(uid))
            except (ValueError, TypeError):
                pass
        unique_uids = list(dict.fromkeys(raw_uids))
        existing_users = await db.user.find_many(where={"id": {"in": unique_uids}})
        existing_uid_set = {u.id for u in existing_users}
        valid_participant_ids = [u for u in unique_uids if u in existing_uid_set]
        if not valid_participant_ids:
            valid_participant_ids = [target_paid_by_id]
        elif target_paid_by_id not in valid_participant_ids:
            valid_participant_ids.append(target_paid_by_id)

        changes, summary = AuditService.compute_expense_diff(
            old_exp,
            {
                "title": new_title,
                "amount": new_amount,
                "categoryId": target_cat_id,
                "paidById": target_paid_by_id,
                "status": new_status,
            },
            old_exp.participants,
            valid_participant_ids,
            users_map,
            cats_map,
        )

        now = datetime.now(timezone.utc)
        share_amount = round(new_amount / max(len(valid_participant_ids), 1), 2)

        # Sync ExpenseParticipant rows in DB (including isSettled based on COMPLETED vs PENDING)
        await db.expenseparticipant.delete_many(where={"expenseId": expense_id})
        for uid in valid_participant_ids:
            uid_int = int(uid)
            is_settled = True if new_status == "COMPLETED" else (uid_int == target_paid_by_id)
            await db.expenseparticipant.create(
                data={
                    "expenseId": expense_id,
                    "userId": uid_int,
                    "shareAmount": Decimal(str(share_amount)),
                    "isSettled": is_settled,
                    "settledAt": now if is_settled else None,
                }
            )

        update_data = {
            "title": new_title,
            "description": new_desc,
            "amount": Decimal(str(new_amount)),
            "category": {"connect": {"id": target_cat_id}},
            "paidBy": {"connect": {"id": target_paid_by_id}},
            "status": new_status,
        }
        if "expenseDate" in data and data["expenseDate"]:
            try:
                parsed_dt = datetime.fromisoformat(data["expenseDate"].replace("Z", "+00:00"))
                update_data["expenseDate"] = parsed_dt if parsed_dt.tzinfo else parsed_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if "images" in data:
            raw_up_imgs = data.get("images") or []
            if isinstance(raw_up_imgs, str):
                raw_up_imgs = [raw_up_imgs]
            update_data["images"] = [str(x).strip() for x in raw_up_imgs if str(x).strip()]

        updated_exp = await db.expense.update(
            where={"id": expense_id},
            data=update_data,
            include={
                "category": True,
                "paidBy": True,
                "createdBy": True,
                "participants": {"include": {"user": True}},
            },
        )

        await AuditService.record_update(db, expense_id, current_user_id, changes, summary)

        logs = await db.expenseauditlog.find_many(
            where={"expenseId": expense_id},
            include={"actor": True},
            order={"createdAt": "desc"},
        )

        exp_dict = serialize_expense(updated_exp, include_audit=False)
        exp_dict["auditTrail"] = [{
            "id": log.id,
            "action": log.action,
            "summary": log.summary,
            "diff": json.loads(log.diff) if isinstance(log.diff, str) else log.diff,
            "actorId": log.actorId,
            "actorName": log.actor.name if log.actor else "User",
            "actorEmail": getattr(log.actor, "email", None) if getattr(log, "actor", None) else None,
            "createdAt": log.createdAt.isoformat() if getattr(log, "createdAt", None) else None,
        } for log in logs]

        return jsonify({
            "success": True,
            "expense": exp_dict
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Failed to update expense: {str(e)}"}), 500


@expense_bp.route("/<int:expense_id>", methods=["GET"])
@token_required
@with_db
async def get_expense_details(db, current_user_id, expense_id):
    """
    Returns full details + complete Logs history
    """
    exp = await db.expense.find_unique(
        where={"id": expense_id},
        include={
            "category": True,
            "paidBy": True,
            "createdBy": True,
            "participants": {"include": {"user": True}},
            "auditLogs": {
                "include": {"actor": True},
                "order_by": {"createdAt": "desc"}
            }
        }
    )
    if not exp:
        return jsonify({"success": False, "error": "Expense not found"}), 404

    real_status = _compute_expense_status(exp)
    if exp.status != real_status:
        await db.expense.update(where={"id": expense_id}, data={"status": real_status})
        exp.status = real_status

    return jsonify({
        "success": True,
        "expense": serialize_expense(exp, include_audit=True)
    }), 200


@expense_bp.route("/<int:expense_id>", methods=["DELETE"])
@token_required
@with_db
async def delete_expense(db, current_user_id, expense_id):
    exp = await db.expense.find_unique(where={"id": expense_id})
    if not exp:
        return jsonify({"success": False, "error": "Expense not found"}), 404

    if exp.createdById != current_user_id:
        return jsonify({
            "success": False,
            "error": "Unauthorized: Only the creator of this expense is allowed to delete it"
        }), 403

    await db.expense.delete(where={"id": expense_id})
    return jsonify({"success": True, "message": "Expense deleted successfully"}), 200


@expense_bp.route("/<int:expense_id>/participants/<int:target_user_id>/toggle-settle", methods=["POST", "PUT"])
@token_required
@with_db
async def toggle_participant_settle(db, current_user_id, expense_id, target_user_id):
    """
    Toggles an individual participant's settled status:
    - Allowed by: expense payer (who received the money), the participant themselves (who paid), or creator.
    - When all participants who are not the payer have paid, status automatically becomes COMPLETED.
    - If any participant still owes money, status is PENDING.
    """
    exp = await db.expense.find_unique(
        where={"id": expense_id},
        include={
            "participants": {"include": {"user": True}},
            "paidBy": True,
            "createdBy": True,
            "category": True,
        }
    )
    if not exp:
        return jsonify({"success": False, "error": "Expense not found"}), 404

    is_payer = exp.paidById == current_user_id
    is_target = target_user_id == current_user_id
    is_creator = exp.createdById == current_user_id
    if not (is_payer or is_target or is_creator):
        return jsonify({
            "success": False,
            "error": "Unauthorized: Only the payer, the participant, or the creator can settle this share"
        }), 403

    target_part = next((p for p in exp.participants if p.userId == target_user_id), None)
    if not target_part:
        return jsonify({"success": False, "error": "Participant not found in this expense"}), 404

    now = datetime.now(timezone.utc)
    # Payer is always settled
    new_is_settled = True if target_user_id == exp.paidById else not target_part.isSettled

    await db.expenseparticipant.update(
        where={"expenseId_userId": {"expenseId": expense_id, "userId": target_user_id}},
        data={
            "isSettled": new_is_settled,
            "settledAt": now if new_is_settled else None,
        }
    )

    # Recalculate status of the expense
    updated_parts = await db.expenseparticipant.find_many(
        where={"expenseId": expense_id},
        include={"user": True}
    )
    non_payers = [p for p in updated_parts if p.userId != exp.paidById]
    all_paid = len(non_payers) == 0 or all(bool(p.isSettled) for p in non_payers)
    new_status = "COMPLETED" if all_paid else "PENDING"

    if exp.status != new_status:
        await db.expense.update(where={"id": expense_id}, data={"status": new_status})
        await AuditService.record_update(
            db,
            expense_id,
            current_user_id,
            [{"field": "Status", "old": exp.status, "new": new_status}],
            f"Status changed from {exp.status} to {new_status}"
        )

    refetched = await db.expense.find_unique(
        where={"id": expense_id},
        include={
            "category": True,
            "paidBy": True,
            "createdBy": True,
            "participants": {"include": {"user": True}},
            "auditLogs": {"include": {"actor": True}, "order_by": {"createdAt": "desc"}},
        }
    )

    return jsonify({
        "success": True,
        "message": f"Participant {target_part.user.name if target_part.user else target_user_id} marked as {'settled' if new_is_settled else 'pending'}",
        "expense": serialize_expense(refetched)
    }), 200
