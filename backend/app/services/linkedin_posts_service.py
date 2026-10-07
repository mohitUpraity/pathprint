import os
import re
import csv
import json
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.database import neo4j_client
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

POSTS_EXTRACTION_PROMPT = """
You are an expert Career Knowledge Extraction AI.
Analyze the following list of LinkedIn posts/activity shares written by a candidate.

Extract ALL relevant career accomplishments, specifically:
1. Hackathons & Competitions (e.g., Microsoft Noida Hackathon, Smart India Hackathon, college hackathons)
2. Projects mentioned in posts (name, tech stack, what was built)
3. Milestones & Achievements (e.g., winning a prize, reaching a ranking, open source contributions, leadership roles)
4. Workshops, Talks & Certifications attended or completed
5. Verified Skills mentioned in context with proof

Output ONLY valid JSON matching this exact structure:
{
  "hackathons": [
    {
      "name": "string (e.g. Microsoft Noida Hackathon)",
      "organizer": "string (e.g. Microsoft)",
      "location": "string (e.g. Noida / Online)",
      "project_built": "string",
      "date": "string",
      "highlights": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "skills_used": ["string"]
    }
  ],
  "achievements": [
    {
      "title": "string",
      "organization": "string",
      "description": "string",
      "date": "string"
    }
  ],
  "certifications_or_workshops": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "extracted_skills": ["string"]
}

LinkedIn Posts Content:
{posts_content}
"""

class LinkedInPostsService:
    @classmethod
    def parse_csv_posts(cls, csv_text: str) -> List[str]:
        """
        Parses LinkedIn official 'Shares.csv' or 'Posts.csv' data export.
        """
        posts = []
        try:
            reader = csv.DictReader(csv_text.splitlines())
            for row in reader:
                commentary = row.get("ShareCommentary") or row.get("Post Content") or row.get("Content") or row.get("text")
                if commentary and len(commentary.strip()) > 15:
                    posts.append(commentary.strip())
        except Exception as e:
            logger.warning(f"Failed CSV parse fallback to raw lines: {e}")
            posts = [line.strip() for line in csv_text.splitlines() if len(line.strip()) > 20]
        return posts

    @classmethod
    async def extract_knowledge_from_posts(cls, posts_text: str) -> Dict[str, Any]:
        """
        Extracts high-value career intelligence from unstructured posts using Groq/Gemini LLM.
        """
        fallback_data = {
            "hackathons": [],
            "projects": [],
            "achievements": [],
            "certifications_or_workshops": [],
            "extracted_skills": []
        }
        
        if not posts_text or not posts_text.strip():
            return fallback_data

        try:
            prompt = POSTS_EXTRACTION_PROMPT.replace("{posts_content}", posts_text[:20000])
            data = await llm_service.generate_json(prompt)
            if isinstance(data, dict):
                return data
            return fallback_data
        except Exception as e:
            logger.error(f"Posts knowledge extraction failed: {e}")
            return fallback_data

    @classmethod
    async def merge_posts_knowledge_to_graph(cls, user_id: str, knowledge: Dict[str, Any]) -> int:
        """
        Merges extracted Hackathons, Achievements, Certifications, and Skills into Neo4j AuraDB.
        Guarantees user node existence with MERGE.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return 0

        merged_count = 0

        # Ensure user anchor node exists
        user_init_query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.full_name = 'Candidate',
                      u.created_at = datetime()
        RETURN u.id;
        """
        await neo4j_client.execute_query(user_init_query, {"user_id": user_id})

        # 1. Ingest Hackathons
        for hack in knowledge.get("hackathons", []):
            h_name = (hack.get("name") or "").strip()
            if h_name:
                hack_query = """
                MERGE (u:User {id: $user_id})
                MERGE (h:Hackathon {name: $name})
                ON CREATE SET h.organizer = $organizer,
                              h.location = $location,
                              h.title = $name,
                              h.created_at = datetime()
                ON MATCH SET h.organizer = CASE WHEN $organizer <> '' THEN $organizer ELSE h.organizer END
                MERGE (u)-[r:PARTICIPATED_IN]->(h)
                ON CREATE SET r.project_built = $project,
                              r.highlights = $highlights,
                              r.date = $date
                MERGE (u)-[:ACHIEVED]->(h)
                WITH h, $organizer AS org_name
                WHERE org_name <> ''
                MERGE (c:Company {name: org_name})
                MERGE (h)-[:ORGANIZED_BY]->(c)
                RETURN h.name;
                """
                await neo4j_client.execute_query(hack_query, {
                    "user_id": user_id,
                    "name": h_name,
                    "organizer": hack.get("organizer", "").strip(),
                    "location": hack.get("location", "").strip(),
                    "project": hack.get("project_built", ""),
                    "highlights": hack.get("highlights", ""),
                    "date": hack.get("date", "")
                })
                merged_count += 1

        # 2. Ingest Achievements
        for ach in knowledge.get("achievements", []):
            a_title = (ach.get("title") or "").strip()
            if a_title:
                ach_query = """
                MERGE (u:User {id: $user_id})
                MERGE (a:Achievement {name: $title})
                ON CREATE SET a.title = $title,
                              a.organization = $org,
                              a.description = $desc,
                              a.date = $date,
                              a.created_at = datetime()
                MERGE (u)-[:ACHIEVED]->(a)
                RETURN a.name;
                """
                await neo4j_client.execute_query(ach_query, {
                    "user_id": user_id,
                    "title": a_title,
                    "org": ach.get("organization", "").strip(),
                    "desc": ach.get("description", "").strip(),
                    "date": ach.get("date", "")
                })
                merged_count += 1

        # 3. Ingest Certifications & Workshops
        for cert in knowledge.get("certifications_or_workshops", []):
            c_name = (cert.get("name") or "").strip()
            if c_name:
                cert_query = """
                MERGE (u:User {id: $user_id})
                MERGE (c:Certification {name: $name})
                ON CREATE SET c.issuer = $issuer,
                              c.date = $date,
                              c.created_at = datetime()
                MERGE (u)-[:EARNED]->(c)
                RETURN c.name;
                """
                await neo4j_client.execute_query(cert_query, {
                    "user_id": user_id,
                    "name": c_name,
                    "issuer": cert.get("issuer", "").strip(),
                    "date": cert.get("date", "")
                })
                merged_count += 1

        # 4. Ingest Extracted Skills
        skills = knowledge.get("extracted_skills", [])
        if skills:
            skill_query = """
            MERGE (u:User {id: $user_id})
            UNWIND $skills AS skill_name
            MERGE (s:Skill {name: skill_name})
            ON CREATE SET s.category = 'Technical'
            MERGE (u)-[:HAS_SKILL {source: 'linkedin_posts'}]->(s)
            RETURN count(s);
            """
            await neo4j_client.execute_query(skill_query, {
                "user_id": user_id,
                "skills": [s.strip() for s in skills if s.strip()]
            })
            merged_count += len(skills)

        return merged_count

linkedin_posts_service = LinkedInPostsService()
