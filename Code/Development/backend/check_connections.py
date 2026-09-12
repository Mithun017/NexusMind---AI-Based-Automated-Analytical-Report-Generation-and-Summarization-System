"""
NexusMind System Connectivity & Storage Diagnostic Suite
Tests LLM, MongoDB, Neo4j, Docker, Dataset Folders, and Web Services.
"""

import os
import sys
import time
import socket
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Resolve Paths dynamically
CURRENT_DIR = Path(__file__).resolve().parent
# Find Data_to_upload wherever it is located
possible_data_paths = [
    CURRENT_DIR.parent.parent / "Data_to_upload",
    CURRENT_DIR.parent.parent / "Code" / "Data_to_upload",
    CURRENT_DIR.parent / "Data_to_upload",
]
DATA_TO_UPLOAD_DIR = next((p for p in possible_data_paths if p.exists()), possible_data_paths[0])
UPLOADS_DIR = CURRENT_DIR / "uploads"
REPORTS_DIR = CURRENT_DIR / "reports"
ENV_FILE = CURRENT_DIR / ".env"

# Load backend .env
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)

# ANSI Color codes for formatted terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
GOLD = "\033[38;5;220m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def print_banner():
    print(f"{GOLD}{BOLD}")
    print("=" * 74)
    print("   _  __                     __  ____           __")
    print("  / |/ /__ ___ __ __ ___ __ /  |/  /(_)___  ___/ /")
    print(" /    / -_) _ / // (_-</ // / /|_/ / / _ \\/ _  / ")
    print("/_/|_/\\__/\\___\\_,_/___/\\_,_/_/  /_/_/_//_/\\_,_/  ")
    print(f"      ANALYTICAL INTELLIGENCE — SYSTEM DIAGNOSTIC SUITE")
    print("=" * 74)
    print(f"{RESET}")


def check_port(host: str, port: int, timeout: float = 1.5) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        res = sock.connect_ex((host, port))
        sock.close()
        return res == 0
    except Exception:
        return False


def test_llm():
    print(f"\n{CYAN}{BOLD}[1/7] LLM Provider Connectivity (Groq / OpenRouter){RESET}")
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()

    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    groq_models = [m.strip() for m in os.getenv("GROQ_MODELS", "openai/gpt-oss-20b,llama-3.3-70b-versatile").split(",") if m.strip()]

    # Test Groq first
    groq_success = False
    if groq_key:
        try:
            import groq
            client = groq.Groq(api_key=groq_key, timeout=10.0)
            
            # Try configured models in order
            candidate_models = [groq_model] + [m for m in groq_models if m != groq_model]
            for model_name in candidate_models:
                try:
                    start_t = time.perf_counter()
                    res = client.chat.completions.create(
                        messages=[{"role": "user", "content": "Ping test. Respond with word 'ONLINE'"}],
                        model=model_name,
                        max_tokens=8,
                    )
                    latency = int((time.perf_counter() - start_t) * 1000)
                    print(f"  {GREEN}[ OK ]{RESET} Groq LLM: {BOLD}{model_name}{RESET} (Latency: {latency}ms)")
                    groq_success = True
                    break
                except Exception as me:
                    if "model_not_found" in str(me):
                        continue
                    else:
                        print(f"  {YELLOW}[WARN]{RESET} Groq model {model_name} failed: {me}")
            
            if not groq_success:
                print(f"  {RED}[FAIL]{RESET} Groq LLM: None of the candidate models responded.")
        except Exception as e:
            print(f"  {RED}[FAIL]{RESET} Groq LLM Connection Error: {e}")
    else:
        print(f"  {YELLOW}[WARN]{RESET} GROQ_API_KEY not configured in backend/.env")

    # Test OpenRouter fallback
    if openrouter_key:
        try:
            import requests
            headers = {"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"}
            payload = {
                "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-lite-001"),
                "messages": [{"role": "user", "content": "Ping test"}],
                "max_tokens": 8,
            }
            start_t = time.perf_counter()
            r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=6)
            lat = int((time.perf_counter() - start_t) * 1000)
            if r.status_code == 200:
                print(f"  {GREEN}[ OK ]{RESET} OpenRouter Fallback: {BOLD}{payload['model']}{RESET} (Latency: {lat}ms)")
            else:
                print(f"  {YELLOW}[INFO]{RESET} OpenRouter HTTP {r.status_code}: {r.json().get('error', {}).get('message', 'Endpoint response')}")
        except Exception as oe:
            print(f"  {YELLOW}[INFO]{RESET} OpenRouter check: {oe}")


