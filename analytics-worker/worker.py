#!/usr/bin/env python3
"""
PlayMax Analytic Engine Worker

Polls Supabase for queued report_jobs, runs algorithms,
calls Ollama, generates PDF, uploads to Storage.
"""

import os
import sys
import time
import json
from datetime import datetime
from dotenv import load_dotenv

from supabase_client import get_client, get_bucket
from algorithms import run_algorithms
from ollama_client import build_compressed_context, call_ollama
from pdf_generator import generate_pdf

load_dotenv()

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))


def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def fetch_first(db, table: str, column: str, value: str):
    """Fetch first matching row without using .single()."""
    result = db.table(table).select("*").eq(column, value).limit(1).execute()
    rows = result.data or []
    return rows[0] if rows else None


def process_job(job: dict) -> None:
    job_id = job["id"]
    project_id = job.get("project_id")
    algorithms = job.get("algorithms", [])
    log(f"Processing job {job_id} — project={project_id} algorithms={algorithms}")

    db = get_client()

    # Mark as processing
    now = datetime.utcnow().isoformat()
    db.table("report_jobs").update({
        "status": "processing",
        "progress": 10,
        "updated_at": now,
    }).eq("id", job_id).execute()

    # Get project details
    project_name = "Market Analysis"
    client_name = None
    if project_id:
        p = fetch_first(db, "research_projects", "id", project_id)
        if p:
            meta = p.get("metadata", {}) or {}
            project_name = meta.get("title") or "Market Analysis"
            cid = p.get("client_id")
            if cid:
                c = fetch_first(db, "clients", "id", cid)
                if c:
                    client_name = c.get("company_name")

    # Step 1: Run algorithms
    log("  Running algorithms...")
    try:
        algorithm_results = run_algorithms(db, algorithms, project_id)
    except Exception as e:
        db.table("report_jobs").update({
            "status": "failed",
            "error_message": f"Algorithm error: {e}",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", job_id).execute()
        log(f"  FAILED: {e}")
        return

    db.table("report_jobs").update({
        "progress": 40,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", job_id).execute()

    # Step 2: Build compressed context and call Ollama
    log("  Calling Ollama...")
    context = build_compressed_context(algorithm_results)
    ai_result = call_ollama(context)

    if ai_result:
        log("  AI analysis received")
    else:
        log("  AI analysis unavailable — generating report without AI")

    db.table("report_jobs").update({
        "progress": 60,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", job_id).execute()

    # Step 3: Generate PDF
    log("  Generating PDF...")
    try:
        pdf_bytes = generate_pdf(project_name, client_name, algorithm_results, ai_result)
    except Exception as e:
        db.table("report_jobs").update({
            "status": "failed",
            "error_message": f"PDF generation error: {e}",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", job_id).execute()
        log(f"  PDF FAILED: {e}")
        return

    db.table("report_jobs").update({
        "progress": 80,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", job_id).execute()

    # Step 4: Upload PDF to Supabase Storage
    log("  Uploading PDF to Storage...")
    try:
        filename = f"research-{project_id or job_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.pdf"
        bucket = get_bucket()
        db.storage.from_(bucket).upload(
            path=filename,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )

        public_url = db.storage.from_(bucket).get_public_url(filename)

        # Update research project metadata with the report
        if project_id and ai_result:
            p = fetch_first(db, "research_projects", "id", project_id)
            if p:
                meta = p.get("metadata", {}) or {}
                reports = meta.get("reports", [])
                reports.append({
                    "name": f"AI Report — {datetime.now().strftime('%d %b %Y')}",
                    "meta": f"PDF · Generated {datetime.now().strftime('%d %b %Y')}",
                    "visible": True,
                    "url": public_url,
                })
                meta["reports"] = reports
                if ai_result:
                    meta["ai_summary"] = ai_result.get("executive_summary", "")
                db.table("research_projects").update({
                    "metadata": meta,
                    "progress": 100,
                    "status": "completed",
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", project_id).execute()

        # Mark job complete
        db.table("report_jobs").update({
            "status": "complete",
            "progress": 100,
            "result_url": public_url,
            "metadata": json.dumps({
                "ai_result": ai_result,
                "algorithm_summary": {
                    k: len(v) for k, v in algorithm_results.items()
                },
            }),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", job_id).execute()

        log(f"  COMPLETE → {public_url}")

    except Exception as e:
        db.table("report_jobs").update({
            "status": "failed",
            "error_message": f"Upload error: {e}",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", job_id).execute()
        log(f"  UPLOAD FAILED: {e}")


def main():
    log("PlayMax Analytic Engine Worker started")
    log(f"Poll interval: {POLL_INTERVAL}s")
    log(f"Ollama: {os.getenv('OLLAMA_URL', 'http://localhost:11434')} / {os.getenv('OLLAMA_MODEL', 'qwen2.5:1.5b')}")

    db = get_client()

    while True:
        try:
            result = db.table("report_jobs") \
                .select("*") \
                .eq("status", "queued") \
                .order("created_at", {"ascending": True}) \
                .limit(5) \
                .execute()

            jobs = result.data or []
            if jobs:
                log(f"Found {len(jobs)} queued job(s)")
                for job in jobs:
                    process_job(job)
            else:
                time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            log("Shutting down...")
            sys.exit(0)
        except Exception as e:
            log(f"Poll error: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
