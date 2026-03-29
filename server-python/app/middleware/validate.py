from fastapi import Request, HTTPException
from pydantic import BaseModel


def validate_body(schema: type[BaseModel]):
    """Decorator to validate request body using a Pydantic schema."""

    async def validate(request: Request):
        try:
            body = await request.json()
            schema.model_validate(body)
            return body
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    return validate