def test_mongodb():
    print(f"\n{CYAN}{BOLD}[2/7] MongoDB Database Connectivity{RESET}")
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "nexusmind")

    display_uri = mongo_uri.split("@")[-1] if "@" in mongo_uri else mongo_uri
    print(f"  Target URI: {display_uri} (Database: '{db_name}')")

    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        client.admin.command("ping")
        server_info = client.server_info()
        version = server_info.get("version", "unknown")
        
        db = client[db_name]
        collections = db.list_collection_names()
        print(f"  {GREEN}[ OK ]{RESET} MongoDB Engine: {BOLD}CONNECTED{RESET} (Server v{version})")
        print(f"  {GREEN}[ OK ]{RESET} Collections in '{db_name}': {len(collections)}")
        for col_name in sorted(collections):
            count = db[col_name].count_documents({})
            print(f"         • {col_name:15s} : {count} records")
    except Exception as e:
        print(f"  {RED}[FAIL]{RESET} MongoDB Connection Error: {e}")
        print(f"         {YELLOW}Hint: Ensure MongoDB is running locally or via 'docker compose up -d mongodb'{RESET}")


def test_neo4j():
    print(f"\n{CYAN}{BOLD}[3/7] Neo4j Knowledge Graph Connectivity{RESET}")
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "changeme")

    print(f"  Target URI: {neo4j_uri} (User: '{neo4j_user}')")

    port_open = check_port("127.0.0.1", 7687, timeout=1.0)
    if not port_open:
        print(f"  {RED}[FAIL]{RESET} Neo4j Bolt port 7687 is {BOLD}CLOSED / OFFLINE{RESET}")
        print(f"         {YELLOW}Quick Fix:{RESET} Start Neo4j using Docker:")
        print(f"         {GOLD}docker run -d --name nexusmind-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/changeme neo4j:5-community{RESET}")
        print(f"         or run: {GOLD}docker compose up -d neo4j{RESET}")
        return

    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password), connection_timeout=3.0)
        with driver.session() as session:
            result = session.run("RETURN 1 AS ping")
            record = result.single()
            if record and record["ping"] == 1:
                node_res = session.run("MATCH (n) RETURN count(n) AS nodeCount").single()
                rel_res = session.run("MATCH ()-[r]->() RETURN count(r) AS relCount").single()
                node_count = node_res["nodeCount"] if node_res else 0
                rel_count = rel_res["relCount"] if rel_res else 0

                print(f"  {GREEN}[ OK ]{RESET} Neo4j Graph Database: {BOLD}CONNECTED & AUTHENTICATED{RESET}")
                print(f"  {GREEN}[ OK ]{RESET} Knowledge Graph Stats: {node_count} Nodes, {rel_count} Relationships")
                print(f"         Browser Console UI: http://localhost:7474")
            else:
                print(f"  {YELLOW}[WARN]{RESET} Neo4j connected but ping returned unexpected result.")
        driver.close()
    except Exception as e:
        print(f"  {RED}[FAIL]{RESET} Neo4j Authentication/Session Error: {e}")


