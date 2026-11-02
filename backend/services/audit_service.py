"""
Audit Service
Computes fine-grained diffs between states and records immutable ExpenseAuditLog rows.
"""
import json
from decimal import Decimal

class AuditService:
    @staticmethod
    def compute_expense_diff(old_exp, new_data, old_participants, new_participant_ids, users_map, cats_map):
        """
        Generates structured diff and human-readable sentences for changes.
        """
        changes = []
        messages = []

        # 1. Title change
        if old_exp.title != new_data.get("title"):
            changes.append({
                "field": "Title",
                "old": old_exp.title,
                "new": new_data.get("title")
            })
            messages.append(f'Title changed from "{old_exp.title}" to "{new_data.get("title")}"')

        # 2. Amount change
        old_amt = float(old_exp.amount)
        new_amt = float(new_data.get("amount", old_amt))
        if abs(old_amt - new_amt) > 0.001:
            changes.append({
                "field": "Amount",
                "old": f"₹{old_amt:,.2f}",
                "new": f"₹{new_amt:,.2f}"
            })
            messages.append(f"Amount changed from ₹{old_amt:,.2f} to ₹{new_amt:,.2f}")

        # 3. Category change
        if old_exp.categoryId != new_data.get("categoryId"):
            old_c = cats_map.get(old_exp.categoryId, "Unknown")
            new_c = cats_map.get(new_data.get("categoryId"), "Unknown")
            changes.append({
                "field": "Category",
                "old": old_c,
                "new": new_c
            })
            messages.append(f'Category changed from "{old_c}" to "{new_c}"')

        # 4. Paid By change
        if old_exp.paidById != new_data.get("paidById"):
            old_p = users_map.get(old_exp.paidById, f"User#{old_exp.paidById}")
            new_p = users_map.get(new_data.get("paidById"), f"User#{new_data.get('paidById')}")
            changes.append({
                "field": "Paid By",
                "old": old_p,
                "new": new_p
            })
            messages.append(f'Paid By changed from "{old_p}" to "{new_p}"')

        # 5. Participants change
        old_p_ids = set(p.userId for p in old_participants)
        new_p_ids = set(new_participant_ids)

        added = [users_map.get(uid, f"User#{uid}") for uid in (new_p_ids - old_p_ids)]
        removed = [users_map.get(uid, f"User#{uid}") for uid in (old_p_ids - new_p_ids)]

        if added or removed:
            changes.append({
                "field": "Participants",
                "added": added,
                "removed": removed
            })
            if added:
                messages.append(f"Added to split: {', '.join(added)}")
            if removed:
                messages.append(f"Removed from split: {', '.join(removed)}")

        # 6. Status change
        if "status" in new_data and old_exp.status != new_data["status"]:
            changes.append({
                "field": "Status",
                "old": old_exp.status,
                "new": new_data["status"]
            })
            messages.append(f"Status changed from {old_exp.status} to {new_data['status']}")

        return changes, "; ".join(messages)

    @staticmethod
    async def record_creation(db, expense_id: int, actor_id: int, title: str, amount: float):
        """Records initial snapshot upon expense creation"""
        await db.expenseauditlog.create(data={
            "expenseId": expense_id,
            "actorId": actor_id,
            "action": "CREATED",
            "summary": f"Expense '{title}' created for ₹{amount:,.2f}",
            "diff": json.dumps([{"field": "Status", "new": "PENDING"}, {"field": "Amount", "new": amount}])
        })

    @staticmethod
    async def record_update(db, expense_id: int, actor_id: int, changes: list, summary: str):
        """Records audit log entry for updates"""
        if not changes:
            return
        await db.expenseauditlog.create(data={
            "expenseId": expense_id,
            "actorId": actor_id,
            "action": "UPDATED",
            "summary": summary,
            "diff": json.dumps(changes)
        })
