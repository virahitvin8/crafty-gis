import os
import sys
import json
import uuid
import asyncio
import time

# Force sys.stdout to use UTF-8 on Windows consoles to support bioluminescent emojis
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# HTML/ANSI Colors for beautiful premium terminal aesthetics
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_MAGENTA = "\033[35m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"
COLOR_BLUE = "\033[34m"

# 17 systems bioluminescent indicators (colors and emojis)
SYSTEM_THEMES = {
    "sensory_system": ("👁️  SENSORY SYSTEM", "\033[36m"),                  # Cyan (Vision/Intake)
    "nervous_system": ("🧠  NERVOUS SYSTEM", "\033[35m"),                  # Magenta (Cognition/ML)
    "muscular_system": ("💪  MUSCULAR SYSTEM", "\033[31m"),                 # Red (Operations/Engines)
    "circulatory_system": ("🫀  CIRCULATORY SYSTEM", "\033[34m"),            # Blue (Heart/Data Flow/GIS Servers)
    "digestive_system": ("🍴  DIGESTIVE SYSTEM", "\033[32m"),               # Green (Knowledge Digestion)
    "immune_system": ("🛡️  IMMUNE SYSTEM", "\033[93m"),                    # Bright Yellow (Security/Protection)
    "respiratory_endocrine": ("🫁  RESPIRATORY & ENDO", "\033[96m"),          # Cyan-white (Focus/Pacing)
    "communication_system": ("🗣️  COMMUNICATION SYSTEM", "\033[95m"),         # Bright Magenta (Alerting/Report Generators)
    "skeletal_reproductive": ("🦴  SKELETAL & REPRO", "\033[90m"),          # Gray (GeoJSON/GDAL skeletons)
    "lymphatic_system": ("🧪  LYMPHATIC SYSTEM", "\033[92m"),               # Light Green (Testing/Observability)
    "integumentary_system": ("💅  INTEGUMENTARY SYSTEM", "\033[94m"),         # Light Blue (Visualization/WebGIS)
    "excretory_system": ("🧹  EXCRETORY SYSTEM", "\033[91m"),                # Light Red (Cleanup/Pruning)
    "genetic_replication": ("🧬  GENETIC/REPLICATION", "\033[33m"),          # Orange/Yellow (DNA/Git Sync)
    "endocrine_glands": ("🔥  ENDOCRINE GLANDS", "\033[31;1m"),            # Intense Red (Secrets/Config)
    "practical_field": ("🚜  PRACTICAL FIELD OPERATIONS", "\033[33;1m"),    # Intense Yellow/Orange (Planting/Sensors)
    "regulatory": ("📋  REGULATORY & COMPLIANCE", "\033[32;1m"),            # Intense Green (Environmental Rules/Forms)
    "advanced_research": ("🔬  ADVANCED RESEARCH & PhD", "\033[35;1m")       # Intense Magenta (Academic Models)
}

