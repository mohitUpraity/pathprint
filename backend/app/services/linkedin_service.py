import csv
import io
import logging
import re
from typing import List, Dict, Any, Optional
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.core.config import settings

logger = logging.getLogger(__name__)

class LinkedInService:
    def __init__(self):
        if settings.GEMINI_API_KEY and genai:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception:
                self.model = None
        else:
            self.model = None

    @classmethod
    def clean_entity_name(cls, name: str) -> str:
        """Standardizes company and university names."""
        if not name:
            return ""
        # Remove common corporate suffixes
        cleaned = re.sub(r'\b(Inc\.?|LLC|Ltd\.?|Pvt\.?|Corp\.?|Corporation|Technologies|Solutions|Services)\b', '', name, flags=re.IGNORECASE)
        # Remove extra punctuation and whitespace
        cleaned = re.sub(r'[^\w\s\-\&]', '', cleaned).strip()
        cleaned = re.sub(r'\s{2,}', ' ', cleaned)
        return cleaned or name.strip()

    UNIVERSITY_KEYWORDS = [
        "university", "college", "institute", "school", "academy", "campus", "iit", "nit", "iiit",
        "bits", "aktu", "uptu", "anand engineering", "sharda", "hcst", "sgi", "delhi university",
        "stanford", "harvard", "mit", "oxford", "cambridge", "polytechnic", "vidyapeeth"
    ]

    TECH_SKILL_KEYWORDS = [
        "python", "javascript", "typescript", "react", "next.js", "node.js", "fastapi", "django",
        "docker", "kubernetes", "aws", "gcp", "azure", "machine learning", "deep learning", "ai",
        "llm", "llms", "genai", "nlp", "computer vision", "postgresql", "mongodb", "redis", "neo4j", "graphql",
        "data science", "devops", "cloud", "cybersecurity", "full stack", "backend", "frontend",
        "java", "c++", "golang", "rust", "sql", "linux", "git", "flutter", "swift", "pytorch", "tensorflow",
        "ml", "sde", "data engineering", "system design"
    ]

    ALUMNI_KEYWORDS = [
        "anand engineering", "anand engg", "aec", "sharda", "sgi", "hcst", "hindustan college",
        "sharda group of institutions", "sharda university"
    ]

    @classmethod
    def extract_rich_entities(cls, position: str, raw_company: str) -> Dict[str, Any]:
        """
        Deterministically extracts role, company, university, skills, and alumni tags from headline/company strings.
        """
        pos_lower = (position or "").lower()
        comp_lower = (raw_company or "").lower()
        combined_text = f"{position} {raw_company}".strip()
        combined_lower = combined_text.lower()

        extracted_university = ""
        extracted_company = ""
        extracted_role = position or "Professional"
        extracted_skills = []
        is_alumni = False

        # 1. Check for Alumni Match
        if any(ak in combined_lower for ak in cls.ALUMNI_KEYWORDS):
            is_alumni = True

        # 2. Check for University / Education
        is_edu = any(uk in comp_lower for uk in cls.UNIVERSITY_KEYWORDS) or any(uk in pos_lower for uk in cls.UNIVERSITY_KEYWORDS)
        if is_edu:
            if any(uk in comp_lower for uk in cls.UNIVERSITY_KEYWORDS):
                extracted_university = cls.clean_entity_name(raw_company)
            elif " at " in position:
                parts = position.split(" at ")
                if any(uk in parts[1].lower() for uk in cls.UNIVERSITY_KEYWORDS):
                    extracted_university = cls.clean_entity_name(parts[1])
                    extracted_role = parts[0].strip() or "Student"
            elif " @ " in position:
                parts = position.split(" @ ")
                if any(uk in parts[1].lower() for uk in cls.UNIVERSITY_KEYWORDS):
                    extracted_university = cls.clean_entity_name(parts[1])
                    extracted_role = parts[0].strip() or "Student"
            elif is_alumni:
                extracted_university = "Anand Engineering College"

        # 3. Check for Company (if not purely university)
        if raw_company and not is_edu and raw_company.lower() != "industry network":
            extracted_company = cls.clean_entity_name(raw_company)
        elif not is_edu and " at " in position:
            parts = position.split(" at ")
            possible_comp = parts[1].split("|")[0].split(",")[0].strip()
            if len(possible_comp) > 2 and possible_comp.lower() not in ["industry network", "stealth"]:
                extracted_company = cls.clean_entity_name(possible_comp)
                extracted_role = parts[0].strip()
        elif not is_edu and " @ " in position:
            parts = position.split(" @ ")
            possible_comp = parts[1].split("|")[0].split(",")[0].strip()
            if len(possible_comp) > 2 and possible_comp.lower() not in ["industry network", "stealth"]:
                extracted_company = cls.clean_entity_name(possible_comp)
                extracted_role = parts[0].strip()

        # 4. Extract Technical Skills
        for skill in cls.TECH_SKILL_KEYWORDS:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, combined_lower):
                extracted_skills.append(skill.title() if len(skill) > 3 else skill.upper())

        return {
            "company": extracted_company,
            "university": extracted_university,
            "role": extracted_role,
            "skills": extracted_skills[:5],
            "is_alumni": is_alumni
        }

    @classmethod
    def parse_connections_csv(cls, csv_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Parses LinkedIn official Connections.csv export format with rich semantic extraction.
        """
        try:
            text = csv_bytes.decode('utf-8', errors='ignore')
            lines = text.splitlines()
            
            # Find the header row (starts with "First Name" or contains "Company")
            header_idx = 0
            for idx, line in enumerate(lines[:10]):
                if "First Name" in line and "Company" in line:
                    header_idx = idx
                    break

            reader = csv.DictReader(lines[header_idx:])
            connections = []

            for row in reader:
                first_name = row.get("First Name", "").strip()
                last_name = row.get("Last Name", "").strip()
                company = row.get("Company", "").strip()
                position = row.get("Position", "").strip()
                connected_on = row.get("Connected On", "").strip()
                url = row.get("URL", "").strip()

                if not first_name:
                    continue  # Skip rows without name

                full_name = f"{first_name} {last_name}".strip()
                rich = cls.extract_rich_entities(position, company)
                
                # Use URL or normalized name for unique stable ID
                if url and "/in/" in url:
                    url_slug = url.split("/in/")[1].split("?")[0].strip("/").lower()
                    person_id = f"linkedin:{url_slug}"
                else:
                    person_id = f"linkedin:{first_name.lower()}_{last_name.lower()}".replace(" ", "_")

                connections.append({
                    "id": person_id,
                    "name": full_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "raw_company": company,
                    "company": rich["company"],
                    "university": rich["university"],
                    "position": rich["role"] or position or "Professional",
                    "skills": rich["skills"],
                    "is_alumni": rich["is_alumni"],
                    "connected_on": connected_on or "Recent",
                    "profile_url": url
                })

            return connections
        except Exception as e:
            logger.error(f"Error parsing LinkedIn Connections.csv: {e}")
            return []

    async def parse_hiring_lead_post(self, post_text: str) -> Dict[str, Any]:
        """
        Extracts company, role, hiring manager, and required skills from a raw LinkedIn hiring post text.
        """
        if self.model and post_text:
            prompt = f"""
Analyze this LinkedIn hiring post and extract key lead entities in strict JSON:
\"\"\"
{post_text[:3000]}
\"\"\"

Return ONLY valid JSON with this exact schema:
{{
  "company_name": "Target Company",
  "hiring_manager_name": "Name of poster or contact",
  "job_title": "Role Title (e.g. Backend Engineer)",
  "skills": ["Python", "FastAPI", "Docker"],
  "location": "Remote / City",
  "application_link_or_email": ""
}}
"""
            try:
                response = self.model.generate_content(prompt)
                clean_json = response.text.strip().replace("```json", "").replace("```", "").strip()
                return json.loads(clean_json)
            except Exception as e:
                logger.warning(f"Gemini post extraction fallback: {e}")

        # Fallback Heuristic
        company_match = re.search(r'\bat\s+([A-Z][A-Za-z0-9]+)', post_text)
        role_match = re.search(r'\b(Software Engineer|Backend Developer|Full Stack|DevOps|Data Scientist)\b', post_text, re.IGNORECASE)
        
        return {
            "company_name": company_match.group(1) if company_match else "Target Company",
            "hiring_manager_name": "Hiring Manager",
            "job_title": role_match.group(0) if role_match else "Software Developer",
            "skills": ["Python", "FastAPI", "React"],
            "location": "Remote",
            "application_link_or_email": ""
        }

linkedin_service = LinkedInService()
