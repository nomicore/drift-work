from pydantic import BaseModel, Field, field_validator


class ActiveFilters(BaseModel):
    brands: list[str] = Field(default_factory=list)
    price_min: float | None = None
    price_max: float | None = None
    sizes: list[str] = Field(default_factory=list)
    widths: list[str] = Field(default_factory=list)
    colours: list[str] = Field(default_factory=list)


class ProductContext(BaseModel):
    id: str
    brand: str
    name: str = ""
    price: str = ""
    compatible_vehicles: str = ""
    product_description: str = ""
    features_benefits: str = ""
    wheel_size: str = ""
    wheel_width: str = ""
    colour: str = ""
    wheel_style: str = ""
    wheel_model_name: str = ""
    wheel_stud_pattern_pcd: str = ""


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
    name: str = ""

    @field_validator("id", mode="before")
    @classmethod
    def _coerce_id(cls, v: object) -> str:
        return str(v)

    @field_validator(
        "name",
        "brand",
        "image",
        "product_description",
        "wheel_size",
        "wheel_width",
        "colour",
        "wheel_style",
        "wheel_model_name",
        "wheel_stud_pattern_pcd",
        mode="before",
    )
    @classmethod
    def _none_to_empty(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v)

    brand: str = ""
    image: str = ""
    compatible_vehicles: list[str] = Field(default_factory=list)
    price: float = 0.0
    product_description: str = ""
    features_benefits: list[str] = Field(default_factory=list)
    vehicle_models: list[str] = Field(default_factory=list)
    wheel_size: str = ""
    wheel_width: str = ""
    colour: str = ""
    wheel_style: str = ""
    wheel_model_name: str = ""
    wheel_stud_pattern_pcd: str = ""

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
        specs = " | ".join(
            filter(
                None, [self.wheel_size, self.wheel_width, self.colour, self.wheel_style]
            )
        )
        return (
            f"{self.name or self.brand} — ${self.price:,.2f}. "
            f"{specs}. "
            f"{self.product_description[:200]} "
            f"Features: {features}. "
            f"Compatible vehicles: {vehicles}"
        )

    @classmethod
    def from_raw(cls, raw: dict) -> "TyreProduct":
        """Create a TyreProduct from the raw JSON keys."""
        return cls(
            id=raw["id"],
            name=raw.get("name", ""),
            brand=raw.get("Brand", ""),
            image=raw.get("Image", ""),
            compatible_vehicles=raw.get("Compatible Vehicles", ""),
            price=raw.get("Price", 0),
            product_description=raw.get("Product Description", ""),
            features_benefits=raw.get("Features & Benefits", ""),
            vehicle_models=raw.get("Vehicle Models", ""),
            wheel_size=raw.get("wheel_size", ""),
            wheel_width=raw.get("wheel_width", ""),
            colour=raw.get("colour", ""),
            wheel_style=raw.get("wheel_style", ""),
            wheel_model_name=raw.get("wheel_model_name", ""),
            wheel_stud_pattern_pcd=raw.get("wheel_stud_pattern_pcd", ""),
        )
