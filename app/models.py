from pydantic import BaseModel, Field, field_validator


class ActiveFilters(BaseModel):
    brands: list[str] = Field(default_factory=list)
    price_min: float | None = None
    price_max: float | None = None


class ProductContext(BaseModel):
    id: str
    brand: str
    price: str = ""
    compatible_vehicles: str = ""
    product_description: str = ""
    features_benefits: str = ""


class ChatRequest(BaseModel):
    session_id: str
    message: str
    filters: ActiveFilters | None = None
    product_context: ProductContext | None = None


class ChatResponse(BaseModel):
    session_id: str
    response: str
    needs_clarification: bool = False
    is_final_answer: bool = False
    is_chitchat: bool = False
    recommended_product_ids: list[str] = Field(default_factory=list)


class TyreProduct(BaseModel):
    id: str
    brand: str  # full product name, e.g. "Apollo Amazer 4G Life 165 80 R 14 …"
    image: str = ""
    compatible_vehicles: list[str] = Field(default_factory=list)
    price: float = 0.0
    product_description: str = ""
    features_benefits: list[str] = Field(default_factory=list)
    vehicle_models: list[str] = Field(default_factory=list)

    @field_validator("price", mode="before")
    @classmethod
    def _parse_price(cls, v: object) -> float:
        if isinstance(v, str):
            return float(v.replace(",", "").strip() or "0")
        return float(v)

    @field_validator("compatible_vehicles", "vehicle_models", mode="before")
    @classmethod
    def _split_csv(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v  # type: ignore[return-value]

    @field_validator("features_benefits", mode="before")
    @classmethod
    def _split_features(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [s.strip() for s in v.split(".,") if s.strip()]
        return v  # type: ignore[return-value]

    def to_search_text(self) -> str:
        vehicles = ", ".join(self.compatible_vehicles)
        features = ". ".join(self.features_benefits[:3])
        return (
            f"{self.brand} — ${self.price:,.2f}. "
            f"{self.product_description[:200]} "
            f"Features: {features}. "
            f"Compatible vehicles: {vehicles}"
        )

    @classmethod
    def from_raw(cls, raw: dict) -> "TyreProduct":
        """Create a TyreProduct from the raw JSON keys (title-cased)."""
        return cls(
            id=raw["id"],
            brand=raw.get("Brand", ""),
            image=raw.get("Image", ""),
            compatible_vehicles=raw.get("Compatible Vehicles", ""),
            price=raw.get("Price", 0),
            product_description=raw.get("Product Description", ""),
            features_benefits=raw.get("Features & Benefits", ""),
            vehicle_models=raw.get("Vehicle Models", ""),
        )
