import json
import logging
import os
from collections import defaultdict
from pathlib import Path
from typing import Callable

import faiss
import numpy as np
from langchain_openai import OpenAIEmbeddings

from app.config import settings
from app.models import TyreProduct

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SAMPLE_DATA_PATH = DATA_DIR / "tyre_dataset_with_id.json"
INDEX_DIR = DATA_DIR / "faiss_indices"
META_PATH = DATA_DIR / "faiss_meta.json"
_LEGACY_INDEX_PATH = DATA_DIR / "faiss_index.bin"

ATTRIBUTE_FIELDS: dict[str, Callable[[TyreProduct], str]] = {
    "brand_name": lambda p: p.brand,
    "description": lambda p: p.product_description,
    "features": lambda p: ". ".join(p.features_benefits[:5]),
    "vehicles": lambda p: f"Compatible with {', '.join(p.compatible_vehicles)}",
    "price": lambda p: (
        f"₹{p.price:,.0f} "
        f"{'budget' if p.price < 5000 else 'mid-range' if p.price < 12000 else 'premium'} "
        f"price range"
    ),
}


class FaissTyreStore:
    """FAISS-backed vector store with per-attribute indices for tyre products.

    Builds a separate FAISS index for each attribute group (brand/name, description,
    features, compatible vehicles, price tier). Searches can target specific
    attributes or fan out across all indices with per-product score aggregation.
    """

    def __init__(self) -> None:
        self._embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            openai_api_key=settings.openai_api_key,
        )
        self._indices: dict[str, faiss.IndexFlatIP] = {}
        self._products: list[TyreProduct] = []
        self._attribute_texts: dict[str, list[str]] = {}

    @property
    def attribute_names(self) -> list[str]:
        return list(ATTRIBUTE_FIELDS.keys())

    def load_or_build(self) -> None:
        if self._has_valid_cache():
            self._load_indices()
        else:
            self._build_indices()

    def _has_valid_cache(self) -> bool:
        if not META_PATH.exists():
            return False
        try:
            with open(META_PATH) as f:
                raw = json.load(f)
            if "attribute_texts" not in raw:
                return False
        except (json.JSONDecodeError, KeyError):
            return False
        return all((INDEX_DIR / f"{attr}.bin").exists() for attr in ATTRIBUTE_FIELDS)

    def _load_indices(self) -> None:
        with open(META_PATH) as f:
            raw = json.load(f)
        self._products = [TyreProduct(**item) for item in raw["products"]]
        self._attribute_texts = raw["attribute_texts"]
        for attr in ATTRIBUTE_FIELDS:
            self._indices[attr] = faiss.read_index(str(INDEX_DIR / f"{attr}.bin"))
        logger.info(
            "Loaded %d attribute indices for %d products",
            len(self._indices),
            len(self._products),
        )

    def _build_indices(self) -> None:
        with open(SAMPLE_DATA_PATH) as f:
            raw_products = json.load(f)

        self._products = [TyreProduct.from_raw(p) for p in raw_products]
        self._attribute_texts = {
            attr: [text_fn(p) for p in self._products]
            for attr, text_fn in ATTRIBUTE_FIELDS.items()
        }

        os.makedirs(INDEX_DIR, exist_ok=True)

        for attr, texts in self._attribute_texts.items():
            vectors = self._embeddings.embed_documents(texts)
            matrix = np.array(vectors, dtype=np.float32)
            faiss.normalize_L2(matrix)

            index = faiss.IndexFlatIP(matrix.shape[1])
            index.add(matrix)
            self._indices[attr] = index
            faiss.write_index(index, str(INDEX_DIR / f"{attr}.bin"))

        with open(META_PATH, "w") as f:
            json.dump(
                {
                    "products": [p.model_dump() for p in self._products],
                    "attribute_texts": self._attribute_texts,
                },
                f,
            )

        if _LEGACY_INDEX_PATH.exists():
            _LEGACY_INDEX_PATH.unlink()
            logger.info("Removed legacy single-index file")

        logger.info(
            "Built %d attribute indices for %d products",
            len(self._indices),
            len(self._products),
        )

    def _ensure_loaded(self) -> None:
        if not self._indices:
            self.load_or_build()

    def _embed_query(self, query: str) -> np.ndarray:
        vec = self._embeddings.embed_query(query)
        matrix = np.array([vec], dtype=np.float32)
        faiss.normalize_L2(matrix)
        return matrix

    def search(
        self,
        query: str,
        top_k: int | None = None,
        attributes: list[str] | None = None,
    ) -> list[dict]:
        """Search across attribute indices and aggregate scores per product.

        Each product's best single-attribute score is the primary ranking key,
        with the cross-attribute sum as a tiebreaker.
        """
        self._ensure_loaded()

        k = top_k or settings.top_k_search
        target_attrs = attributes or list(ATTRIBUTE_FIELDS.keys())

        invalid = set(target_attrs) - set(ATTRIBUTE_FIELDS)
        if invalid:
            raise ValueError(
                f"Unknown attributes: {invalid}. Valid: {list(ATTRIBUTE_FIELDS)}"
            )

        try:
            query_matrix = self._embed_query(query)

            best_score: dict[int, float] = defaultdict(float)
            score_sum: dict[int, float] = defaultdict(float)
            matched: dict[int, dict[str, float]] = defaultdict(dict)

            for attr in target_attrs:
                index = self._indices[attr]
                search_k = min(k, index.ntotal)
                scores, indices = index.search(query_matrix, search_k)

                for score, idx in zip(scores[0], indices[0]):
                    if idx < 0:
                        continue
                    score_f = float(score)
                    best_score[idx] = max(best_score[idx], score_f)
                    score_sum[idx] += score_f
                    matched[idx][attr] = score_f

            ranked_indices = sorted(
                best_score,
                key=lambda idx: (best_score[idx], score_sum[idx]),
                reverse=True,
            )[:k]

            return [
                {
                    "product": self._products[idx].model_dump(),
                    "score": best_score[idx],
                    "matched_attributes": matched[idx],
                    "text": self._products[idx].to_search_text(),
                }
                for idx in ranked_indices
            ]
        except Exception:
            logger.exception(
                "FAISS search failed (query=%r, attributes=%s)",
                query[:200] if query else "",
                target_attrs,
            )
            return []

    def search_by_attribute(
        self,
        attribute: str,
        query: str,
        top_k: int | None = None,
    ) -> list[dict]:
        return self.search(query, top_k=top_k, attributes=[attribute])

    def filter_products(
        self,
        *,
        brand: str | None = None,
        compatible_vehicle: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> list[dict]:
        """Filter products by exact attribute values (AND logic).

        String comparisons are case-insensitive substring matches.
        """
        self._ensure_loaded()

        def _matches(product: TyreProduct) -> bool:
            if brand and brand.lower() not in product.brand.lower():
                return False
            if compatible_vehicle:
                cv = compatible_vehicle.lower()
                if not any(cv in v.lower() for v in product.compatible_vehicles):
                    return False
            if min_price is not None and product.price < min_price:
                return False
            if max_price is not None and product.price > max_price:
                return False
            return True

        return [
            {
                "product": p.model_dump(),
                "score": 1.0,
                "matched_attributes": {},
                "text": p.to_search_text(),
            }
            for p in self._products
            if _matches(p)
        ]


tyre_store = FaissTyreStore()