def test_docker():
    print(f"\n{CYAN}{BOLD}[4/7] Docker Engine & Container Services{RESET}")
    try:
        res = subprocess.run(["docker", "ps", "--format", "{{.Names}}\t{{.Status}}\t{{.Ports}}"], capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            containers = [line.strip() for line in res.stdout.strip().split("\n") if line.strip()]
            print(f"  {GREEN}[ OK ]{RESET} Docker Daemon: {BOLD}ONLINE & RESPONDING{RESET}")
            if containers:
                print(f"  {GREEN}[ OK ]{RESET} Running Containers ({len(containers)}):")
                for c in containers:
                    parts = c.split("\t")
                    name = parts[0]
                    status = parts[1] if len(parts) > 1 else ""
                    print(f"         • {BOLD}{name:24s}{RESET} ({status})")
            else:
                print(f"  {YELLOW}[INFO]{RESET} No active containers currently running.")
        else:
            print(f"  {YELLOW}[WARN]{RESET} Docker CLI exited with code {res.returncode}: {res.stderr.strip()[:150]}")
    except subprocess.TimeoutExpired:
        print(f"  {YELLOW}[WARN]{RESET} Docker daemon check timed out (Docker Desktop engine is starting).")
    except FileNotFoundError:
        print(f"  {YELLOW}[INFO]{RESET} Docker CLI executable not found on system PATH.")
    except Exception as e:
        print(f"  {YELLOW}[WARN]{RESET} Docker status check: {e}")


def test_data_to_upload():
    print(f"\n{CYAN}{BOLD}[5/7] Raw Dataset Staging Directory (Code/Data_to_upload){RESET}")
    print(f"  Path: {DATA_TO_UPLOAD_DIR}")
    if DATA_TO_UPLOAD_DIR.exists():
        files = [f for f in DATA_TO_UPLOAD_DIR.iterdir() if f.is_file() and not f.name.startswith(".")]
        total_size = sum(f.stat().st_size for f in files)
        print(f"  {GREEN}[ OK ]{RESET} Total Staged Datasets: {BOLD}{len(files)} files{RESET} ({total_size / 1024:.1f} KB)")
        for f in sorted(files, key=lambda x: x.name):
            size_kb = f.stat().st_size / 1024
            ext = f.suffix.upper()
            print(f"         • [{ext[1:] if len(ext) > 1 else 'FILE':4s}] {f.name:36s} ({size_kb:6.1f} KB)")
    else:
        print(f"  {RED}[FAIL]{RESET} Directory does not exist: {DATA_TO_UPLOAD_DIR}")


def test_storage_and_reports():
    print(f"\n{CYAN}{BOLD}[6/7] Backend Ingested Uploads & Synthesized Reports{RESET}")
    # Check uploads
    print(f"  Uploads Storage : {UPLOADS_DIR}")
    if UPLOADS_DIR.exists():
        upload_files = [f for f in UPLOADS_DIR.iterdir() if f.is_file() and not f.name.startswith(".")]
        upload_size = sum(f.stat().st_size for f in upload_files)
        print(f"  {GREEN}[ OK ]{RESET} Ingested Datasets : {BOLD}{len(upload_files)} files{RESET} ({upload_size / 1024:.1f} KB)")
        for f in sorted(upload_files, key=lambda x: x.stat().st_mtime, reverse=True)[:5]:
            print(f"         • {f.name} ({f.stat().st_size / 1024:.1f} KB)")
        if len(upload_files) > 5:
            print(f"         ... and {len(upload_files) - 5} more ingested file(s)")
    else:
        print(f"  {YELLOW}[INFO]{RESET} Uploads directory will be auto-created upon first file upload.")

    # Check reports
    print(f"\n  Reports Storage : {REPORTS_DIR}")
    if REPORTS_DIR.exists():
        report_files = [f for f in REPORTS_DIR.iterdir() if f.is_file() and f.suffix.lower() == ".pdf"]
        report_size = sum(f.stat().st_size for f in report_files)
        print(f"  {GREEN}[ OK ]{RESET} Synthesized PDF Reports : {BOLD}{len(report_files)} PDF(s){RESET} ({report_size / 1024:.1f} KB)")
        for r in sorted(report_files, key=lambda x: x.stat().st_mtime, reverse=True):
            print(f"         • [PDF] {r.name} ({r.stat().st_size / 1024:.1f} KB)")
    else:
        print(f"  {YELLOW}[INFO]{RESET} Reports directory will be auto-created upon PDF compilation.")


def test_web_servers():
    print(f"\n{CYAN}{BOLD}[7/7] Web Application Endpoints (Backend & Frontend){RESET}")
    # Backend
    backend_up = check_port("127.0.0.1", 8000, timeout=1.0)
    if backend_up:
        print(f"  {GREEN}[ OK ]{RESET} FastAPI Backend : {BOLD}ONLINE{RESET} at http://localhost:8000")
        try:
            import requests
            hr = requests.get("http://localhost:8000/api/v1/health", timeout=2)
            if hr.status_code == 200:
                hdata = hr.json()
                print(f"         Health API Status: {hdata.get('status')} (Mongo: {hdata.get('mongo')}, Neo4j: {hdata.get('neo4j')})")
        except Exception:
            pass
    else:
        print(f"  {RED}[DOWN]{RESET} FastAPI Backend : {BOLD}OFFLINE{RESET} (Port 8000)")
        print(f"         {YELLOW}Start with:{RESET} uvicorn main:app --reload --port 8000")

    # Frontend
    frontend_up = check_port("127.0.0.1", 5173, timeout=1.0)
    if frontend_up:
        print(f"  {GREEN}[ OK ]{RESET} Vite Studio UI  : {BOLD}ONLINE{RESET} at http://localhost:5173")
    else:
        print(f"  {YELLOW}[INFO]{RESET} Vite Studio UI  : Not detected on port 5173 (or running on alternative port)")


def main():
    print_banner()
    test_llm()
    test_mongodb()
    test_neo4j()
    test_docker()
    test_data_to_upload()
    test_storage_and_reports()
    test_web_servers()
    print(f"\n{GOLD}{'=' * 74}{RESET}")
    print(f"{BOLD}Diagnostic Scan Complete.{RESET}\n")


if __name__ == "__main__":
    main()