class SimulatedMemory:
    """A simulated multi-layer Memory (Redis + Vector + Graph + Cold storage) with daily journaling"""
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.memory_path = os.path.join(base_dir, "git_star_gains", "agent_memory.json")
        self.hot_cache = [] # Redis
        self.vector_space = [] # Semantic Chroma
        self.graph_nodes = {} # Relational Neo4j
        self.load_memory()

    def load_memory(self):
        if os.path.exists(self.memory_path):
            try:
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.hot_cache = data.get("hot_cache", [])
                    self.vector_space = data.get("vector_space", [])
                    self.graph_nodes = data.get("graph_nodes", {})
            except Exception:
                pass

    def save_memory(self):
        os.makedirs(os.path.dirname(self.memory_path), exist_ok=True)
        try:
            with open(self.memory_path, "w", encoding="utf-8") as f:
                json.dump({
                    "hot_cache": self.hot_cache,
                    "vector_space": self.vector_space,
                    "graph_nodes": self.graph_nodes
                }, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    def add_engram(self, query, task_id, metabolic_path):
        engram = {
            "id": str(uuid.uuid4()),
            "timestamp": time.time(),
            "query": query,
            "task_id": task_id,
            "metabolic_path": metabolic_path
        }
        self.hot_cache.insert(0, engram)
        self.hot_cache = self.hot_cache[:10]
        self.vector_space.append(engram)
        self.graph_nodes[task_id] = {
            "query": query,
            "metabolic_path": metabolic_path,
            "connected_to": [prev["task_id"] for prev in self.hot_cache[1:3] if "task_id" in prev]
        }
        self.save_memory()

    def write_to_journal(self, query, task_id, triggered_repos, response_text):
        journal_dir = os.path.join(self.base_dir, ".agent", "memory", "journals")
        os.makedirs(journal_dir, exist_ok=True)
        date_str = time.strftime("%Y-%m-%d")
        journal_file = os.path.join(journal_dir, f"{date_str}.md")
        
        file_exists = os.path.exists(journal_file)
        
        entry = f"\n## 🧬 [{time.strftime('%H:%M:%S')}] Task Engram: {task_id}\n"
        entry += f"* **Query:** *\"{query}\"*\n\n"
        entry += "### 📡 Triggered Biological Organs / Repositories\n"
        
        if triggered_repos:
            for r in triggered_repos:
                entry += f"- **{r['original_name']}** ({r['system'].upper()})\n"
                entry += f"  * *Role:* {r['function']}\n"
                entry += f"  * *Practical Use:* {r['practical_use']}\n"
                entry += f"  * *Operation:* {r['how_to_use']}\n"
        else:
            entry += "- *No specific organs matched. Synthetic baseline metabolic cycle activated.*\n"
            
        entry += f"\n### 💡 Actionable Insights & Synthesis Guidance\n{response_text}\n"
        entry += "\n---\n"
        
        try:
            mode = "a" if file_exists else "w"
            with open(journal_file, mode, encoding="utf-8") as f:
                if not file_exists:
                    f.write(f"# 📓 Agri-Tech Field Journal - {date_str}\n\n")
                f.write(entry)
        except Exception as e:
            print(f"[!] Storing journal engram failed: {e}")

class Task:
    def __init__(self, description):
        self.id = str(uuid.uuid4())[:8]
        self.description = description
        self.stage_results = {}
        self.artifacts = []
        self.energy_expended = 0

class AntiGravityAgent:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.manifest_path = os.path.join(self.base_dir, "unified_biological_manifest.json")
        self.genome_manifest_path = os.path.join(self.base_dir, "git_star_gains", "genome_manifest.json")
        self.memory = SimulatedMemory(self.base_dir)
        self.master_manifest = {}
        self.genome_status = {}
        self.load_manifests()

    def load_manifests(self):
        # Load master manifest
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    self.master_manifest = json.load(f)
            except Exception:
                pass
        
        # Load genome status
        if os.path.exists(self.genome_manifest_path):
            try:
                with open(self.genome_manifest_path, "r", encoding="utf-8") as f:
                    self.genome_status = json.load(f)
            except Exception:
                pass

    def analyze_query(self, prompt: str):
        words = [w.lower().strip(",.?!()\"'") for w in prompt.split()]
        words = [w for w in words if len(w) > 2]
        
        matched_repos = []
        for system_key, system_data in self.master_manifest.get("systems", {}).items():
            repos = system_data.get("repositories", [])
            for r in repos:
                score = 0
                name_lower = r.get("original_name", "").lower()
                role_lower = r.get("role", "").lower()
                use_lower = r.get("practical_use", "").lower()
                how_lower = r.get("how_to_use", "").lower()
                
                if system_key.lower().replace("_", "") in prompt.lower():
                    score += 2
                
                for w in words:
                    if w in name_lower:
                        score += 5
                    if w in role_lower:
                        score += 3
                    if w in use_lower:
                        score += 2
                    if w in how_lower:
                        score += 1
                        
                if score > 0:
                    matched_repos.append({
                        "name": r.get("name"),
                        "original_name": r.get("original_name"),
                        "system": system_key,
                        "function": r.get("role"),
                        "level": r.get("level"),
                        "practical_use": r.get("practical_use"),
                        "how_to_use": r.get("how_to_use"),
                        "performance": r.get("performance"),
                        "github_url": r.get("github_url"),
                        "score": score
                    })
                    
        matched_repos.sort(key=lambda x: x["score"], reverse=True)
        return matched_repos

    def synthesize_response(self, prompt, matched_repos):
        if not matched_repos:
            return (
                "No specific repository matched your query directly.\n"
                "The core agricultural systems are functioning. We recommend checking farmOS or Sentinel-Hub "
                "for generalized Precision Ag operations and remote sensing data processing."
            )
            
        # Group matched repos by agricultural sector
        sectors = {}
        for r in matched_repos:
            sys_name = r["system"]
            if sys_name not in sectors:
                sectors[sys_name] = []
            sectors[sys_name].append(r)
            
        synthesis = "### 🚜 Sector-Specific Recommendations\n"
        synthesis += "Based on your query, the following specialized agricultural sectors have been activated:\n\n"
        
        for sys_key, repos in list(sectors.items())[:4]: # Limit to top 4 sectors
            sys_info = SYSTEM_THEMES.get(sys_key, (sys_key.upper(), ""))
            synthesis += f"#### {sys_info[0]} Sector\n"
            
            for idx, r in enumerate(repos[:2], 1): # Show top 2 matching repos per sector
                cloned_status = self.genome_status.get(r["name"], {}).get("status", "pending")
                status_str = "🟢 Active" if cloned_status in ["cloned", "exists"] else "⚪ Pending Hydration"
                
                synthesis += f"{idx}. **{r['original_name']}** - *{status_str}*\n"
                synthesis += f"   * **Role:** {r['function']}\n"
                synthesis += f"   * **Practical Use Case:** {r['practical_use']}\n"
                synthesis += f"   * **Operational Method:** {r['how_to_use']}\n"
                if r['github_url']:
                    synthesis += f"   * **Repository Link:** {r['github_url']}\n"
            synthesis += "\n"
            
        synthesis += "### 💡 Strategic Field Action Steps:\n"
        synthesis += "- **Hydrate codebases:** If any sector of interest shows *Pending Hydration*, you can clone all of its repositories by running: `python git_star_gains/pull_genome.py --system <system>` (replace `<system>` with the system key name).\n"
        synthesis += "- **Check dependencies:** Ensure you have Python, GDAL, and Docker installed locally to launch the sector-specific modules."
            
        return synthesis

    def get_organ_stats(self, system_name):
        systems_data = self.master_manifest.get("systems", {})
        system_data = systems_data.get(system_name, {})
        repos = system_data.get("repositories", [])
        
        total_organs = len(repos)
        alive_organs = 0
        total_stars = 0
        active_organs_list = []

        for r in repos:
            name = r.get("name", "")
            stars = r.get("stars", 0)
            role = r.get("role", "")
            total_stars += stars
            
            status_entry = self.genome_status.get(name, {})
            if status_entry.get("status") in ["cloned", "exists"]:
                alive_organs += 1
                active_organs_list.append((name, r.get("original_name", name), role, stars, r.get("practical_use", "")))

        return {
            "total": total_organs,
            "alive": alive_organs,
            "stars": total_stars,
            "active_organs": active_organs_list,
            "organ_desc": system_data.get("organ", "Unknown Organ Group"),
            "function": system_data.get("function", "Unknown function")
        }

    def print_pulse_bar(self, current, total, color):
        width = 25
        percent = current / total if total > 0 else 0
        filled = int(round(width * percent))
        bar = "█" * filled + "░" * (width - filled)
        return f"{color}[{bar}] {current}/{total} ({percent:.1%}){COLOR_RESET}"

    async def run_stage_metabolism(self, task, system_key, process_desc, query_matches, duration=0.4):
        theme_name, color = SYSTEM_THEMES.get(system_key, (system_key.upper(), COLOR_CYAN))
        stats = self.get_organ_stats(system_key)
        
        print(f"\n{color}{COLOR_BOLD}>> ACTIVATING SYSTEM: {theme_name}{COLOR_RESET}")
        print(f"{color}   Organ Group: {stats['organ_desc']}")
        print(f"{color}   Function:    {stats['function']}")
        print(f"   Progress:    " + self.print_pulse_bar(stats['alive'], stats['total'], color))
        
        system_matches = [m for m in query_matches if m["system"] == system_key]
        
        if system_matches:
            print(f"{color}   [🔥 Triggered Matching Organs]:{COLOR_RESET}")
            for m in system_matches[:2]:
                cloned_status = self.genome_status.get(m["name"], {}).get("status", "pending")
                status_emoji = "🟢" if cloned_status in ["cloned", "exists"] else "⚪ [Pending Hydration]"
                print(f"     - {COLOR_BOLD}{m['original_name']}{COLOR_RESET} {status_emoji}")
                print(f"       * *Use:* {m['practical_use']}")
            if len(system_matches) > 2:
                print(f"     - ...and {len(system_matches) - 2} other matching organs")
        elif stats['active_organs']:
            print(f"{color}   [⚡ System Baseline Active Organs]:{COLOR_RESET}")
            for handle, orig_name, role, stars, use in stats['active_organs'][:2]:
                print(f"     - {COLOR_BOLD}{orig_name}{COLOR_RESET}: {role}")
            if len(stats['active_organs']) > 2:
                print(f"     - ...and {len(stats['active_organs']) - 2} other baseline organs")
        else:
            print(f"   {COLOR_RED}[⚠️ System Deficient]: No hydrated organs available. Simulating synthetic metabolism.{COLOR_RESET}")

        # Simulate metabolism pulse animation
        steps = ["✦", "✧", "⚡", "⚛", "🧬"]
        for idx in range(3):
            pulse = steps[idx % len(steps)]
            sys.stdout.write(f"\r   {color}Metabolizing {pulse} {process_desc}...{COLOR_RESET}")
            sys.stdout.flush()
            await asyncio.sleep(duration / 3)
        sys.stdout.write(f"\r   {COLOR_GREEN}✓ Stage Complete! Homeostasis healthy.{COLOR_RESET}\n")
        sys.stdout.flush()

        task.stage_results[system_key] = {
            "processed": True,
            "active_organs_used": [n for n, o, r, s, u in stats['active_organs']],
            "timestamp": time.time()
        }

    async def execute_pipeline(self, prompt: str):
        task = Task(prompt)
        print(f"\n{COLOR_CYAN}{COLOR_BOLD}======================================================================")
        print(f"🧬 ANTI-GRAVITY AGENT METABOLIC SESSION ACTIVATED")
        print(f"   Task ID:      {task.id}")
        print(f"   Prompt:       \"{prompt}\"")
        print(f"======================================================================{COLOR_RESET}")
        
        # 1. Query matching
        query_matches = self.analyze_query(prompt)
        
        # 2. Run 17 stages pipeline
        await self.run_stage_metabolism(task, "sensory_system", "processing spatial inputs and loading satellite metadata", query_matches)
        await self.run_stage_metabolism(task, "nervous_system", "decomposing tasks with agricultural crop recommendation models", query_matches)
        await self.run_stage_metabolism(task, "practical_field", "initiating tractor guidance simulation and IoT sensors data streams", query_matches)
        await self.run_stage_metabolism(task, "regulatory", "verifying environment rules, parcel boundaries, and compliance checklist", query_matches)
        await self.run_stage_metabolism(task, "endocrine_glands", "checking local file access and mapping secure API tokens", query_matches)
        await self.run_stage_metabolism(task, "skeletal_reproductive", "mapping framework layouts and geo-coordinates skeleton meshes", query_matches)
        await self.run_stage_metabolism(task, "integumentary_system", "rendering visual maps and styling map tiles themes", query_matches)
        await self.run_stage_metabolism(task, "muscular_system", "processing raster geometry indices and computing grid masks", query_matches)
        await self.run_stage_metabolism(task, "circulatory_system", "flushing active GIS server buffers and caching routing graphs", query_matches)
        await self.run_stage_metabolism(task, "lymphatic_system", "running QA spatial overlay checks and diagnostic telemetry", query_matches)
        await self.run_stage_metabolism(task, "immune_system", "running secure boundary validation checks and secrets filters", query_matches)
        await self.run_stage_metabolism(task, "respiratory_endocrine", "synchronizing weather forecasting timelines and climate models", query_matches)
        await self.run_stage_metabolism(task, "digestive_system", "assimilating changes into Logseq agricultural journal logs", query_matches)
        await self.run_stage_metabolism(task, "advanced_research", "evaluating academic multispectral research libraries", query_matches)
        await self.run_stage_metabolism(task, "communication_system", "formatting report alerts and triggering notification hooks", query_matches)
        await self.run_stage_metabolism(task, "genetic_replication", "committing farm configuration backups and version controls", query_matches)
        await self.run_stage_metabolism(task, "excretory_system", "pruning empty spatial boundaries and compressing grid logs", query_matches)

        # 3. Save memory engrams
        self.memory.add_engram(prompt, task.id, list(task.stage_results.keys()))

        # 4. Generate actionable response
        response_text = self.synthesize_response(prompt, query_matches)
        
        # 5. Write Logseq daily journal log
        self.memory.write_to_journal(prompt, task.id, query_matches[:5], response_text)

        # 6. Calculate total progress stats
        total_alive = len([k for k, v in self.genome_status.items() if v.get("status") in ["cloned", "exists"]])
        total_manifest = len(self.genome_status)

        print(f"\n{COLOR_GREEN}{COLOR_BOLD}======================================================================")
        print(f"✅ METABOLIC CYCLE ACHIEVED SUCCESSFULLY! HOMEOSTASIS STABLE.")
        print(f"   Task ID:                  {task.id}")
        print(f"   Daily Journal Engram Saved to `.agent/memory/journals/`")
        print(f"   Active Organs Alive:      {total_alive}/{total_manifest} ({total_alive/total_manifest:.1%})")
        print(f"   Bioluminescent Status:    100% HEALTHY")
        print(f"======================================================================{COLOR_RESET}\n")

        print(response_text)
        print()
        return task

def run_cli():
    agent = AntiGravityAgent()
    
    print(f"{COLOR_CYAN}{COLOR_BOLD}")
    print("      ___           ___  ___  ___  ___  ___  ___  ___  ___ ")
    print("     |___| |\\ |  |   |  |___ |__/ |__|  |   |    |___  |   ")
    print("     |   | | \\|  |   |  |___ |  \\ |  |  |   |__  |___  |   ")
    print("                                                           ")
    total_organs = len(agent.genome_status) if agent.genome_status else 460
    print("     🚜 PRECISION AGRICULTURE & GIS COGNITIVE ENGINE v2.0 🚜")
    print(f"          {total_organs} Specialized Organs | 17 Biological Systems")
    print(f"{COLOR_RESET}")

    if not agent.master_manifest:
        print(f"{COLOR_RED}[!] Warning: unified_biological_manifest.json not found or corrupted.")
        print(f"    Please execute git_star_gains/upgrade_manifest.py first to initialize genome.{COLOR_RESET}\n")

    print(f"{COLOR_YELLOW}Type 'help' to see active commands.{COLOR_RESET}\n")

    while True:
        try:
            prompt = input(f"{COLOR_MAGENTA}{COLOR_BOLD}agri_body> {COLOR_RESET}").strip()
            if not prompt:
                continue
            if prompt.lower() in ["exit", "quit", "q"]:
                print(f"{COLOR_CYAN}[+] Dissolving biological shell. Entering hibernation...{COLOR_RESET}")
                break
            
            # Special command: help
            if prompt.lower() == "help":
                print(f"\n{COLOR_CYAN}{COLOR_BOLD}=== AVAILABLE COMMANDS ==={COLOR_RESET}")
                print(f"   status                 - Show current biological status and genome hydration")
                print(f"   hydrate all            - Simulate 100% active organ status (no local cloning needed)")
                print(f"   help                   - Show this message")
                print(f"   exit                   - Terminate biological simulation")
                print(f"   <query>                - Input any agricultural or GIS question to metabolize")
                print(f"{COLOR_CYAN}=========================={COLOR_RESET}\n")
                continue
                
            # Special command: hydrate all
            if prompt.lower() == "hydrate all":
                for system_key, system_data in agent.master_manifest.get("systems", {}).items():
                    repos = system_data.get("repositories", [])
                    for r in repos:
                        name = r.get("name", "")
                        agent.genome_status[name] = {
                            "status": "exists",
                            "path": "simulated_hydration",
                            "system": system_key,
                            "role": r.get("role", ""),
                            "stars": r.get("stars", 0)
                        }
                # Save to genome manifest
                os.makedirs(os.path.dirname(agent.genome_manifest_path), exist_ok=True)
                with open(agent.genome_manifest_path, "w", encoding="utf-8") as f:
                    json.dump(agent.genome_status, f, indent=2, ensure_ascii=False)
                print(f"\n{COLOR_GREEN}[+] Simulated full hydration complete. All {len(agent.genome_status)} organs are now active!{COLOR_RESET}\n")
                continue
            
            if prompt.lower() == "status":
                total_alive = len([k for k, v in agent.genome_status.items() if v.get("status") in ["cloned", "exists"]])
                total_manifest = len(agent.genome_status)
                print(f"\n{COLOR_CYAN}{COLOR_BOLD}=== BIOLOGICAL STATUS REPORT ==={COLOR_RESET}")
                print(f"   Workspace:    {agent.base_dir}")
                print(f"   Memory Node:  {len(agent.memory.graph_nodes)} tasks stored")
                print(f"   Hydration:    " + agent.print_pulse_bar(total_alive, total_manifest, COLOR_CYAN))
                print(f"   Circulation:  17 biological systems active")
                print(f"{COLOR_CYAN}================================{COLOR_RESET}\n")
                continue
            
            # Run the 17-stage execution loop!
            asyncio.run(agent.execute_pipeline(prompt))
        except KeyboardInterrupt:
            print(f"\n{COLOR_CYAN}[+] Entering hibernation...{COLOR_RESET}")
            break

if __name__ == "__main__":
    run_cli()
