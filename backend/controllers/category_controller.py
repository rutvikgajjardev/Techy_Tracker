"""
Category Controller
Full CRUD for personal expense categories (no color codes or hex values) with integrity verification.
"""
from flask import Blueprint, jsonify, request
from backend.controllers.auth_controller import token_required
from backend.db import with_db

category_bp = Blueprint("categories", __name__)


@category_bp.route("", methods=["GET"])
@token_required
@with_db
async def list_categories(db, current_user_id):
    cats = await db.category.find_many(
        include={"expenses": True},
        order={"name": "asc"}
    )
    return jsonify({
        "success": True,
        "categories": [{
            "id": c.id,
            "name": c.name,
            "icon": "tag",
            "expenseCount": len(c.expenses) if c.expenses else 0,
            "totalSpent": round(sum(float(e.amount) for e in (c.expenses or [])), 2)
        } for c in cats]
    }), 200


@category_bp.route("", methods=["POST"])
@token_required
@with_db
async def create_category(db, current_user_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Category name is required"}), 400

    existing = await db.category.find_unique(where={"name": name})
    if existing:
        return jsonify({"success": False, "error": f"Category '{name}' already exists"}), 400

    new_c = await db.category.create(data={
        "name": name,
    })
    return jsonify({
        "success": True,
        "message": "Category created successfully",
        "category": {
            "id": new_c.id,
            "name": new_c.name,
            "icon": "tag",
            "expenseCount": 0,
            "totalSpent": 0.0
        }
    }), 201


@category_bp.route("/<int:cat_id>", methods=["PUT"])
@token_required
@with_db
async def update_category(db, current_user_id, cat_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Category name is required"}), 400

    duplicate = await db.category.find_first(
        where={
            "name": {"equals": name, "mode": "insensitive"},
            "id": {"not": cat_id}
        }
    )
    if duplicate:
        return jsonify({"success": False, "error": f"Category '{name}' already exists"}), 400

    updated = await db.category.update(
        where={"id": cat_id},
        data={"name": name}
    )
    return jsonify({
        "success": True,
        "message": "Category updated",
        "category": {
            "id": updated.id,
            "name": updated.name,
            "icon": "tag"
        }
    }), 200


@category_bp.route("/<int:cat_id>", methods=["DELETE"])
@token_required
@with_db
async def delete_category(db, current_user_id, cat_id):
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
