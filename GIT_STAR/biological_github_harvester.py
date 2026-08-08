#!/usr/bin/env python3
"""
🧬 BIOLOGICAL_GITHUB_HARVESTER 🧬
Fetches 10,000+ high-star repositories from GitHub API
Maps them to human biological systems
Exports manifest for architect_console.py ingestion

Usage:
    pip install requests tqdm
    python biological_github_harvester.py --token YOUR_GITHUB_TOKEN --output git_manifest.json
"""

import requests
import json
import time
import argparse
from datetime import datetime
from collections import defaultdict
from tqdm import tqdm

# ═══════════════════════════════════════════════════════════════
# BIOLOGICAL SYSTEM CLASSIFICATION MAP
# ═══════════════════════════════════════════════════════════════
SYSTEM_MAP = {
    # 🧠 NERVOUS SYSTEM — AI, Agents, Cognition, Memory
    "nervous_system": {
        "keywords": ["agent", "llm", "ai", "gpt", "claude", "neural", "brain", "cognition", 
                     "memory", "rag", "embedding", "vector", "mcp", "autonomous", "reasoning",
                     "langchain", "crewai", "autogen", "workflow", "orchestration"],
        "languages": ["Python", "TypeScript", "Rust"],
        "min_stars": 500
    },
    # 👁️ SENSORY SYSTEM — Visualization, UI, Audio, Video, Input
    "sensory_system": {
        "keywords": ["ui", "visualization", "dashboard", "chart", "graph", "audio", "video", 
                     "image", "camera", "screen", "monitor", "display", "render", "ocr", "speech",
                     "whisper", "ffmpeg", "obs", "react", "vue", "angular"],
        "languages": ["TypeScript", "JavaScript", "Rust", "C++"],
        "min_stars": 800
    },
    # 💪 MUSCULAR SYSTEM — Execution, Build, Deploy, Languages, Compilers
    "muscular_system": {
        "keywords": ["compiler", "runtime", "build", "deploy", "ci", "cd", "package", "manager",
                     "bundler", "webpack", "vite", "esbuild", "bun", "deno", "rust", "go", "node",
                     "container", "docker", "kubernetes", "terraform", "ansible"],
        "languages": ["Rust", "Go", "C", "C++", "TypeScript"],
        "min_stars": 600
    },
    # 🫀 CIRCULATORY SYSTEM — Databases, Storage, Caching, Message Queues
    "circulatory_system": {
        "keywords": ["database", "db", "sql", "nosql", "redis", "cache", "queue", "kafka", 
                     "rabbitmq", "storage", "blob", "s3", "minio", "vector", "timeseries",
                     "postgresql", "mysql", "sqlite", "mongodb", "elasticsearch"],
        "languages": ["Rust", "Go", "C", "C++", "Java"],
        "min_stars": 400
    },
    # 🍽️ DIGESTIVE SYSTEM — Knowledge, Learning, Notes, Documentation
    "digestive_system": {
        "keywords": ["learn", "tutorial", "course", "book", "note", "wiki", "documentation",
                     "knowledge", "roadmap", "interview", "algorithm", "cheatsheet", "awesome",
                     "curriculum", "education", "bootcamp", "handbook"],
        "languages": ["TypeScript", "Python", "Markdown"],
        "min_stars": 1000
    },
    # 🛡️ IMMUNE SYSTEM — Security, Privacy, Encryption, Scanning
    "immune_system": {
        "keywords": ["security", "crypto", "encrypt", "password", "secret", "scan", "vulnerability",
                     "firewall", "vpn", "proxy", "tls", "ssl", "auth", "oauth", "jwt", "vault",
                     "backup", "privacy", "anonymity", "tor"],
        "languages": ["Rust", "Go", "Python", "C"],
        "min_stars": 300
    },
    # 🧘 RESPIRATORY/ENDOCRINE — Focus, Productivity, Mental Health, Habits
    "respiratory_endocrine_system": {
        "keywords": ["productivity", "focus", "pomodoro", "habit", "todo", "task", "calendar",
                     "mindfulness", "meditation", "health", "wellness", "time", "track", "timer",
                     "planner", "organize", "adhd", "focus"],
        "languages": ["TypeScript", "Rust", "Flutter"],
        "min_stars": 200
    },
    # 💬 COMMUNICATION — Chat, Email, Forums, Collaboration
    "communication_system": {
        "keywords": ["chat", "message", "email", "forum", "collaboration", "team", "slack",
                     "discord", "matrix", "irc", "xmpp", "communication", "notify", "alert"],
        "languages": ["TypeScript", "Go", "Rust", "Python"],
        "min_stars": 400
    },
    # 🦴 SKELETAL/REPRODUCTIVE — Frameworks, Scaffolding, Templates, OS
    "skeletal_reproductive_system": {
        "keywords": ["framework", "template", "scaffold", "boilerplate", "starter", "create",
                     "kernel", "os", "operating", "system", "firmware", "embedded", "hardware",
                     "microcontroller", "arduino", "raspberry", "iot"],
        "languages": ["Rust", "C", "C++", "Go"],
        "min_stars": 500
    },
    # 🧪 LYMPHATIC SYSTEM — Testing, QA, Debugging, Logging, Observability
    "lymphatic_system": {
        "keywords": ["test", "testing", "jest", "pytest", "mocha", "debug", "logger", "logging",
                     "trace", "monitor", "observability", "telemetry", "metric", "prometheus",
                     "grafana", "jaeger", "zipkin", "sentry", "error"],
        "languages": ["Go", "Rust", "TypeScript", "Python"],
        "min_stars": 300
    },
    # 🧴 INTEGUMENTARY SYSTEM — Themes, Skins, CSS, Styling, Appearance
    "integumentary_system": {
        "keywords": ["theme", "skin", "css", "style", "design", "tailwind", "bootstrap", 
                     "material", "ui-kit", "component", "icon", "font", "color", "palette",
                     "animation", "transition", "motion"],
        "languages": ["CSS", "TypeScript", "SCSS"],
        "min_stars": 400
    },
    # 🚽 EXCRETORY SYSTEM — Cleanup, GC, Archiving, Compression, Deletion
    "excretory_system": {
        "keywords": ["clean", "cleanup", "garbage", "archive", "compress", "zip", "tar", "gzip",
                     "delete", "remove", "prune", "purge", "shred", "wipe", "temp", "cache-clear"],
        "languages": ["Rust", "Go", "C", "Python"],
        "min_stars": 100
    },
    # 🧬 GENETIC/REPLICATION — Git, Version Control, Sync, Backup, Fork
    "genetic_replication_system": {
        "keywords": ["git", "version", "control", "sync", "backup", "clone", "fork", "merge",
                     "rebase", "diff", "patch", "repository", "monorepo", "submodule"],
        "languages": ["Rust", "Go", "C", "Shell"],
        "min_stars": 500
    }
}

