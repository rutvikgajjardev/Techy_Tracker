"""
Settlement Controller
Handles Pair-wise Net Balance computation and 1-Click Mutual Reconciliation
across all shared expenses for Techy Tracker.
"""
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from backend.controllers.auth_controller import token_required
from backend.db import with_db

settlement_bp = Blueprint("settlements", __name__)


@settlement_bp.route("/pairs", methods=["GET"])
@token_required
@with_db
async def get_settlement_pairs(db, current_user_id):
    """
    Computes user-wise Net Balances between the logged-in user and each friend.
    Returns:
    - User details (Name, Initials, Avatar, UPI ID)
    - Total they owe me (theyOweMe)
    - Total I owe them (iOweThem)
    - Net Amount & Status (YOU_OWE | OWES_YOU | SETTLED)
    - Category-wise breakdown (e.g. Food: ₹122, Transport: ₹300)
    - Itemized pending expense list for transparency
    """
    # Fetch all unsettled participants where either:
    # 1) Current user is the participant (I owe someone else)
    # 2) Current user is the payer of the expense (someone owes me)
    unsettled_parts = await db.expenseparticipant.find_many(
        where={
            "isSettled": False,
            "expense": {
                "status": "PENDING"
            },
            "OR": [
                {"userId": current_user_id},
                {"expense": {"paidById": current_user_id}}
            ]
        },
        include={
            "expense": {
                "include": {
                    "category": True,
                    "paidBy": True
                }
            },
            "user": True
        }
    )

    pairs_map = {}

    for part in unsettled_parts:
        exp = part.expense
        if not exp:
            continue

        share_amt = float(part.shareAmount)
        cat_name = exp.category.name if exp.category else "General"
        cat_id = exp.categoryId or 0

        # Case A: Current user is the payer -> the participant owes ME money
        if exp.paidById == current_user_id and part.userId != current_user_id:
            friend_id = part.userId
            friend_user = part.user

            if friend_id not in pairs_map:
                pairs_map[friend_id] = {
                    "friend": friend_user,
                    "theyOweMe": 0.0,
                    "iOweThem": 0.0,
                    "categories": {},
                    "expenses": []
                }

            pairs_map[friend_id]["theyOweMe"] += share_amt

            # Category accumulator
            if cat_id not in pairs_map[friend_id]["categories"]:
                pairs_map[friend_id]["categories"][cat_id] = {
                    "categoryId": cat_id,
                    "categoryName": cat_name,
                    "theyOweMe": 0.0,
                    "iOweThem": 0.0,
                    "amount": 0.0,
                    "count": 0
                }
            pairs_map[friend_id]["categories"][cat_id]["theyOweMe"] += share_amt
            pairs_map[friend_id]["categories"][cat_id]["amount"] += share_amt
            pairs_map[friend_id]["categories"][cat_id]["count"] += 1

            pairs_map[friend_id]["expenses"].append({
                "id": exp.id,
                "expenseId": exp.id,
                "title": exp.title,
                "expenseDate": exp.expenseDate.isoformat(),
                "categoryId": cat_id,
                "categoryName": cat_name,
                "amount": share_amt,
                "totalExpenseAmount": float(exp.amount),
                "yourShare": share_amt,
                "relationship": "OWES_YOU",
                "type": "THEY_OWE_YOU",
                "paidByName": "You",
                "participantName": friend_user.name if friend_user else "Friend"
            })

        # Case B: Friend is the payer -> I owe the friend money
        elif exp.paidById != current_user_id and part.userId == current_user_id:
            friend_id = exp.paidById
            friend_user = exp.paidBy

            if friend_id not in pairs_map:
                pairs_map[friend_id] = {
                    "friend": friend_user,
                    "theyOweMe": 0.0,
                    "iOweThem": 0.0,
                    "categories": {},
                    "expenses": []
                }

            pairs_map[friend_id]["iOweThem"] += share_amt

            # Category accumulator
            if cat_id not in pairs_map[friend_id]["categories"]:
                pairs_map[friend_id]["categories"][cat_id] = {
                    "categoryId": cat_id,
                    "categoryName": cat_name,
                    "theyOweMe": 0.0,
                    "iOweThem": 0.0,
                    "amount": 0.0,
                    "count": 0
                }
            pairs_map[friend_id]["categories"][cat_id]["iOweThem"] += share_amt
            pairs_map[friend_id]["categories"][cat_id]["amount"] += share_amt
            pairs_map[friend_id]["categories"][cat_id]["count"] += 1

            pairs_map[friend_id]["expenses"].append({
                "id": exp.id,
                "expenseId": exp.id,
                "title": exp.title,
                "expenseDate": exp.expenseDate.isoformat(),
                "categoryId": cat_id,
                "categoryName": cat_name,
                "amount": share_amt,
                "totalExpenseAmount": float(exp.amount),
                "yourShare": share_amt,
                "relationship": "YOU_OWE",
                "type": "YOU_OWE_THEM",
                "paidByName": friend_user.name if friend_user else "Friend",
                "participantName": "You"
            })

    result_pairs = []
    for friend_id, data in pairs_map.items():
        friend = data["friend"]
        they_owe = round(data["theyOweMe"], 2)
        i_owe = round(data["iOweThem"], 2)
        net = round(they_owe - i_owe, 2)

        if net > 0:
            status = "OWES_YOU"
        elif net < 0:
            status = "YOU_OWE"
        else:
            status = "SETTLED"

        # Sort categories by descending total
        categories = sorted(
            list(data["categories"].values()),
            key=lambda c: c["amount"],
            reverse=True
        )
        for c in categories:
            c["theyOweMe"] = round(c.get("theyOweMe", 0.0), 2)
            c["iOweThem"] = round(c.get("iOweThem", 0.0), 2)
            c["they_owe_me"] = c["theyOweMe"]
            c["i_owe_them"] = c["iOweThem"]
            c["amount"] = round(c.get("amount", 0.0), 2)
            c["totalPending"] = round(c["theyOweMe"] + c["iOweThem"], 2)
            c["total_pending"] = c["totalPending"]
            c["net"] = round(c["theyOweMe"] - c["iOweThem"], 2)

        # Build clean initial
        friend_name = friend.name if friend else "Friend"
        parts = friend_name.split()
        initials = (parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")).upper()

        user_obj = {
            "id": friend_id,
            "name": friend_name,
            "email": friend.email if friend else "",
            "upi_id": getattr(friend, "upi_id", None) if friend else None,
            "profileImage": getattr(friend, "profileImage", None) if friend else None,
        }

        result_pairs.append({
            "user": user_obj,
            "friendId": friend_id,
            "friendName": friend_name,
            "friendEmail": friend.email if friend else "",
            "friendInitials": initials,
            "friendProfileImage": getattr(friend, "profileImage", None),
            "friendUpiId": getattr(friend, "upi_id", None),
            "theyOweMe": they_owe,
            "iOweThem": i_owe,
            "netAmount": abs(net),
            "rawNet": net,
            "status": status,
            "categories": categories,
            "expenses": data["expenses"],
            "pendingExpensesCount": len(data["expenses"])
        })

    # Sort pairs: highest absolute net debt first
    result_pairs.sort(key=lambda x: x["netAmount"], reverse=True)

    return jsonify({
        "success": True,
        "pairs": result_pairs,
        "count": len(result_pairs)
    }), 200


@settlement_bp.route("/pair-settle", methods=["POST"])
@token_required
@with_db
async def settle_pair(db, current_user_id):
    """
    1-Click Mutual Settlement between logged-in user and target friend.
    - Sets isSettled = True & settledAt = now for all cross-debts between both users.
    - Automatically updates Expense.status to COMPLETED if all participants are settled.
    - Appends audit trail logs for transparency.
    """
    data = request.get_json(silent=True) or {}
    target_user_id = data.get("targetUserId")

    if not target_user_id or not isinstance(target_user_id, int):
        return jsonify({"success": False, "error": "A valid targetUserId integer is required."}), 400

    if target_user_id == current_user_id:
        return jsonify({"success": False, "error": "Cannot settle debts with yourself."}), 400

    # 1. Fetch current user and target user to ensure both exist
    current_user = await db.user.find_unique(where={"id": current_user_id})
    target_user = await db.user.find_unique(where={"id": target_user_id})

    if not target_user:
        return jsonify({"success": False, "error": "Target user does not exist."}), 404

    # 2. Find all pending cross-splits between both users
    unsettled_parts = await db.expenseparticipant.find_many(
        where={
            "isSettled": False,
            "expense": {
                "status": "PENDING"
            },
            "OR": [
                {
                    "userId": target_user_id,
                    "expense": {"paidById": current_user_id}
                },
                {
                    "userId": current_user_id,
                    "expense": {"paidById": target_user_id}
                }
            ]
        },
        include={
            "expense": True
        }
    )

    if not unsettled_parts:
        return jsonify({
            "success": False,
            "error": f"No unsettled balances found between you and {target_user.name}."
        }), 400

    now = datetime.now(timezone.utc)
    affected_expense_ids = set()

    # 3. Mark all reciprocal splits as settled
    for part in unsettled_parts:
        affected_expense_ids.add(part.expenseId)
        await db.expenseparticipant.update(
            where={"id": part.id},
            data={
                "isSettled": True,
                "settledAt": now
            }
        )

    # 4. Check and update Expense.status and record audit logs
    completed_expenses = []
    for exp_id in affected_expense_ids:
        exp = await db.expense.find_unique(where={"id": exp_id})
        if not exp:
            continue

        all_parts = await db.expenseparticipant.find_many(where={"expenseId": exp_id})
        non_payers = [p for p in all_parts if p.userId != exp.paidById]
        all_settled = len(non_payers) == 0 or all(bool(p.isSettled) for p in non_payers)

        new_status = "COMPLETED" if all_settled else exp.status

        if new_status != exp.status:
            await db.expense.update(
                where={"id": exp_id},
                data={"status": new_status}
            )
            completed_expenses.append(exp.title)

        # Record immutable audit log
        await db.expenseauditlog.create(
            data={
                "expenseId": exp_id,
                "actorId": current_user_id,
                "action": "SETTLED",
                "summary": f"Mutual settlement applied between {current_user.name} and {target_user.name}. Split marked as settled.",
                "diff": json.dumps([
                    {"field": "isSettled", "old": False, "new": True},
                    {"field": "status", "old": exp.status, "new": new_status}
                ])
            }
        )

    return jsonify({
        "success": True,
        "message": f"Successfully settled {len(unsettled_parts)} pending split(s) with {target_user.name}.",
        "settledCount": len(unsettled_parts),
        "affectedExpensesCount": len(affected_expense_ids),
        "completedExpenses": completed_expenses
    }), 200
