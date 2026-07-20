"""Runs the 5 analytic algorithms against Supabase and returns compressed JSON."""

from typing import Any
from supabase import Client


def run_competition_matrix(db: Client, project_id: str | None = None) -> list[dict[str, Any]]:
    try:
        data = db.table("v_competition_matrix").select("*").limit(100).execute()
        rows = data.data or []
        return [
            {
                "product": r["product_name"],
                "code": r["stock_code"],
                "subcategory": r["subcategory"],
                "supplier": r["supplier"],
                "competitor": r["competitor_product"],
                "competitor_supplier": r["competitor_supplier"],
                "our_avg_price": float(r["our_avg_price"] or 0),
                "competitor_avg_price": float(r["competitor_avg_price"] or 0),
                "our_volume": int(r["our_volume"] or 0),
                "competitor_volume": int(r["competitor_volume"] or 0),
            }
            for r in rows
        ]
    except Exception as e:
        return [{"error": str(e)}]


def run_category_analysis(db: Client, project_id: str | None = None) -> list[dict[str, Any]]:
    try:
        data = db.table("v_category_analysis").select("*").order("total_revenue", desc=True).limit(50).execute()
        rows = data.data or []
        return [
            {
                "category": r["category"],
                "product_count": r["product_count"],
                "total_revenue": float(r["total_revenue"] or 0),
                "total_units": int(r["total_units"] or 0),
                "avg_unit_price": float(r["avg_unit_price"] or 0),
                "month": r["month"],
            }
            for r in rows
        ]
    except Exception as e:
        return [{"error": str(e)}]


def run_branch_analysis(db: Client, project_id: str | None = None) -> list[dict[str, Any]]:
    try:
        data = db.table("v_branch_analysis").select("*").limit(200).execute()
        rows = data.data or []
        result: dict[str, list[dict]] = {}
        for r in rows:
            branch = r["branch_name"]
            if branch not in result:
                result[branch] = []
            if len(result[branch]) < 5:
                result[branch].append({
                    "product": r["product_name"],
                    "revenue": float(r["revenue"] or 0),
                    "volume": int(r["volume"] or 0),
                    "rank": r["rank"],
                })
        return [{"branch": k, "top_products": v} for k, v in result.items()]
    except Exception as e:
        return [{"error": str(e)}]


def run_consumer_behaviour(db: Client, project_id: str | None = None) -> list[dict[str, Any]]:
    try:
        data = db.table("v_consumer_behaviour").select("*").order("total_revenue", desc=True).limit(50).execute()
        rows = data.data or []
        return [
            {
                "product": r["product_name"],
                "periods_with_sales": r["periods_with_sales"],
                "total_quantity": int(r["total_quantity"] or 0),
                "total_revenue": float(r["total_revenue"] or 0),
                "avg_qty_per_period": float(r["avg_qty_per_period"] or 0),
                "avg_price_realized": float(r["avg_price_realized"] or 0),
                "branches_present": r["branches_present"],
            }
            for r in rows
        ]
    except Exception as e:
        return [{"error": str(e)}]


def run_supply_demand_gap(db: Client, project_id: str | None = None) -> list[dict[str, Any]]:
    try:
        data = db.table("v_supply_demand_gap").select("*").limit(100).execute()
        rows = data.data or []
        return [
            {
                "product": r["product_name"],
                "code": r["stock_code"],
                "branch": r["branch_name"],
                "supply_qty": int(r["supply_qty"] or 0),
                "demand_qty": int(r["demand_qty"] or 0),
                "gap": int(r["gap"] or 0),
                "gap_status": r["gap_status"],
            }
            for r in rows
        ]
    except Exception as e:
        return [{"error": str(e)}]


ALGORITHM_MAP = {
    "competition": run_competition_matrix,
    "category": run_category_analysis,
    "branch": run_branch_analysis,
    "consumer": run_consumer_behaviour,
    "supply_demand": run_supply_demand_gap,
}


def run_algorithms(db: Client, algorithms: list[str], project_id: str | None = None) -> dict[str, list]:
    results: dict[str, list] = {}
    for alg in algorithms:
        fn = ALGORITHM_MAP.get(alg)
        if fn:
            results[alg] = fn(db, project_id)
        else:
            results[alg] = [{"error": f"Unknown algorithm: {alg}"}]
    return results
