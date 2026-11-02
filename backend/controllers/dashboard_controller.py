"""
Dashboard Controller
Provides user-specific aggregated metrics, KPI computations (INR), and chart data from Prisma DB.
"""
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from backend.controllers.auth_controller import token_required
from prisma import Prisma

dashboard_bp = Blueprint("dashboard", __name__)

CHART_PALETTE = [
    "#4F46E5",
    "#0EA5E9",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
]


def _get_user_personal_share(exp, current_user_id: int):
    """
    Calculates the logged-in user's personal expenditure share and involvement:
    1. Personal (non-shared) expense: 100% of amount if created/paid by user.
    2. Shared/Group expense (paid by user OR someone else): only the user's own split shareAmount.
    """
    participants = exp.participants or []
    my_split = next((p for p in participants if p.userId == current_user_id), None)

    if len(participants) == 0:
        if exp.paidById == current_user_id or exp.createdById == current_user_id:
            return float(exp.amount), True
        return 0.0, False

    if len(participants) == 1 and my_split is not None:
        return float(exp.amount), True

    if my_split is not None:
        return float(my_split.shareAmount), True

    return 0.0, False


@dashboard_bp.route("/summary", methods=["GET"])
@token_required
def get_dashboard_summary(current_user_id):
    """
    Returns user-specific dashboard summary:
    - period: 'all_time' | 'this_year' | 'this_month' | 'this_week' | 'custom'
    - KPIs:
        * totalExpenses: Logged-in user's actual personal expenditure share (INR)
        * totalCount: Number of transactions where logged-in user is involved in the expenditure
        * sharedExpensesToPay: Pending amount the logged-in user owes others
        * amountOwedToMe: Pending amount others owe the logged-in user
        * netBalance: amountOwedToMe - sharedExpensesToPay
    - Category-wise Expense Distribution for Donut Chart (user's personal share)
    - Time-series Spending Chart (user's personal share)
    - Recent Expenses preview (limit 5)
    """
    period = request.args.get("period", "all_time")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    now = datetime.now(timezone.utc)
    date_filter = {}

    if period == "this_week":
        start_date = now - timedelta(days=7)
        date_filter = {"gte": start_date}
    elif period == "this_month":
        start_date = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        date_filter = {"gte": start_date}
    elif period == "this_year":
        start_date = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        date_filter = {"gte": start_date}
    elif period == "custom" and start_date_str and end_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            date_filter = {"gte": start_date, "lte": end_date}
        except ValueError:
            return jsonify({"error": "Invalid custom date format. Use ISO 8601 string."}), 400

    async def fetch_metrics():
        db = Prisma()
        await db.connect()
        try:
            where_clause = {
                "OR": [
                    {"paidById": current_user_id},
                    {"createdById": current_user_id},
                    {"participants": {"some": {"userId": current_user_id}}}
                ]
            }
            if date_filter:
                where_clause["expenseDate"] = date_filter

            expenses = await db.expense.find_many(
                where=where_clause,
                include={
                    "category": True,
                    "paidBy": True,
                    "createdBy": True,
                    "participants": {"include": {"user": True}}
                },
                order={"expenseDate": "desc"}
            )

            # 1. Compute User-Specific KPIs & Category Breakdown
            total_personal_expense = 0.0
            user_transaction_count = 0
            shared_to_pay = 0.0
            amount_owed_to_me = 0.0
            category_totals = {}
            user_involved_expenses = []

            for exp in expenses:
                personal_share, is_involved = _get_user_personal_share(exp, current_user_id)

                if is_involved:
                    total_personal_expense += personal_share
                    user_transaction_count += 1
                    user_involved_expenses.append(exp)

                    cat_id = exp.categoryId
                    cat_name = exp.category.name if exp.category else "General"
                    if cat_id not in category_totals:
                        category_totals[cat_id] = {"id": cat_id, "name": cat_name, "value": 0.0, "count": 0}
                    category_totals[cat_id]["value"] += personal_share
                    category_totals[cat_id]["count"] += 1
                elif exp.paidById == current_user_id or exp.createdById == current_user_id:
                    user_involved_expenses.append(exp)

                # Pending settlement calculations
                if exp.status != "COMPLETED":
                    for part in exp.participants:
                        if part.userId == current_user_id and exp.paidById != current_user_id and not part.isSettled:
                            shared_to_pay += float(part.shareAmount)
                        elif exp.paidById == current_user_id and part.userId != current_user_id and not part.isSettled:
                            amount_owed_to_me += float(part.shareAmount)

            sorted_cats = sorted(list(category_totals.values()), key=lambda x: x["value"], reverse=True)
            category_chart_data = [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "value": round(item["value"], 2),
                    "color": CHART_PALETTE[idx % len(CHART_PALETTE)],
                    "count": item["count"],
                }
                for idx, item in enumerate(sorted_cats)
            ]

            # 3. Spending Trends (User's personal expenditure share over time)
            trend_buckets = {}
            for exp in reversed(expenses):
                personal_share, is_involved = _get_user_personal_share(exp, current_user_id)
                if not is_involved or personal_share <= 0:
                    continue
                date_key = exp.expenseDate.strftime(
                    "%b %d" if period in ("this_week", "this_month", "custom") else "%b %Y"
                )
                trend_buckets[date_key] = trend_buckets.get(date_key, 0.0) + personal_share

            trend_chart_data = [{"date": k, "amount": round(v, 2)} for k, v in trend_buckets.items()]

            # 4. Recent Expenses (top 5 involving the logged-in user)
            recent_expenses = []
            for exp in user_involved_expenses[:5]:
                recent_expenses.append({
                    "id": exp.id,
                    "title": exp.title,
                    "description": exp.description,
                    "amount": float(exp.amount),
                    "currency": "INR",
                    "status": exp.status,
                    "expenseDate": exp.expenseDate.isoformat(),
                    "createdAt": exp.createdAt.isoformat() if getattr(exp, "createdAt", None) else exp.expenseDate.isoformat(),
                    "updatedAt": exp.updatedAt.isoformat() if getattr(exp, "updatedAt", None) else exp.expenseDate.isoformat(),
                    "categoryId": exp.categoryId,
                    "categoryName": exp.category.name if exp.category else "General",
                    "paidByName": exp.paidBy.name if getattr(exp, "paidBy", None) else "Unknown",
                    "paidById": exp.paidById,
                    "paidByUpiId": getattr(exp.paidBy, "upi_id", None) if getattr(exp, "paidBy", None) else None,
                    "createdById": exp.createdById,
                    "createdByName": exp.createdBy.name if getattr(exp, "createdBy", None) else "Unknown",
                    "images": getattr(exp, "images", []) or [],
                    "participants": [
                        {
                            "userId": p.userId,
                            "name": p.user.name if p.user else f"User #{p.userId}",
                            "upi_id": getattr(p.user, "upi_id", None) if getattr(p, "user", None) else None,
                            "shareAmount": float(p.shareAmount),
                            "isSettled": (p.userId == exp.paidById) or bool(p.isSettled) or exp.status == "COMPLETED",
                            "settledAt": p.settledAt.isoformat() if getattr(p, "settledAt", None) else None,
                            "owesToUserId": None if (p.userId == exp.paidById or bool(p.isSettled)) else exp.paidById,
                            "owesToName": None if (p.userId == exp.paidById or bool(p.isSettled)) else (exp.paidBy.name if getattr(exp, "paidBy", None) else None),
                            "owesToUpiId": None if (p.userId == exp.paidById or bool(p.isSettled)) else (getattr(exp.paidBy, "upi_id", None) if getattr(exp, "paidBy", None) else None),
                        }
                        for p in (exp.participants or [])
                    ],
                })

            return {
                "success": True,
                "period": period,
                "kpis": {
                    "totalExpenses": round(total_personal_expense, 2),
                    "sharedExpensesToPay": round(shared_to_pay, 2),
                    "amountOwedToMe": round(amount_owed_to_me, 2),
                    "netBalance": round(amount_owed_to_me - shared_to_pay, 2),
                    "totalCount": user_transaction_count
                },
                "categoryBreakdown": category_chart_data,
                "spendingTrends": trend_chart_data,
                "recentExpenses": recent_expenses
            }
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    result = asyncio.run(fetch_metrics())
    return jsonify(result), 200
