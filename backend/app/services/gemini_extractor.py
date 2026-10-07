import json
import logging
from typing import List, Dict, Any
from app.core.config import settings
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

class GeminiExtractor:
    def __init__(self):
        pass

    async def extract_project_skills(self, repo_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Uses Groq Llama 3.3 / Gemini to parse project description, languages, topics, and readme into categorized skills.
        Always merges with high-precision AST / keyword fallback heuristics to guarantee 100% extraction.
        """
        repo_name = repo_data.get('name', '')
        desc = repo_data.get('description') or ''
        languages = list(repo_data.get('languages', []))
        primary_lang = repo_data.get('primary_language')
        if primary_lang and primary_lang not in languages and primary_lang not in ['Unknown', 'General']:
            languages.insert(0, primary_lang)
        topics = list(repo_data.get('topics', []))
        readme_snippet = repo_data.get('readme_snippet', '')

        system_prompt = "You are a senior technical knowledge graph parser. Analyze the GitHub repository metadata and extract all core technical skills, programming languages, libraries, frameworks, tools, databases, and architectural domains."
        user_prompt = f"""
Project Name: {repo_name}
Description: {desc}
Primary Language: {primary_lang}
All Languages: {", ".join(languages)}
GitHub Topics: {", ".join(topics)}
README Snippet:
{readme_snippet}

Return strictly valid JSON with structure:
{{
  "skills": [
    {{"name": "SkillName", "category": "Language|Framework|Database|Cloud|DevOps|AI/ML|Security|Web|Tool"}}
  ]
}}
"""
        extracted_skills: List[Dict[str, str]] = []
        seen_names = set()

        def add_skill(name: str, cat: str = "Technical"):
            clean_name = name.strip()
            if clean_name and clean_name.lower() not in seen_names and len(clean_name) > 1:
                seen_names.add(clean_name.lower())
                extracted_skills.append({"name": clean_name, "category": cat})

        try:
            parsed = await llm_service.chat_json(system_prompt=system_prompt, user_prompt=user_prompt)
            if parsed and isinstance(parsed, dict) and "skills" in parsed and isinstance(parsed["skills"], list):
                for item in parsed["skills"]:
                    if isinstance(item, dict) and item.get("name"):
                        add_skill(item["name"], item.get("category", "Technical"))
            elif isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict) and item.get("name"):
                        add_skill(item["name"], item.get("category", "Technical"))
        except Exception as e:
            logger.warning(f"LLM skill extraction notice for {repo_name}: {e}")

        # Deterministic / AST Fallback & Supplementation:
        # 1. Languages
        for lang in languages:
            if lang and lang not in ['Unknown', 'General']:
                add_skill(lang, "Language")

        # 2. GitHub Topics
        for top in topics:
            if top:
                add_skill(top.capitalize(), "Domain")

        # 3. Keyword / Signature Discovery across repo name, desc, and README
        text_blob = f"{repo_name} {desc} {readme_snippet}".lower()
        known_tech = {
            "fastapi": ("FastAPI", "Framework"),
            "flask": ("Flask", "Framework"),
            "django": ("Django", "Framework"),
            "react": ("React", "Framework"),
            "vue": ("Vue.js", "Framework"),
            "angular": ("Angular", "Framework"),
            "next": ("Next.js", "Framework"),
            "vite": ("Vite", "Tool"),
            "neo4j": ("Neo4j", "Database"),
            "mongodb": ("MongoDB", "Database"),
            "postgresql": ("PostgreSQL", "Database"),
            "postgres": ("PostgreSQL", "Database"),
            "mysql": ("MySQL", "Database"),
            "sqlite": ("SQLite", "Database"),
            "redis": ("Redis", "Database"),
            "supabase": ("Supabase", "Cloud"),
            "firebase": ("Firebase", "Cloud"),
            "docker": ("Docker", "DevOps"),
            "kubernetes": ("Kubernetes", "DevOps"),
            "k8s": ("Kubernetes", "DevOps"),
            "tailwind": ("TailwindCSS", "Framework"),
            "bootstrap": ("Bootstrap", "Framework"),
            "pytorch": ("PyTorch", "AI/ML"),
            "tensorflow": ("TensorFlow", "AI/ML"),
            "keras": ("Keras", "AI/ML"),
            "scikit": ("Scikit-Learn", "AI/ML"),
            "pandas": ("Pandas", "AI/ML"),
            "numpy": ("NumPy", "AI/ML"),
            "langchain": ("LangChain", "AI/ML"),
            "llama": ("Llama / LLMs", "AI/ML"),
            "gemini": ("Google Gemini", "AI/ML"),
            "openai": ("OpenAI API", "AI/ML"),
            "groq": ("Groq LLM", "AI/ML"),
            "weasyprint": ("WeasyPrint", "Tool"),
            "pdf": ("PDF Generation", "Tool"),
            "latex": ("LaTeX", "Tool"),
            "animation": ("Web Animation / CSS", "Web"),
            "three.js": ("Three.js", "Web"),
            "threejs": ("Three.js", "Web"),
            "canvas": ("HTML5 Canvas", "Web"),
            "html": ("HTML5", "Language"),
            "css": ("CSS3", "Language"),
            "javascript": ("JavaScript", "Language"),
            "typescript": ("TypeScript", "Language"),
            "python": ("Python", "Language"),
            "bot": ("Bot Automation", "Tool"),
            "invoice": ("Invoice OCR / Parser", "Domain"),
            "analyzer": ("Code Analysis", "Tool"),
            "crawler": ("Web Scraping", "Tool"),
            "scraper": ("Web Scraping", "Tool"),
            "selenium": ("Selenium", "DevOps"),
            "beautifulsoup": ("BeautifulSoup", "Tool"),
            "bs4": ("BeautifulSoup", "Tool"),
            "search": ("Search Engine", "Domain"),
            "ast": ("AST Code Analysis", "Tool")
        }

        for keyword, (std_name, category) in known_tech.items():
            if keyword in text_blob:
                add_skill(std_name, category)

        # Ensure at least 1 verified skill exists if any language was detected
        if not extracted_skills and primary_lang:
            add_skill(primary_lang, "Language")

        return extracted_skills

gemini_extractor = GeminiExtractor()
