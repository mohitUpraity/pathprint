from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ContactInfo(BaseModel):
    full_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    github_url: Optional[str] = ""
    portfolio_url: Optional[str] = ""

class ExperienceEntry(BaseModel):
    company: str
    role: str
    location: Optional[str] = ""
    start_date: Optional[str] = ""
    end_date: Optional[str] = "Present"
    is_current: bool = False
    bullets: List[str] = []

class EducationEntry(BaseModel):
    university: str
    degree: str
    field_of_study: Optional[str] = ""
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    gpa: Optional[str] = ""

class ProjectEntry(BaseModel):
    name: str
    tech_stack: Optional[str] = ""
    repo_url: Optional[str] = ""
    live_url: Optional[str] = ""
    bullets: List[str] = []

class SkillCategory(BaseModel):
    category: str = Field(..., description="Languages, Frameworks, Databases, Cloud & DevOps, AI/ML, Tools")
    skills: List[str] = []

class ResumeBlueprint(BaseModel):
    contact: ContactInfo
    summary: Optional[str] = ""
    experience: List[ExperienceEntry] = []
    education: List[EducationEntry] = []
    projects: List[ProjectEntry] = []
    skills: List[SkillCategory] = []
    certifications: List[str] = []
    achievements: List[str] = []
    raw_text: Optional[str] = ""

class ResumeIngestResponse(BaseModel):
    status: str
    user_id: str
    blueprint: ResumeBlueprint
    total_skills_extracted: int
    universities_mapped: List[str]
    companies_mapped: List[str]
    graph_nodes_merged: int
