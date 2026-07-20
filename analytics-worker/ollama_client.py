"""Calls Ollama for AI-generated analysis of algorithm outputs."""

import json
import os
import httpx
from typing import Any

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")

AI_SCHEMA = {
    "type": "object",
    "properties": {
        "executive_summary": {"type": "string"},
        "key_opportunities": {"type": "array", "items": {"type": "string"}},
        "risk_flags": {"type": "array", "items": {"type": "string"}},
        "recommended_actions": {"type": "array", "items": {"type": "string"}},
        "consumer_behaviour_note": {"type": "string"},
    },
    "required": ["executive_summary", "key_opportunities", "risk_flags", "recommended_actions"],
}

AI_SYSTEM_PROMPT = """You are a senior market research analyst. Given analytics data about FMCG products, branches, categories, and supply chains, produce a concise executive report in valid JSON only.

Your response must be valid JSON matching this schema exactly:
{
  "executive_summary": "2-3 sentence overview of the market situation",
  "key_opportunities": ["list of 2-4 specific growth opportunities"],
  "risk_flags": ["list of 1-3 risks or concerns"],
  "recommended_actions": ["list of 2-4 concrete recommended actions"],
  "consumer_behaviour_note": "1-2 sentences about consumer trends if relevant"
}

Do NOT include any text outside the JSON object. Use "format": "json" in your response."""


def build_compressed_context(algorithm_results: dict[str, list]) -> str:
    """Build a ~300-token compressed context from algorithm outputs."""
    parts = []

    if "competition" in algorithm_results:
        comp = algorithm_results["competition"][:10]
        if comp and "error" not in comp[0]:
            parts.append("Competition: " + json.dumps([{
                "p": c["product"], "s": c["supplier"],
                "cp": c["competitor"], "cs": c["competitor_supplier"]
            } for c in comp]))

    if "category" in algorithm_results:
        cat = algorithm_results["category"][:8]
        if cat and "error" not in cat[0]:
            parts.append("Categories: " + json.dumps([{
                "c": r["category"], "rev": r["total_revenue"], "units": r["total_units"]
            } for r in cat]))

    if "branch" in algorithm_results:
        br = algorithm_results["branch"][:5]
        if br and "error" not in br[0]:
            parts.append("Branches: " + json.dumps([{
                "b": r["branch"],
                "top": [t["product"] for t in r.get("top_products", [])[:3]]
            } for r in br]))

    if "consumer" in algorithm_results:
        cons = algorithm_results["consumer"][:10]
        if cons and "error" not in cons[0]:
            parts.append("Consumer: " + json.dumps([{
                "p": r["product"], "qty": r["total_quantity"], "rev": r["total_revenue"]
            } for r in cons]))

    if "supply_demand" in algorithm_results:
        sd = algorithm_results["supply_demand"][:10]
        if sd and "error" not in sd[0]:
            gaps = [r for r in sd if r.get("gap_status") in ("UNDERSUPPLY", "NO_STOCK")]
            parts.append("Gaps: " + json.dumps([{
                "p": r["product"], "b": r["branch"],
                "status": r["gap_status"], "gap": r["gap"]
            } for r in gaps[:8]]))

    return "\n".join(parts) if parts else "No analytics data available for this project."


def call_ollama(context: str) -> dict[str, Any] | None:
    """Call Ollama with the compressed context and return structured JSON."""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "system": AI_SYSTEM_PROMPT,
            "prompt": f"Analyze this data and return the JSON report:\n\n{context}",
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1024,
            },
        }
        resp = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=120.0,
        )
        resp.raise_for_status()
        result = resp.json()
        raw = result.get("response", "")
        if not raw:
            return None

        parsed = json.loads(raw)
        required = ["executive_summary", "key_opportunities", "risk_flags", "recommended_actions"]
        for key in required:
            if key not in parsed:
                return None
        return parsed

    except Exception as e:
        print(f"  [Ollama error] {e}")
        return None
