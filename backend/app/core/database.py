import logging
from typing import Optional
from neo4j import AsyncGraphDatabase, AsyncDriver
from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self):
        self.driver: Optional[AsyncDriver] = None
        self.is_connected: bool = False

    async def connect(self):
        if not settings.NEO4J_URI:
            logger.info("No NEO4J_URI provided. Skipping Neo4j connection.")
            return

        try:
            self.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
            # Verify connectivity
            await self.driver.verify_connectivity()
            self.is_connected = True
            logger.info("Successfully connected to Neo4j database.")
            await self.init_schema()
        except Exception as e:
            self.is_connected = False
            logger.warning(f"Neo4j connection offline or waiting for cloud credentials ({e}). Operating in graceful fallback mode.")

    async def close(self):
        if self.driver:
            await self.driver.close()
            self.is_connected = False
            logger.info("Neo4j driver closed.")

    async def init_schema(self):
        """Creates uniqueness constraints and performance indexes."""
        if not self.driver or not self.is_connected:
            return

        constraints = [
            "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT company_name_unique IF NOT EXISTS FOR (c:Company) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT university_name_unique IF NOT EXISTS FOR (u:University) REQUIRE u.name IS UNIQUE",
            "CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE",
            "CREATE CONSTRAINT opportunity_id_unique IF NOT EXISTS FOR (o:Opportunity) REQUIRE o.id IS UNIQUE",
            "CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
            "CREATE INDEX job_active_index IF NOT EXISTS FOR (j:Job) ON (j.is_active)",
            "CREATE INDEX opp_active_index IF NOT EXISTS FOR (o:Opportunity) ON (o.is_active)",
            "CREATE INDEX skill_category_index IF NOT EXISTS FOR (s:Skill) ON (s.category)"
        ]

        async with self.driver.session(database=settings.NEO4J_DATABASE) as session:
            for query in constraints:
                try:
                    await session.run(query)
                except Exception as e:
                    logger.debug(f"Schema query info: {e}")
        logger.info("Neo4j schema constraints and indexes verified.")

    async def execute_query(self, query: str, parameters: dict = None):
        if not self.driver or not self.is_connected:
            logger.debug(f"Neo4j offline. Query skipped: {query[:40]}...")
            return []
        async with self.driver.session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, parameters or {})
            records = [record.data() async for record in result]
            return records

neo4j_client = Neo4jClient()
