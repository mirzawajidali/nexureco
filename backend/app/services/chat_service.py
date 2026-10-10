import logging

from google import genai
from google.genai import types

from app.config import get_settings
from app.core.store import (
    FREE_SHIPPING_THRESHOLD,
    RETURN_WINDOW_DAYS,
    STANDARD_SHIPPING_COST,
    STORE_PHONE,
    format_price,
)

logger = logging.getLogger(__name__)

_settings = get_settings()

SYSTEM_PROMPT = f"""You are NEXURE's friendly customer support assistant for a premium fashion & apparel e-commerce store based in Pakistan.

STORE INFORMATION:
- Store name: NEXURE
- Category: Fashion & Apparel (Men, Women, Kids, Accessories)
- Location: Pakistan
- Contact email: support@nexureco.com
- Contact phone: {STORE_PHONE}
- Business hours: Mon - Sat, 10am - 8pm PKT

POLICIES:
- Shipping: FREE shipping on orders of {format_price(FREE_SHIPPING_THRESHOLD)} or more. Standard shipping costs {format_price(STANDARD_SHIPPING_COST)}. Delivery takes 3-5 business days across Pakistan.
- Returns: Returns and exchanges within {RETURN_WINDOW_DAYS} days of delivery. Items must be unworn, unwashed, and in original packaging. Refunds are processed within 5-7 business days. Exchanges for a different size or colour are subject to availability.
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
            "Please use the menu options above or contact us at support@nexureco.com."
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
            "Please try again or contact us at support@nexureco.com for immediate assistance."
        )
