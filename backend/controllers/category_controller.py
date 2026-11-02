"""
Category Controller
Full CRUD for personal expense categories (no color codes or hex values) with integrity verification.
"""
from flask import Blueprint, jsonify, request
from backend.controllers.auth_controller import token_required
from prisma import Prisma

category_bp = Blueprint("categories", __name__)


@category_bp.route("", methods=["GET"])
@token_required
def list_categories(current_user_id):
    async def _fetch():
        db = Prisma()
        await db.connect()
        try:
            cats = await db.category.find_many(
                include={"expenses": True},
                order={"name": "asc"}
            )
            return jsonify({
                "success": True,
                "categories": [{
                    "id": c.id,
                    "name": c.name,
                    "icon": c.icon,
                    "expenseCount": len(c.expenses) if c.expenses else 0,
                    "totalSpent": round(sum(float(e.amount) for e in (c.expenses or [])), 2)
                } for c in cats]
            }), 200
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_fetch())


@category_bp.route("", methods=["POST"])
@token_required
def create_category(current_user_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    icon = data.get("icon", "tag")

    if not name:
        return jsonify({"success": False, "error": "Category name is required"}), 400

    async def _create():
        db = Prisma()
        await db.connect()
        try:
            existing = await db.category.find_unique(where={"name": name})
            if existing:
                return jsonify({"success": False, "error": f"Category '{name}' already exists"}), 400

            new_c = await db.category.create(data={
                "name": name,
                "icon": icon,
                "createdById": current_user_id
            })
            return jsonify({
                "success": True,
                "message": "Category created successfully",
                "category": {
                    "id": new_c.id,
                    "name": new_c.name,
                    "icon": new_c.icon,
                    "expenseCount": 0,
                    "totalSpent": 0.0
                }
            }), 201
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_create())


@category_bp.route("/<int:cat_id>", methods=["PUT"])
@token_required
def update_category(current_user_id, cat_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    icon = data.get("icon")

    if not name:
        return jsonify({"success": False, "error": "Category name is required"}), 400

    async def _update():
        db = Prisma()
        await db.connect()
        try:
            duplicate = await db.category.find_first(
                where={
                    "name": {"equals": name, "mode": "insensitive"},
                    "id": {"not": cat_id}
                }
            )
            if duplicate:
                return jsonify({"success": False, "error": f"Category '{name}' already exists"}), 400

            update_data = {"name": name}
            if icon:
                update_data["icon"] = icon

            updated = await db.category.update(
                where={"id": cat_id},
                data=update_data
            )
            return jsonify({
                "success": True,
                "message": "Category updated",
                "category": {
                    "id": updated.id,
                    "name": updated.name,
                    "icon": updated.icon
                }
            }), 200
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_update())


@category_bp.route("/<int:cat_id>", methods=["DELETE"])
@token_required
def delete_category(current_user_id, cat_id):
    async def _delete():
        db = Prisma()
        await db.connect()
        try:
            count = await db.expense.count(where={"categoryId": cat_id})
            if count > 0:
                return jsonify({
                    "success": False,
                    "error": f"Cannot delete category: it is actively assigned to {count} expense(s)."
                }), 400

            await db.category.delete(where={"id": cat_id})
            return jsonify({"success": True, "message": "Category deleted successfully"}), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400
        finally:
            if db.is_connected():
                await db.disconnect()

    import asyncio
    return asyncio.run(_delete())
