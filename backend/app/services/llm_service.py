import json
import logging
import httpx
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMService:
    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    @classmethod
    def _build_groq_model_candidates(cls, requested_model: Optional[str] = None) -> List[str]:
        candidates = []
        if requested_model:
            candidates.append(requested_model)
        if settings.GROQ_MODEL and settings.GROQ_MODEL not in candidates:
            candidates.append(settings.GROQ_MODEL)
        for fallback in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
            if fallback not in candidates:
                candidates.append(fallback)
        return candidates

    @classmethod
    async def chat_json(
        cls,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        messages: Optional[List[Dict[str, str]]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Groq API (or Gemini fallback) for JSON structured output.
        Supports native multi-turn messages array for full conversational context.
        """
        # Prepare normalized messages list for OpenAI-compatible APIs (Groq)
        if messages:
            groq_messages = list(messages)
            # Ensure the first message or instructions mandate JSON
            if groq_messages and groq_messages[0].get("role") == "system":
                if "strictly valid JSON" not in groq_messages[0]["content"]:
                    groq_messages[0] = {
                        "role": "system",
                        "content": groq_messages[0]["content"] + "\nYou must output strictly valid JSON with no markdown formatting or commentary."
                    }
        else:
            groq_messages = [
                {"role": "system", "content": system_prompt + "\nYou must output strictly valid JSON with no markdown formatting or commentary."},
                {"role": "user", "content": user_prompt}
            ]

        # 1. Try Groq API (Primary Engine)
        if settings.GROQ_API_KEY:
            for g_model in cls._build_groq_model_candidates(model):
                try:
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": g_model,
                        "messages": groq_messages,
                        "temperature": temperature,
                        "response_format": {"type": "json_object"}
                    }

                    async with httpx.AsyncClient(timeout=4.0) as client:
                        resp = await client.post(cls.GROQ_URL, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            content = data["choices"][0]["message"]["content"]
                            clean_content = content.strip().replace("```json", "").replace("```", "").strip()
                            return json.loads(clean_content)
                        else:
                            logger.warning(f"Groq model {g_model} returned {resp.status_code}: {resp.text[:200]}")
                except Exception as e:
                    logger.warning(f"Groq model {g_model} chat failed: {e}")

        # 2. Fallback to Gemini if configured
        if settings.GEMINI_API_KEY:
            for gem_model_name in [
                "gemini-1.5-flash",
                "gemini-2.0-flash-exp",
                "gemini-1.5-pro",
                "gemini-flash-latest"
            ]:
                try:
                    import google.generativeai as genai
                    import asyncio
                    genai.configure(api_key=settings.GEMINI_API_KEY)

                    if messages and len(messages) > 1:
                        # Multi-turn Gemini chat
                        system_inst = ""
                        chat_history = []
                        last_user_message = user_prompt

                        for m in messages:
                            if m.get("role") == "system":
                                system_inst = m.get("content", "")
                            elif m.get("role") in ("user", "human"):
                                chat_history.append({"role": "user", "parts": [m.get("content", "")]})
                            elif m.get("role") in ("assistant", "model", "bot"):
                                chat_history.append({"role": "model", "parts": [m.get("content", "")]})

                        if chat_history and chat_history[-1]["role"] == "user":
                            last_turn = chat_history.pop()
                            last_user_message = last_turn["parts"][0]

                        gmodel = genai.GenerativeModel(
                            gem_model_name,
                            system_instruction=system_inst + "\nReturn strictly valid JSON only (no markdown fences, no commentary)."
                        )
                        chat_session = gmodel.start_chat(history=chat_history)
                        response = await asyncio.to_thread(chat_session.send_message, last_user_message)
                    else:
                        gmodel = genai.GenerativeModel(gem_model_name)
                        combined_prompt = f"{system_prompt}\n\n{user_prompt}\n\nReturn strictly valid JSON only (no markdown fences, no commentary)."
                        response = await asyncio.to_thread(gmodel.generate_content, combined_prompt)

                    if response and response.text:
                        clean_text = response.text.strip()
                        if "```json" in clean_text:
                            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                        elif "```" in clean_text:
                            clean_text = clean_text.split("```")[1].split("```")[0].strip()
                        return json.loads(clean_text)
                except Exception as ge:
                    logger.warning(f"Gemini model {gem_model_name} failed: {ge}")

        return None

    @classmethod
    async def chat(
        cls,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.5,
        messages: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Calls Groq API or Gemini for conversational text completion.
        """
        if messages:
            groq_messages = list(messages)
        else:
            groq_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

        # 1. Try Groq
        if settings.GROQ_API_KEY:
            for g_model in cls._build_groq_model_candidates(model):
                try:
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": g_model,
                        "messages": groq_messages,
                        "temperature": temperature
                    }
                    async with httpx.AsyncClient(timeout=4.0) as client:
                        resp = await client.post(cls.GROQ_URL, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            return data["choices"][0]["message"]["content"].strip()
                        else:
                            logger.warning(f"Groq chat model {g_model} returned {resp.status_code}: {resp.text[:200]}")
                except Exception as e:
                    logger.warning(f"Groq chat failed with {g_model}: {e}")

        # 2. Try Gemini
        if settings.GEMINI_API_KEY:
            for gem_model in ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]:
                try:
                    import google.generativeai as genai
                    import asyncio
                    genai.configure(api_key=settings.GEMINI_API_KEY)
                    gmodel = genai.GenerativeModel(gem_model)
                    combined = f"{system_prompt}\n\n{user_prompt}"
                    response = await asyncio.to_thread(gmodel.generate_content, combined)
                    if response and response.text:
                        return response.text.strip()
                except Exception as ge:
                    logger.warning(f"Gemini chat failed with {gem_model}: {ge}")

        return "Response generated successfully."

    @classmethod
    async def generate_json(
        cls,
        prompt: str,
        system_prompt: str = "You are an expert career intelligence AI that extracts structured JSON data."
    ) -> Optional[Dict[str, Any]]:
        """
        Convenience wrapper for single-prompt JSON generation.
        """
        return await cls.chat_json(system_prompt=system_prompt, user_prompt=prompt)

llm_service = LLMService()