# ═══════════════════════════════════════════════════════════════
# GITHUB API HARVESTER
# ═══════════════════════════════════════════════════════════════

class BiologicalHarvester:
    def __init__(self, token=None, per_page=100, delay=1.5):
        self.token = token
        self.per_page = per_page
        self.delay = delay
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Biological-Harvester/1.0"
        }
        if token:
            self.headers["Authorization"] = f"token {token}"

        self.base_url = "https://api.github.com"
        self.all_repos = []
        self.system_buckets = defaultdict(list)

    def _get(self, endpoint, params=None):
        """Make authenticated GitHub API request with rate limit handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            resp = requests.get(url, headers=self.headers, params=params, timeout=30)
            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                reset_time = int(resp.headers.get("X-RateLimit-Reset", time.time() + 3600))
                wait = max(reset_time - int(time.time()), 60)
                print(f"⏳ Rate limited. Sleeping {wait}s...")
                time.sleep(wait)
                return self._get(endpoint, params)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Request failed: {e}")
            return None

    def search_repos(self, query, sort="stars", order="desc", max_pages=10):
        """Search repositories with query, return list of repo objects"""
        repos = []
        for page in range(1, max_pages + 1):
            params = {
                "q": query,
                "sort": sort,
                "order": order,
                "per_page": self.per_page,
                "page": page
            }
            data = self._get("/search/repositories", params)
            if not data or "items" not in data:
                break
            repos.extend(data["items"])
            if len(data["items"]) < self.per_page:
                break
            time.sleep(self.delay)
        return repos

    def classify_repo(self, repo):
        """Classify a repository into biological system based on metadata"""
        text = f"{repo.get('name', '')} {repo.get('description', '')} {repo.get('language', '')}".lower()
        topics = [t.lower() for t in repo.get("topics", [])]

        scores = {}
        for system, config in SYSTEM_MAP.items():
            score = 0
            # Keyword matching
            for kw in config["keywords"]:
                if kw.lower() in text:
                    score += 3
                if kw.lower() in topics:
                    score += 5
            # Language matching
            if repo.get("language") and repo.get("language") in config.get("languages", []):
                score += 2
            # Star threshold check
            if repo.get("stargazers_count", 0) < config["min_stars"]:
                score = 0
            scores[system] = score

        # Assign to highest scoring system, default to nervous if none
        best_system = max(scores, key=scores.get) if max(scores.values(), default=0) > 0 else "nervous_system"
        return best_system

    def harvest_all_systems(self, target_total=10000):
        """Harvest repositories across all biological systems"""
        print("🧬 INITIALIZING BIOLOGICAL HARVESTER...")
        print(f"🎯 Target: {target_total} repositories\n")

        # Strategy: Search by language + star threshold to cover breadth
        search_queries = [
            "stars:>5000 language:Python",
            "stars:>5000 language:TypeScript",
            "stars:>5000 language:Rust",
            "stars:>5000 language:Go",
            "stars:>3000 language:JavaScript",
            "stars:>3000 language:C",
            "stars:>3000 language:C++",
            "stars:>2000 language:Java",
            "stars:>1000 language:Ruby",
            "stars:>1000 language:Swift",
            "stars:>1000 language:Kotlin",
            "stars:>1000 language:Flutter",
            "stars:>500 language:Lua",
            "stars:>500 language:Shell",
            "stars:>500 language:Vue",
            "stars:>500 topic:ai",
            "stars:>500 topic:machine-learning",
            "stars:>500 topic:security",
            "stars:>500 topic:productivity",
            "stars:>500 topic:database",
        ]

        seen_ids = set()

        for query in tqdm(search_queries, desc="🔍 Harvesting"):
            repos = self.search_repos(query, max_pages=10)  # 1000 per query
            for repo in repos:
                if repo["id"] in seen_ids:
                    continue
                seen_ids.add(repo["id"])

                system = self.classify_repo(repo)
                clean_repo = {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "html_url": repo["html_url"],
                    "description": repo.get("description", ""),
                    "stars": repo["stargazers_count"],
                    "forks": repo["forks_count"],
                    "language": repo.get("language", "Unknown"),
                    "topics": repo.get("topics", []),
                    "system": system,
                    "created_at": repo["created_at"],
                    "updated_at": repo["updated_at"],
                    "open_issues": repo["open_issues_count"],
                    "license": repo.get("license", {}).get("key", "none") if repo.get("license") else "none"
                }
                self.system_buckets[system].append(clean_repo)
                self.all_repos.append(clean_repo)

            if len(self.all_repos) >= target_total:
                print(f"\n✅ Target reached: {len(self.all_repos)} repositories")
                break

            time.sleep(self.delay * 2)

        # Sort each system by stars descending
        for system in self.system_buckets:
            self.system_buckets[system].sort(key=lambda x: x["stars"], reverse=True)

        print(f"\n📊 HARVEST COMPLETE")
        print(f"   Total repositories: {len(self.all_repos)}")
        for system, repos in sorted(self.system_buckets.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"   • {system:35s}: {len(repos):4d} repos")

    def export_manifest(self, filepath="git_manifest.json"):
        """Export manifest compatible with architect_console.py"""
        manifest = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "total_repos": len(self.all_repos),
                "harvester_version": "2.0",
                "systems": list(SYSTEM_MAP.keys())
            },
            "systems": dict(self.system_buckets),
            "all_repos": sorted(self.all_repos, key=lambda x: x["stars"], reverse=True)
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Manifest exported: {filepath}")
        print(f"   File size: {len(json.dumps(manifest)) / 1024 / 1024:.1f} MB")

        # Also export CSV for Excel/analysis
        import csv
        csv_path = filepath.replace(".json", ".csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["name", "full_name", "system", "stars", "forks", "language", "html_url", "description"])
            writer.writeheader()
            writer.writerows(self.all_repos)
        print(f"   CSV exported: {csv_path}")

        return manifest

    def generate_recipe_theory(self, filepath="recipe_theory.md"):
        """Generate the Recipe Theory — how organs feed each other"""
        theory = """# 🧬 RECIPE THEORY — Biological System Integration

