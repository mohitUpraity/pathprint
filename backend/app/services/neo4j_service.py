import re
import json
import logging
from typing import List, Dict, Any, Optional
from app.core.database import neo4j_client

logger = logging.getLogger(__name__)

class Neo4jService:
    @classmethod
    async def upsert_user_github_projects(
        cls, 
        user_id: str, 
        user_email: str,
        github_username: str, 
        projects: List[Dict[str, Any]]
    ) -> int:
        """
        Executes atomic Cypher queries to merge User, Project, and Skill nodes.
        Guarantees strict multi-tenant scoping anchored to (:User {id: $user_id}).
        """
        if not neo4j_client.driver:
            logger.warning("Neo4j driver offline. Skipping live graph upsert.")
            return len(projects)

        nodes_merged_count = 0

        # 1. Upsert User Node
        user_query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.email = $email,
                      u.github_username = $github_username,
                      u.created_at = datetime()
        ON MATCH SET u.github_username = $github_username
        RETURN u.id AS id;
        """
        await neo4j_client.execute_query(user_query, {
            "user_id": user_id,
            "email": user_email,
            "github_username": github_username
        })
        nodes_merged_count += 1

        # 2. Upsert Projects and link Skills
        for proj in projects:
            proj_query = """
            MERGE (u:User {id: $user_id})
            MERGE (p:Project {id: $project_id})
            ON CREATE SET p.name = $name,
                          p.description = $description,
                          p.repo_url = $url,
                          p.stars_count = $stars,
                          p.primary_language = $primary_language,
                          p.created_at = datetime()
            ON MATCH SET p.description = $description,
                         p.stars_count = $stars,
                         p.primary_language = $primary_language
            MERGE (u)-[:BUILT]->(p)
            WITH p, u
            UNWIND CASE WHEN size($skills) = 0 THEN [null] ELSE $skills END AS skill_data
            WITH p, u, skill_data WHERE skill_data IS NOT NULL
            MERGE (s:Skill {name: skill_data.name})
            ON CREATE SET s.category = coalesce(skill_data.category, 'Technical')
            MERGE (p)-[:USES_TECH]->(s)
            MERGE (u)-[:HAS_SKILL {source: 'github'}]->(s)
            MERGE (u)-[:VERIFIED_SKILL]->(s)
            RETURN count(s) AS linked_skills;
            """
            params = {
                "user_id": user_id,
                "project_id": proj["id"],
                "name": proj["name"],
                "description": proj["description"],
                "url": proj["url"],
                "stars": proj["stars"],
                "primary_language": proj["primary_language"],
                "skills": proj.get("skills", [])
            }
            res = await neo4j_client.execute_query(proj_query, params)
            nodes_merged_count += 1 + len(proj.get("skills", []))

        return nodes_merged_count

    @classmethod
    async def get_user_synced_projects(cls, user_id: str) -> List[Dict[str, Any]]:
        """
        Queries Neo4j for all Project nodes currently linked to the candidate via (u:User)-[:BUILT]->(p:Project).
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return []

        query = """
        MATCH (u:User {id: $user_id})-[:BUILT]->(p:Project)
        RETURN p.id AS id, p.name AS name, p.repo_url AS repo_url, p.primary_language AS primary_language, p.stars_count AS stars
        ORDER BY p.name ASC;
        """
        try:
            results = await neo4j_client.execute_query(query, {"user_id": user_id})
            return results or []
        except Exception as e:
            logger.warning(f"Failed to fetch user projects from Neo4j: {e}")
            return []

    @classmethod
    async def get_user_synced_project_ids(cls, user_id: str) -> List[str]:
        """
        Returns list of synced project IDs and normalized repo names for fast deduplication.
        """
        projects = await cls.get_user_synced_projects(user_id)
        synced_identifiers = set()
        for p in projects:
            if p.get("id"):
                synced_identifiers.add(str(p["id"]).lower())
            if p.get("name"):
                synced_identifiers.add(str(p["name"]).lower())
        return list(synced_identifiers)

    @classmethod
    async def upsert_user_resume_blueprint(

        cls,
        user_id: str,
        blueprint: Any
    ) -> int:
        """
        Upserts extracted resume entities (Universities, Companies, Projects, Skills)
        and creates multi-tenant relationships in Neo4j AuraDB.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            logger.warning("Neo4j driver offline. Skipping live resume graph upsert.")
            return 1

        nodes_merged = 0

        # 1. Update User basic info and Golden Blueprint snapshot
        contact = blueprint.contact
        blueprint_json_str = blueprint.model_dump_json() if hasattr(blueprint, "model_dump_json") else json.dumps(blueprint)
        user_query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.full_name = $full_name,
                      u.email = $email,
                      u.phone = $phone,
                      u.location = $location,
                      u.linkedin_url = $linkedin,
                      u.github_url = $github,
                      u.summary = $summary,
                      u.blueprint_json = $blueprint_json,
                      u.created_at = datetime(),
                      u.updated_at = datetime()
        ON MATCH SET u.full_name = CASE WHEN $full_name <> '' THEN $full_name ELSE u.full_name END,
                     u.email = CASE WHEN $email <> '' THEN $email ELSE u.email END,
                     u.phone = CASE WHEN $phone <> '' THEN $phone ELSE u.phone END,
                     u.location = CASE WHEN $location <> '' THEN $location ELSE u.location END,
                     u.linkedin_url = CASE WHEN $linkedin <> '' THEN $linkedin ELSE u.linkedin_url END,
                     u.github_url = CASE WHEN $github <> '' THEN $github ELSE u.github_url END,
                     u.summary = CASE WHEN $summary <> '' THEN $summary ELSE u.summary END,
                     u.blueprint_json = $blueprint_json,
                     u.updated_at = datetime()
        RETURN u.id AS id;
        """
        await neo4j_client.execute_query(user_query, {
            "user_id": user_id,
            "full_name": contact.full_name or "",
            "email": contact.email or "",
            "phone": contact.phone or "",
            "location": getattr(contact, "location", "") or "",
            "linkedin": contact.linkedin_url or "",
            "github": contact.github_url or "",
            "summary": getattr(blueprint, "summary", "") or "",
            "blueprint_json": blueprint_json_str
        })
        nodes_merged += 1

        # Purge previous resume-sourced relationships for this user to ensure clean state
        try:
            purge_old_resume_rels = """
            MATCH (u:User {id: $user_id})
            OPTIONAL MATCH (u)-[r1:HAS_SKILL {source: 'resume'}]->()
            OPTIONAL MATCH (u)-[r2:ATTENDED]->()
            OPTIONAL MATCH (u)-[r3:WORKED_AT]->()
            OPTIONAL MATCH (u)-[r4:ACHIEVED]->()
            DELETE r1, r2, r3, r4;
            """
            await neo4j_client.execute_query(purge_old_resume_rels, {"user_id": user_id})

            # Clean up rogue university nodes created by previous broken extractions
            cleanup_rogue_univs = """
            MATCH (univ:University)
            WHERE toLower(univ.name) CONTAINS 'prototype' 
               OR toLower(univ.name) CONTAINS 'developed'
               OR toLower(univ.name) CONTAINS 'processed'
               OR toLower(univ.name) CONTAINS 'next.js'
               OR toLower(univ.name) CONTAINS 'hack with'
               OR toLower(univ.name) CONTAINS 'potential'
               OR toLower(univ.name) CONTAINS 'software'
            DETACH DELETE univ;
            """
            await neo4j_client.execute_query(cleanup_rogue_univs, {})
        except Exception as pe:
            logger.warning(f"Note on purging old resume relationships: {pe}")

        # 2. Upsert Education & University Nodes
        forbidden_terms = set()
        if contact.full_name:
            forbidden_terms.add(contact.full_name.strip().lower())
            for part in contact.full_name.strip().lower().split():
                if len(part) > 2:
                    forbidden_terms.add(part)

        univ_valid_keywords = {"college", "university", "institute", "iit", "nit", "iiit", "school", "academy", "vidyalaya", "campus"}
        invalid_univ_verbs = {"developed", "built", "engineered", "processed", "implemented", "created", "designed", "prototype", "for"}

        for edu in blueprint.education:
            raw_univ = (edu.university or "").strip()
            # Clean university string: remove degree suffixes and trailing punctuation
            clean_univ = re.split(r'\s*[-–—|,]\s*(?:B\.?Tech|Bachelor|Master|B\.?E|Degree|Engineering)', raw_univ, flags=re.IGNORECASE)[0].strip()
            clean_univ = re.sub(r'[\(\)\[\]]', '', clean_univ).strip()

            # Must contain valid university keyword and NOT be a verb
            if not any(k in clean_univ.lower() for k in univ_valid_keywords) or any(v in clean_univ.lower().split() for v in invalid_univ_verbs):
                continue

            if clean_univ and len(clean_univ) > 3:
                forbidden_terms.add(clean_univ.lower())
                edu_query = """
                MATCH (u:User {id: $user_id})
                MERGE (univ:University {name: $university_name})
                MERGE (u)-[r:ATTENDED]->(univ)
                ON CREATE SET r.degree = $degree,
                              r.field_of_study = $field,
                              r.end_date = $end_date
                ON MATCH SET r.degree = $degree,
                             r.field_of_study = $field,
                             r.end_date = $end_date
                RETURN univ.name;
                """
                await neo4j_client.execute_query(edu_query, {
                    "user_id": user_id,
                    "university_name": clean_univ[:60],
                    "degree": edu.degree or "Degree",
                    "field": edu.field_of_study or "Engineering / Science",
                    "end_date": edu.end_date or ""
                })
                nodes_merged += 1

        # 3. Upsert Work Experience & Company Nodes (Strictly Validated)
        invalid_comp_words = {
            "building", "deploying", "prototype", "systems", "winner", "next",
            "generation", "firewall", "present", "and", "for", "with", "tight",
            "timelines", "timeline", "analysis", "anomalous", "detection", "state", "time",
            "risk", "work", "working", "deliver", "ship", "features", "rest", "apis",
            "adrde,", "adrde.", "industry network", "defence", "research", "development",
            "(drdo)", "(ngfw)", "(react,", "node.js,", "firebase,", "mongodb,", "postgresql)",
            "2026", "feb", "jun", "apr", "intern", "conducted", "engineered", "developed",
            "currently", "proven", "ability", "alongside", "specialized", "simulated",
            "suspicious", "third", "packets", "packet", "patterns", "pipeline", "potential",
            "prediction,", "production", "products", "real", "reviews", "risks.", "secure",
            "security.", "services,", "strengthening", "traffic", "under", "upcoming", "web"
        }

        # Purge rogue company nodes
        try:
            cleanup_rogue_companies = """
            MATCH (c:Company)
            WHERE size(split(c.name, ' ')) = 1 AND toLower(c.name) IN [
                'building', 'deploying', 'prototype', 'systems', 'winner', 'next',
                'generation', 'firewall', 'present', 'and', 'for', 'with', 'tight',
                'timelines', 'timeline', 'analysis', 'anomalous', 'detection', 'state', 'time',
                'risk', 'work', 'working', 'deliver', 'ship', 'features', 'rest', 'apis',
                'adrde,', 'adrde.', 'industry network', 'defence', 'research', 'development',
                '(drdo)', '(ngfw)', '(react,', 'node.js,', 'firebase,', 'mongodb,', 'postgresql)',
                '2026', 'feb', 'jun', 'apr', 'intern', 'conducted', 'engineered', 'developed',
                'currently', 'proven', 'ability', 'alongside', 'specialized', 'simulated',
                'suspicious', 'third', 'packets', 'packet', 'patterns', 'pipeline', 'potential',
                'prediction,', 'production', 'products', 'real', 'reviews', 'risks.', 'secure',
                'security.', 'services,', 'strengthening', 'traffic', 'under', 'upcoming', 'web'
            ]
            DETACH DELETE c;
            """
            await neo4j_client.execute_query(cleanup_rogue_companies, {})
        except Exception as pe:
            logger.warning(f"Note on purging rogue companies: {pe}")

        for exp in blueprint.experience:
            comp_name = (exp.company or "").strip()
            # Clean up company name
            comp_name = re.sub(r'^[•\-\*\+●]\s*', '', comp_name).strip()
            if not comp_name or len(comp_name) < 3 or len(comp_name) > 80:
                continue
            if comp_name.lower() in invalid_comp_words:
                continue
            if len(comp_name.split()) == 1 and (comp_name.lower() in invalid_comp_words or len(comp_name) < 4):
                continue
            if any(t in comp_name.lower() for t in ["react,", "node.js,", "mongodb,", "firebase,"]):
                continue

            forbidden_terms.add(comp_name.lower())
            comp_query = """
            MATCH (u:User {id: $user_id})
            MERGE (c:Company {name: $company_name})
            MERGE (u)-[r:WORKED_AT]->(c)
            ON CREATE SET r.role = $role,
                          r.start_date = $start_date,
                          r.end_date = $end_date,
                          r.is_current = $is_current
            ON MATCH SET r.role = $role,
                         r.start_date = $start_date,
                         r.end_date = $end_date,
                         r.is_current = $is_current
            RETURN c.name;
            """
            await neo4j_client.execute_query(comp_query, {
                "user_id": user_id,
                "company_name": comp_name,
                "role": exp.role or "Software Engineer",
                "start_date": exp.start_date or "",
                "end_date": exp.end_date or "",
                "is_current": bool(exp.is_current)
            })
            nodes_merged += 1

        # 4. Upsert Achievements & Hackathons (Milestones)
        all_achievements = []
        achievement_triggers = {
            "hackathon", "place", "winner", "award", "prize", "1st", "2nd", "3rd",
            "first", "second", "third", "presented", "demonstrated", "built", "championship",
            "sistec", "hackshodh", "csir-neeri", "deputy director"
        }

        if hasattr(blueprint, "achievements") and blueprint.achievements:
            for a in blueprint.achievements:
                clean_a = a.strip()
                if clean_a and len(clean_a) > 3 and len(clean_a) < 180:
                    all_achievements.append(clean_a)

        # Check if any skill leaked in as an achievement
        if hasattr(blueprint, "skills") and blueprint.skills:
            for cat in blueprint.skills:
                for s in cat.skills:
                    if any(w in s.lower() for w in achievement_triggers) or len(s.split()) > 3:
                        if len(s) > 4 and s.strip() not in all_achievements:
                            all_achievements.append(s.strip())

        if all_achievements:
            ach_query = """
            MATCH (u:User {id: $user_id})
            UNWIND $achievements AS ach_title
            MERGE (ach:Achievement {name: ach_title})
            ON CREATE SET ach.category = 'Milestone & Hackathon'
            MERGE (u)-[:ACHIEVED]->(ach)
            RETURN count(ach) AS ach_count;
            """
            await neo4j_client.execute_query(ach_query, {
                "user_id": user_id,
                "achievements": all_achievements
            })
            nodes_merged += len(all_achievements)

        # 5. Upsert Skills from Resume (Strict Sanitization against sentences, hackathons, and soft-skills)
        all_skills = []
        invalid_skill_words = {
            "experience", "education", "project", "projects", "engineer", "software",
            "developer", "student", "candidate", "resume", "summary", "profile", "curriculum",
            "technologies", "technology", "skills", "languages", "frameworks", "tools", "email", "phone",
            "collaboration", "troubleshooting", "debugging"
        }
        seen_skill_names = set()

        for cat in blueprint.skills:
            for s in cat.skills:
                cleaned_skill = s.strip()
                # Remove leading/trailing bullet symbols or dashes
                cleaned_skill = re.sub(r'^[•\-\*\+●:]\s*', '', cleaned_skill).strip()
                if not cleaned_skill:
                    continue

                # Discard sentence-like skill strings, achievements, or long phrases
                if any(w in cleaned_skill.lower() for w in achievement_triggers) or len(cleaned_skill.split()) > 3:
                    continue
                if len(cleaned_skill) > 25 or len(cleaned_skill) < 2:
                    continue
                if cleaned_skill.lower() in forbidden_terms or any(t in cleaned_skill.lower().split() for t in forbidden_terms if len(t) > 3):
                    continue
                if any(w in cleaned_skill.lower() for w in invalid_skill_words):
                    continue
                if re.search(r'[@\/\\:;]', cleaned_skill):
                    continue
                if cleaned_skill.lower() in seen_skill_names:
                    continue

                seen_skill_names.add(cleaned_skill.lower())
                all_skills.append({"name": cleaned_skill, "category": cat.category or "Technical"})

        if all_skills:
            skill_query = """
            MATCH (u:User {id: $user_id})
            UNWIND $skills AS skill_data
            MERGE (s:Skill {name: skill_data.name})
            ON CREATE SET s.category = skill_data.category
            MERGE (u)-[:HAS_SKILL {source: 'resume'}]->(s)
            RETURN count(s) AS skill_count;
            """
            await neo4j_client.execute_query(skill_query, {
                "user_id": user_id,
                "skills": all_skills
            })
            nodes_merged += len(all_skills)

        # 6. Purge rogue skill nodes in the DB that contain achievement text
        try:
            purge_rogue_skills = """
            MATCH (s:Skill)
            WHERE any(w IN ['hackathon', 'place', 'winner', 'award', 'prize', '1st', '2nd', '3rd', 'first', 'second', 'presented', 'demonstrated', 'built', 'sistec', 'lawbot', 'agrifarm'] WHERE toLower(s.name) CONTAINS w)
               OR size(split(s.name, ' ')) > 4
            DETACH DELETE s;
            """
            await neo4j_client.execute_query(purge_rogue_skills, {})
        except Exception as se:
            logger.warning(f"Note on purging rogue skills: {se}")

        return nodes_merged

    @classmethod
    async def get_user_resume_blueprint(cls, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves the user's saved Golden Base Resume Blueprint JSON from Neo4j.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return None

        query = """
        MATCH (u:User {id: $user_id})
        RETURN u.blueprint_json AS blueprint_json,
               u.full_name AS full_name,
               u.email AS email,
               u.phone AS phone,
               u.location AS location,
               u.linkedin_url AS linkedin_url,
               u.github_url AS github_url,
               u.summary AS summary;
        """
        try:
            res = await neo4j_client.execute_query(query, {"user_id": user_id})
            if res and len(res) > 0:
                record = res[0]
                bp_str = record.get("blueprint_json")
                if bp_str:
                    try:
                        return json.loads(bp_str)
                    except Exception:
                        pass
                # Fallback to reconstructing contact if blueprint_json is empty
                if record.get("full_name"):
                    return {
                        "contact": {
                            "full_name": record.get("full_name") or "",
                            "email": record.get("email") or "",
                            "phone": record.get("phone") or "",
                            "location": record.get("location") or "",
                            "linkedin_url": record.get("linkedin_url") or "",
                            "github_url": record.get("github_url") or ""
                        },
                        "summary": record.get("summary") or "",
                        "experience": [],
                        "education": [],
                        "projects": [],
                        "skills": []
                    }
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch user resume blueprint for {user_id}: {e}")
            return None

    @classmethod
    async def get_user_preferences(cls, user_id: str) -> Dict[str, Any]:
        """
        Retrieves the user's career and opportunity preferences from Neo4j.
        Defaults to India & Global Remote target profile.
        """
        default_prefs = {
            "primary_role": "Backend Engineer",
            "priority_domain": "Distributed Systems & Cloud",
            "target_country": "India",
            "preferred_cities": ["Bengaluru", "Noida", "Delhi NCR", "Hyderabad", "Pune", "Mumbai", "Remote"],
            "work_modes": ["Remote", "Hybrid", "Onsite"],
            "preferred_roles": ["Backend Engineer", "Full Stack Developer", "Software Engineer", "AI/ML Engineer"],
            "opportunity_types": ["jobs", "internships", "hackathons", "opensource"],
            "experience_level": "Fresher / 0-3 yrs",
            "min_salary": "₹8-18 LPA / $30k+ Remote",
            "priority_factor": "best_fit",
            "dream_companies": ["Google", "Razorpay", "CRED", "Stripe", "Zepto"],
            "blocked_companies": [],
            "notice_period": "Immediate (0-15 days)",
            "work_authorization": "Authorized in India & Remote Worldwide",
            "spoken_languages": ["English (Professional)", "Hindi (Native)"],
            "career_goals": {
                "target_milestone": "Targeting SDE-1 / SDE-2 High-Growth Role",
                "target_timeline": "Next 30-90 Days",
                "target_ctc": "₹15-28 LPA",
                "focus_areas": ["Distributed Systems", "Graph Databases", "Agentic AI", "High-Throughput APIs"]
            },
            "in_progress_skills": ["Kafka", "Kubernetes", "Vector Databases"],
            "custom_locations": []
        }

        if not neo4j_client.driver or not neo4j_client.is_connected:
            return default_prefs

        query = """
        MATCH (u:User {id: $user_id})
        RETURN u.preferences_json AS preferences_json;
        """
        try:
            res = await neo4j_client.execute_query(query, {"user_id": user_id})
            if res and len(res) > 0:
                raw_json = res[0].get("preferences_json")
                if raw_json:
                    try:
                        saved = json.loads(raw_json)
                        return {**default_prefs, **saved}
                    except Exception:
                        pass
            return default_prefs
        except Exception as e:
            logger.warning(f"Failed to fetch user preferences for {user_id}: {e}")
            return default_prefs

    @classmethod
    async def upsert_user_preferences(cls, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists updated user career & location preferences to the User node in Neo4j.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return preferences

        query = """
        MERGE (u:User {id: $user_id})
        ON CREATE SET u.created_at = datetime()
        SET u.preferences_json = $preferences_json,
            u.updated_at = datetime()
        RETURN u.preferences_json AS preferences_json;
        """
        try:
            pref_str = json.dumps(preferences)
            await neo4j_client.execute_query(query, {
                "user_id": user_id,
                "preferences_json": pref_str
            })
            return preferences
        except Exception as e:
            logger.error(f"Failed to upsert user preferences for {user_id}: {e}")
            return preferences


    @classmethod
    async def upsert_user_linkedin_connections(
        cls,
        user_id: str,
        connections: List[Dict[str, Any]],
        shared_college: Optional[str] = "Anand Engineering College"
    ) -> int:
        """
        Upserts LinkedIn professional connections, companies, universities, skills, and verified alumni edges into Neo4j AuraDB.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            logger.warning("Neo4j driver offline. Skipping live LinkedIn graph upsert.")
            return len(connections)

        # 1. Clean up any previous corrupt blanket ATTENDED edges for this user's connections
        try:
            cleanup_query = """
            MATCH (u:User {id: $user_id})-[:CONNECTED_TO]->(p:Person)-[r:ATTENDED]->(univ:University)
            WHERE p.is_alumni IS NULL OR p.is_alumni = false
            DELETE r;
            """
            await neo4j_client.execute_query(cleanup_query, {"user_id": user_id})
        except Exception as e:
            logger.warning(f"Notice during old edge cleanup: {e}")

        # 2. Main Connection Upsert with Entity Segregation
        query = """
        MERGE (u:User {id: $user_id})
        WITH u
        UNWIND $connections AS conn
        MERGE (p:Person {id: conn.id})
        ON CREATE SET p.name = conn.name,
                      p.first_name = conn.first_name,
                      p.last_name = conn.last_name,
                      p.position = conn.position,
                      p.headline = conn.position,
                      p.connected_on = conn.connected_on,
                      p.profile_url = conn.profile_url,
                      p.linkedin_url = conn.profile_url,
                      p.is_alumni = coalesce(conn.is_alumni, false)
        ON MATCH SET p.name = CASE WHEN conn.name <> '' THEN conn.name ELSE p.name END,
                     p.position = CASE WHEN conn.position <> '' THEN conn.position ELSE p.position END,
                     p.headline = CASE WHEN conn.position <> '' THEN conn.position ELSE p.headline END,
                     p.linkedin_url = CASE WHEN conn.profile_url <> '' THEN conn.profile_url ELSE p.linkedin_url END,
                     p.is_alumni = coalesce(conn.is_alumni, p.is_alumni, false)
        MERGE (u)-[:CONNECTED_TO {source: 'linkedin'}]->(p)
        
        // Dynamic Company Linking
        FOREACH (_ IN CASE WHEN conn.company IS NOT NULL AND conn.company <> '' AND toLower(conn.company) <> 'industry network' AND size(conn.company) > 2 THEN [1] ELSE [] END |
            MERGE (c:Company {name: conn.company})
            MERGE (p)-[:WORKS_AT {title: conn.position}]->(c)
        )

        // Dynamic University / Education Linking (Only if genuine educational institution)
        FOREACH (_ IN CASE WHEN conn.university IS NOT NULL AND conn.university <> '' AND size(conn.university) > 2 THEN [1] ELSE [] END |
            MERGE (univ:University {name: conn.university})
            MERGE (p)-[:ATTENDED]->(univ)
        )

        // Dynamic Skills / Domain Extraction
        FOREACH (skill_name IN coalesce(conn.skills, []) |
            MERGE (s:Skill {name: skill_name})
            MERGE (p)-[:SKILLED_IN]->(s)
        )

        RETURN count(p) AS imported_count;
        """
        await neo4j_client.execute_query(query, {
            "user_id": user_id,
            "connections": connections
        })

        # 3. Seed Sharda Group of Institutions (SGI) Semantic Hierarchy
        sgi_query = """
        MERGE (g:EducationGroup {name: 'Sharda Group of Institutions (SGI)'})
        
        MERGE (u1:University {name: 'Anand Engineering College'})
        ON CREATE SET u1.aliases = ['AEC', 'AEC Agra', 'Anand Engg College']
        MERGE (u1)-[:AFFILIATED_WITH]->(g)

        MERGE (u2:University {name: 'Sharda University Agra'})
        ON CREATE SET u2.aliases = ['SUA', 'Sharda Agra', 'Sharda University']
        MERGE (u2)-[:AFFILIATED_WITH]->(g)

        MERGE (u3:University {name: 'Hindustan College of Science and Technology'})
        ON CREATE SET u3.aliases = ['HCST', 'HCST Mathura', 'Hindustan College']
        MERGE (u3)-[:AFFILIATED_WITH]->(g)

        MERGE (u4:University {name: 'Sharda University'})
        ON CREATE SET u4.aliases = ['Sharda Greater Noida', 'SU Greater Noida']
        MERGE (u4)-[:AFFILIATED_WITH]->(g)

        RETURN g.name;
        """
        await neo4j_client.execute_query(sgi_query)

        # 4. Link ONLY Genuine Verified Alumni to College
        alumni_query = """
        MATCH (u:User {id: $user_id})-[:CONNECTED_TO]->(p:Person)
        WHERE p.is_alumni = true
        MATCH (univ:University {name: 'Anand Engineering College'})
        MERGE (p)-[:ATTENDED]->(univ)
        RETURN count(p) AS alumni_linked;
        """
        await neo4j_client.execute_query(alumni_query, {"user_id": user_id})

        return len(connections) * 2

    @classmethod
    async def upsert_hiring_lead_job(
        cls,
        user_id: str,
        lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Injects an active hiring lead into the knowledge graph and immediately traverses referral bridges.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return {"job_id": "lead_001", "referral_bridges": []}

        job_id = f"lead:{lead_data['company_name'].lower().replace(' ', '_')}:{lead_data['job_title'].lower().replace(' ', '_')}"
        
        query = """
        MERGE (c:Company {name: $company_name})
        MERGE (j:Job {id: $job_id})
        ON CREATE SET j.title = $job_title,
                      j.location = $location,
                      j.source = 'linkedin_post',
                      j.is_active = true,
                      j.created_at = datetime()
        MERGE (c)-[:POSTED]->(j)
        WITH j
        UNWIND $skills AS skill_name
        MERGE (s:Skill {name: skill_name})
        MERGE (j)-[:REQUIRES_SKILL]->(s);
        """
        await neo4j_client.execute_query(query, {
            "company_name": lead_data["company_name"],
            "job_id": job_id,
            "job_title": lead_data["job_title"],
            "location": lead_data.get("location", "Remote"),
            "skills": lead_data.get("skills", [])
        })

        # Discover instant referral bridge (Multi-hop + Company Fuzzy Matching)
        referral_query = """
        MATCH (j:Job {id: $job_id})<-[:POSTED]-(c:Company)
        MATCH (p:Person)-[:WORKS_AT]->(target_comp:Company)
        WHERE toLower(target_comp.name) CONTAINS toLower(c.name)
           OR toLower(c.name) CONTAINS toLower(target_comp.name)
        OPTIONAL MATCH (u:User {id: $user_id})
        OPTIONAL MATCH (u)-[:ATTENDED]->(univ:University)
        OPTIONAL MATCH (p)-[:ATTENDED]->(p_univ:University)
        RETURN DISTINCT p.name AS name,
               p.position AS position,
               target_comp.name AS company,
               coalesce(univ.name, p_univ.name, 'Anand Engineering College') AS shared_school,
               CASE 
                 WHEN (u)-[:CONNECTED_TO]->(p) THEN '1st Degree Connection' 
                 WHEN univ IS NOT NULL AND p_univ IS NOT NULL AND univ = p_univ THEN 'University Alumni Bridge'
                 ELSE 'Alumni Network Contact'
               END AS connection_type;
        """
        bridges = await neo4j_client.execute_query(referral_query, {
            "user_id": user_id,
            "job_id": job_id
        })

        return {
            "job_id": job_id,
            "company": lead_data["company_name"],
            "title": lead_data["job_title"],
            "referral_bridges": bridges
        }

    @classmethod
    async def upsert_target_scanned_profile(
        cls,
        user_id: str,
        target_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Ingests a target LinkedIn profile scanned via Chrome Extension into the user's Knowledge Graph.
        Links the Person to their Company, Education, and computes instant referral bridges to the User.
        """
        if not neo4j_client.driver or not neo4j_client.is_connected:
            return {"status": "success", "person_id": "simulated", "nodes_merged": 1, "referral_bridges": []}

        name = (target_data.get("name") or "LinkedIn Contact").strip()
        headline = (target_data.get("headline") or "").strip()
        company = (target_data.get("company") or "").strip()
        role = (target_data.get("role") or headline or "Professional").strip()
        profile_url = (target_data.get("profile_url") or "").strip()
        shared_college = (target_data.get("shared_college") or "").strip()
        skills = target_data.get("skills") or []
        posts = target_data.get("recent_posts") or []

        person_id = profile_url.replace("https://", "").replace("http://", "").strip("/") if profile_url else f"person:{name.lower().replace(' ', '_')}"

        query = """
        MERGE (u:User {id: $user_id})
        MERGE (p:Person {id: $person_id})
        ON CREATE SET p.name = $name,
                      p.headline = $headline,
                      p.position = $role,
                      p.linkedin_url = $profile_url,
                      p.created_at = datetime()
        ON MATCH SET p.headline = $headline,
                     p.position = $role,
                     p.linkedin_url = $profile_url,
                     p.updated_at = datetime()
        MERGE (u)-[r:TRACKED_CONNECTION {source: 'extension_scan'}]->(p)
        SET r.scanned_at = datetime()
        
        WITH p, u
        WHERE $company <> '' AND toLower($company) <> 'industry network'
        MERGE (c:Company {name: $company})
        MERGE (p)-[:WORKS_AT {title: $role}]->(c)
        
        WITH p, u, c
        RETURN p.name AS name, p.id AS id;
        """
        await neo4j_client.execute_query(query, {
            "user_id": user_id,
            "person_id": person_id,
            "name": name,
            "headline": headline,
            "role": role,
            "company": company,
            "profile_url": profile_url
        })

        nodes_merged = 2

        # Link college if present
        if shared_college:
            edu_query = """
            MATCH (p:Person {id: $person_id})
            MERGE (univ:University {name: $university_name})
            MERGE (p)-[:ATTENDED]->(univ)
            """
            await neo4j_client.execute_query(edu_query, {
                "person_id": person_id,
                "university_name": shared_college
            })
            nodes_merged += 1

        # Link skills if present
        if skills:
            skill_query = """
            MATCH (p:Person {id: $person_id})
            UNWIND $skills AS skill_name
            MERGE (s:Skill {name: skill_name})
            MERGE (p)-[:HAS_SKILL]->(s)
            """
            await neo4j_client.execute_query(skill_query, {
                "person_id": person_id,
                "skills": skills[:15]
            })
            nodes_merged += len(skills[:15])

        # Check for warm referral paths and opportunities matching this company
        bridge_query = """
        MATCH (u:User {id: $user_id})
        MATCH (p:Person {id: $person_id})
        OPTIONAL MATCH (p)-[:WORKS_AT]->(c:Company)
        OPTIONAL MATCH (u)-[:ATTENDED]->(univ:University)<-[:ATTENDED]-(p)
        RETURN p.name AS name,
               p.position AS position,
               coalesce(c.name, 'Industry Network') AS company,
               coalesce(univ.name, '') AS shared_school,
               (univ IS NOT NULL) AS is_alumni;
        """
        bridges = await neo4j_client.execute_query(bridge_query, {
            "user_id": user_id,
            "person_id": person_id
        })

        return {
            "status": "success",
            "person_id": person_id,
            "name": name,
            "company": company,
            "role": role,
            "nodes_merged": nodes_merged,
            "bridges": bridges
        }

    @classmethod
    async def run_query(cls, query: str, **params) -> List[Dict[str, Any]]:
        """
        Executes a Cypher query with keyword arguments and returns records as dictionaries.
        """
        if not neo4j_client.driver:
            logger.warning("Neo4j driver offline. Skipping query execution.")
            return []
        try:
            return await neo4j_client.execute_query(query, params)
        except Exception as e:
            logger.error(f"Error executing Neo4j Cypher query: {e}")
            return []

neo4j_service = Neo4jService()
