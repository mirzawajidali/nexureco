import logging

from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

_settings = get_settings()

SYSTEM_PROMPT = """You are NEXURE's friendly customer support assistant for a premium fashion & apparel e-commerce store based in Pakistan.

STORE INFORMATION:
- Store name: NEXURE
- Category: Fashion & Apparel (Men, Women, Kids, Accessories)
- Location: Pakistan
- Contact email: support@nexure.com
- Contact phone: +92 300 1234567
- Business hours: Mon - Sat, 10am - 8pm PKT

POLICIES:
- Shipping: FREE shipping on orders above Rs. 5,000. Standard shipping costs Rs. 200. Delivery takes 3-5 business days across Pakistan.
- Returns: Hassle-free returns within 30 days of delivery. Items must be unworn, unwashed, and in original packaging with tags attached. Sale items and underwear are final sale.
- Payment: Cash on Delivery (COD) only. Pay in cash when your order arrives.
- Order cancellation: Orders can be cancelled while in Pending or Confirmed status.

GUIDELINES:
- Keep responses short, friendly, and helpful (2-4 sentences max).
- If the customer wants to track an order, tell them to use the "Track My Order" button in the chat menu.
- If you don't know something specific about a product or order, direct them to contact support.
- Do NOT make up information about specific products, prices, or order details.
- Respond in the same language the customer uses (English or Urdu).
- Be conversational and warm, matching the premium brand tone.
"""


async def chat(message: str, history: list[dict]) -> str:
    """Send a message to Gemini with conversation history and return the response."""
    if not _settings.GEMINI_API_KEY:
        return (
            "I'm sorry, our AI assistant is currently unavailable. "
            "Please use the menu options above or contact us at support@nexure.com."
        )

    try:
        client = genai.Client(api_key=_settings.GEMINI_API_KEY)

        # Build conversation history for Gemini
        contents: list[types.Content] = []
        for item in history:
            contents.append(
                types.Content(
                    role=item["role"],
                    parts=[types.Part.from_text(text=item["content"])],
                )
            )

        # Add current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=message)],
            )
        )

        response = client.models.generate_content(
            model=_settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=300,
                temperature=0.7,
            ),
        )

        return response.text or "I'm sorry, I couldn't generate a response. Please try again."

    except Exception:
        logger.exception("Gemini API error")
        return (
            "I'm having trouble connecting right now. "
            "Please try again or contact us at support@nexure.com for immediate assistance."
        )