## The Metabolic Pathway (How Data Flows)

### Stage 1: INGESTION (Sensory + Nose)
- **Input**: Raw data, user requests, web pages, audio, video
- **Organs**: Browser-Use, Firecrawl, Playwright, Whisper, OBS
- **Output**: Clean, structured signals

### Stage 2: PERCEPTION (Sensory → Nervous)
- **Synapse**: Visual/audio signals hit the Cerebrum (LLMs)
- **Neurotransmitter**: MCP, REST, GraphQL
- **Output**: Intent, context, task decomposition

### Stage 3: COGNITION (Nervous System)
- **Organs**: OpenClaw, Claude-Code, AutoGPT, CrewAI
- **Process**: Reasoning, planning, memory retrieval (Mem0)
- **Output**: Execution plan, code, decisions

### Stage 4: EXECUTION (Nervous → Muscular)
- **Motor Neurons**: APIs, CLI commands, Git commits
- **Organs**: VS Code, Zed, Neovim, Git, Docker, K8s
- **Output**: Built artifacts, deployed services

### Stage 5: CIRCULATION (Muscular → Circulatory)
- **Blood Flow**: Data writes to databases, caches, queues
- **Organs**: Redis, PostgreSQL, Supabase, Kafka, MinIO
- **Output**: Persistent state, distributed messages

### Stage 6: ABSORPTION (Circulatory → Digestive)
- **Villi**: Knowledge extraction from operational data
- **Organs**: Logseq, Joplin, Outline, BookStack
- **Output**: Documentation, learnings, second brain

### Stage 7: DEFENSE (Immune System — Parallel)
- **White Blood Cells**: Scan every stage
- **Organs**: Trivy, TruffleHog, Vaultwarden, Snyk
- **Output**: Security posture, secret protection

### Stage 8: FOCUS (Endocrine — Regulating)
- **Hormones**: Productivity regulation, break reminders
- **Organs**: Super-Productivity, Pomatez, Loop Habit
- **Output**: Sustained execution without burnout

### Stage 9: REPRODUCTION (Skeletal)
- **DNA Replication**: Template generation for new projects
- **Organs**: Cookiecutter, Vite, T3 Stack, create-react-app
- **Output**: New project scaffolding

### Stage 10: EXCRETION (Cleanup)
- **Kidneys**: Remove temp files, old logs, unused deps
- **Organs**: Stale-bot, depcheck, docker-prune
- **Output**: Clean system, reduced tech debt

## The Feedback Loop
Digestive System (knowledge) → feeds back → Nervous System (AI context)
This is the **continuity of consciousness**.
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(theory)
        print(f"📝 Recipe Theory exported: {filepath}")


# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🧬 Harvest 10,000 GitHub repos into biological systems")
    parser.add_argument("--token", help="GitHub Personal Access Token (required for 10k+)")
    parser.add_argument("--output", default="git_manifest.json", help="Output JSON manifest path")
    parser.add_argument("--target", type=int, default=10000, help="Target number of repositories")
    parser.add_argument("--delay", type=float, default=1.5, help="API delay between requests")
    args = parser.parse_args()

    if not args.token:
        print("⚠️ WARNING: No GitHub token provided. Rate limit = 60 requests/hour.")
        print("   For 10,000 repos, you NEED a token: https://github.com/settings/tokens")
        print("   Continuing with limited harvesting...\n")

    harvester = BiologicalHarvester(token=args.token, delay=args.delay)
    harvester.harvest_all_systems(target_total=args.target)
    harvester.export_manifest(args.output)
    harvester.generate_recipe_theory()

    print("\n🧬 BIOLOGICAL HARVEST COMPLETE")
    print("   Your body is ready for manifestation.")
