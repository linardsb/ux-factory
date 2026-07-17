# Building a Vertical Slice Architecture Project from Scratch: A Practical Guide for AI Coding

**By Rasmus Widing**
_Product Builder | AI Adoption Specialist | Creator of the PRP Framework_

After three years of building AI-powered applications and helping hundreds of engineers adopt patterns for AI coding, I've learned that **the hardest part isn't understanding the theory—it's knowing where to put things**.

Where does the database configuration go? What about logging? If you're building an AI agent, where do you place the OpenAI client? Which code is okay to duplicate, and which should follow DRY principles?

This article answers these questions with concrete examples. We'll build a FastAPI project with vertical slice architecture, optimized for AI coding agents, from the ground up.

## The Setup Paradox: Infrastructure Before Features

Here's the first challenge: Vertical Slice Architecture organizes by features, but before you have any features, you need infrastructure. Database connections, logging, configuration, API clients—these exist before your first product or user slice.

The solution? A pragmatic structure that balances purity with practicality:

```
my-fastapi-app/
├── app/
│   ├── core/              # Foundation infrastructure
│   ├── shared/            # Cross-feature utilities
│   ├── products/          # Feature slice
│   ├── inventory/         # Feature slice
│   └── categories/        # Feature slice
├── tests/
├── .env
├── pyproject.toml
└── README.md
```

Let's break down what goes where and why.

## The `core/` Directory: Your Application's Foundation

The `core/` directory contains infrastructure that exists **before** features and is **universal** across the entire application. Think of it as the engine and chassis—necessary for the car to run, but not specific to any particular trip.

### What Goes in `core/`

```
app/core/
├── __init__.py
├── config.py              # Application configuration
├── database.py            # Database connection & session management
├── logging.py             # Logging setup and configuration
├── middleware.py          # Request/response middleware (CORS, logging)
├── exceptions.py          # Base exception classes
├── dependencies.py        # Global FastAPI dependencies
├── events.py              # Application lifecycle events
├── cache.py               # Redis client setup
├── worker.py              # Celery/background job configuration
├── health.py              # Health check implementations
├── rate_limit.py          # Rate limiting utilities
├── feature_flags.py       # Feature flag management
└── uow.py                 # Unit of Work pattern (if needed)
```

**Rule of thumb:** If removing a feature slice would still require this code, it goes in `core/`.

### Example: `core/config.py`

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Application
    app_name: str = "My FastAPI App"
    debug: bool = False
    version: str = "1.0.0"

    # Database
    database_url: str

    # Observability
    log_level: str = "INFO"
    enable_metrics: bool = True

    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
```

**Why this matters for AI:** Configuration is a common source of AI confusion. When settings are scattered, agents waste tokens searching. Centralizing in `core/config.py` gives AI a single source of truth.

### Example: `core/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Key decision:** Database setup goes in `core/` because it's universal infrastructure. Individual feature models go in their own slices.

### Example: `core/logging.py`

```python
import logging
import structlog
from typing import Any
from contextvars import ContextVar
import uuid

from app.core.config import get_settings

# Context variable for request correlation ID
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Get the current request ID from context."""
    return request_id_var.get()


def set_request_id(request_id: str | None = None) -> str:
    """Set request ID in context, generating one if not provided."""
    if not request_id:
        request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id


def add_request_id(logger, method_name, event_dict):
    """Processor to add request ID to all log entries."""
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def setup_logging() -> None:
    """Configure structured logging for the application."""
    settings = get_settings()

    structlog.configure(
        processors=[
            add_request_id,  # Add request ID to every log entry
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,  # Formats exception tracebacks
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> Any:
    """Get a logger instance for a module."""
    return structlog.get_logger(name)
```

**Critical for AI agents:** The `format_exc_info` processor formats exception tracebacks as strings in the JSON output. When you use `exc_info=True`, AI agents get the full stack trace in a parseable format.

**Example log output with stack trace:**

```json
{
  "event": "product.create.failed",
  "sku": "TEST-001",
  "error": "IntegrityError: duplicate key value violates unique constraint",
  "exception": "Traceback (most recent call last):\n  File \"/app/products/service.py\", line 45, in create_product\n    product = self.repository.create(product_data)\n  File \"/app/products/repository.py\", line 23, in create\n    self.db.commit()\nsqlalchemy.exc.IntegrityError: (psycopg2.errors.UniqueViolation) duplicate key",
  "level": "error",
  "timestamp": "2025-01-15T14:23:45.123Z"
}
```

**Why this matters:** AI agents can search logs for `"level": "error"` and get the full context including the exact line numbers and call stack.

**Request correlation:** The `request_id` allows tracing a single request through multiple features and services. Every log entry for that request will have the same ID.

### Example: `core/middleware.py`

```python
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from typing import Callable
import time

from app.core.logging import set_request_id, get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for request/response logging with correlation ID."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate request ID
        request_id = request.headers.get("X-Request-ID")
        set_request_id(request_id)

        # Log incoming request
        start_time = time.time()
        logger.info(
            "request.started",
            method=request.method,
            path=request.url.path,
            client_host=request.client.host if request.client else None,
        )

        try:
            # Process request
            response = await call_next(request)

            # Log successful response
            duration = time.time() - start_time
            logger.info(
                "request.completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_seconds=round(duration, 3),
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = get_request_id()
            return response

        except Exception as e:
            # Log failed request
            duration = time.time() - start_time
            logger.error(
                "request.failed",
                method=request.method,
                path=request.url.path,
                error=str(e),
                duration_seconds=round(duration, 3),
                exc_info=True,
            )
            raise


def setup_cors(app):
    """Configure CORS middleware."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def setup_middleware(app):
    """Configure all middleware for the application."""
    app.add_middleware(RequestLoggingMiddleware)
    setup_cors(app)
```

**Usage in `main.py`:**

```python
from app.core.middleware import setup_middleware

app = FastAPI(...)
setup_middleware(app)
```

**Why this matters for AI:** Every request gets a unique ID that appears in all logs. When debugging, AI can filter logs by `request_id` to see the complete request lifecycle across all features.

## The `shared/` Directory: Cross-Feature Utilities

The `shared/` directory is for code that **multiple features use** but isn't foundational infrastructure. This is the gray area that causes the most confusion.

### What Goes in `shared/`

```
app/shared/
├── __init__.py
├── models.py              # Base models, mixins (e.g., TimestampMixin)
├── schemas.py             # Common Pydantic schemas (e.g., PaginationParams)
├── utils.py               # Generic utilities (string helpers, date utils)
├── validators.py          # Reusable validators
├── responses.py           # Standard API response formats
├── events.py              # Domain events and event bus
├── tasks.py               # Cross-feature background tasks
└── integrations/          # External API clients (3+ features)
    ├── __init__.py
    ├── email.py           # SendGrid, SES, etc.
    ├── storage.py         # S3, GCS, etc.
    └── payment.py         # Stripe, PayPal, etc.
```

**Decision rule:** Code moves to `shared/` when **three or more** feature slices need it. Until then, duplicate it.

### Example: `shared/models.py`

```python
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.ext.declarative import declared_attr


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    @declared_attr
    def created_at(cls):
        return Column(DateTime, default=datetime.utcnow, nullable=False)

    @declared_attr
    def updated_at(cls):
        return Column(
            DateTime,
            default=datetime.utcnow,
            onupdate=datetime.utcnow,
            nullable=False
        )
```

**When to use:** All your database models need timestamps. This is genuinely shared behavior, not feature-specific.

### Example: `shared/schemas.py`

```python
from pydantic import BaseModel, Field
from typing import Generic, TypeVar, List

T = TypeVar('T')


class PaginationParams(BaseModel):
    """Standard pagination parameters."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response format."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
```

**Why shared:** Every feature that lists items uses pagination the same way. Common interface, common code.

## Feature Slices: Where Your Business Logic Lives

Each feature slice is self-contained. Everything needed to understand and modify that feature lives in its directory.

### Complete Feature Structure

```
app/products/
├── __init__.py
├── routes.py              # FastAPI endpoints
├── service.py             # Business logic
├── repository.py          # Database operations
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic request/response models
├── validators.py          # Feature-specific validation
├── exceptions.py          # Feature-specific exceptions
├── dependencies.py        # Feature-specific FastAPI dependencies
├── constants.py           # Feature-specific constants
├── types.py               # Feature-specific type definitions
├── cache.py               # Feature-specific caching logic (optional)
├── tasks.py               # Feature-specific background tasks (optional)
├── storage.py             # Feature-specific file operations (optional)
├── cli.py                 # Feature-specific CLI commands (optional)
├── config.py              # Feature-specific configuration (optional)
├── test_routes.py         # Endpoint tests
├── test_service.py        # Business logic tests
└── README.md              # Feature documentation
```

**Not every feature needs every file.** Start with `routes.py`, `service.py`, and `schemas.py`. Add others as needed.

**Optional files:**

- `cache.py` - Only if feature has specific caching needs
- `tasks.py` - Only if feature has background jobs
- `storage.py` - Only if feature handles file uploads
- `cli.py` - Only if feature needs CLI commands
- `config.py` - Only if feature has 5+ settings

### Example: Complete Product Feature

**`products/models.py`**

```python
from sqlalchemy import Column, Integer, String, Numeric, Boolean, Text
from app.core.database import Base
from app.shared.models import TimestampMixin


class Product(Base, TimestampMixin):
    """Product database model."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
```

**`products/schemas.py`**

```python
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime


class ProductBase(BaseModel):
    """Shared product attributes."""
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    description: str | None = None
    price: Decimal = Field(..., gt=0)


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product (all fields optional)."""
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    price: Decimal | None = Field(None, gt=0)
    is_active: bool | None = None


class ProductResponse(ProductBase):
    """Schema for product responses."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

**`products/repository.py`**

```python
from sqlalchemy.orm import Session
from typing import List, Optional

from app.products.models import Product
from app.products.schemas import ProductCreate, ProductUpdate


class ProductRepository:
    """Data access layer for products."""

    def __init__(self, db: Session):
        self.db = db

    def get(self, product_id: int) -> Optional[Product]:
        """Get product by ID."""
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_by_sku(self, sku: str) -> Optional[Product]:
        """Get product by SKU."""
        return self.db.query(Product).filter(Product.sku == sku).first()

    def list(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[Product]:
        """List products with pagination."""
        query = self.db.query(Product)
        if active_only:
            query = query.filter(Product.is_active == True)
        return query.offset(skip).limit(limit).all()

    def create(self, product_data: ProductCreate) -> Product:
        """Create a new product."""
        product = Product(**product_data.model_dump())
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product: Product, product_data: ProductUpdate) -> Product:
        """Update an existing product."""
        update_data = product_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(product, field, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        """Delete a product (hard delete)."""
        self.db.delete(product)
        self.db.commit()
```

**`products/service.py`**

```python
from sqlalchemy.orm import Session
from typing import List

from app.products.repository import ProductRepository
from app.products.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.products.exceptions import ProductNotFoundError, ProductAlreadyExistsError
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProductService:
    """Business logic for products."""

    def __init__(self, db: Session):
        self.repository = ProductRepository(db)

    def get_product(self, product_id: int) -> ProductResponse:
        """Get a product by ID."""
        logger.info("Fetching product", product_id=product_id)

        product = self.repository.get(product_id)
        if not product:
            logger.warning("Product not found", product_id=product_id)
            raise ProductNotFoundError(f"Product {product_id} not found")

        return ProductResponse.model_validate(product)

    def list_products(self, skip: int = 0, limit: int = 100) -> List[ProductResponse]:
        """List active products."""
        logger.info("Listing products", skip=skip, limit=limit)

        products = self.repository.list(skip=skip, limit=limit)
        return [ProductResponse.model_validate(p) for p in products]

    def create_product(self, product_data: ProductCreate) -> ProductResponse:
        """Create a new product."""
        logger.info("Creating product", sku=product_data.sku, name=product_data.name)

        # Check if SKU already exists
        existing = self.repository.get_by_sku(product_data.sku)
        if existing:
            logger.warning("Product SKU already exists", sku=product_data.sku)
            raise ProductAlreadyExistsError(f"Product with SKU {product_data.sku} already exists")

        product = self.repository.create(product_data)
        logger.info("Product created successfully", product_id=product.id, sku=product.sku)

        return ProductResponse.model_validate(product)

    def update_product(self, product_id: int, product_data: ProductUpdate) -> ProductResponse:
        """Update a product."""
        logger.info("Updating product", product_id=product_id)

        product = self.repository.get(product_id)
        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        updated_product = self.repository.update(product, product_data)
        logger.info("Product updated successfully", product_id=product_id)

        return ProductResponse.model_validate(updated_product)

    def delete_product(self, product_id: int) -> None:
        """Delete a product."""
        logger.info("Deleting product", product_id=product_id)

        product = self.repository.get(product_id)
        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        self.repository.delete(product)
        logger.info("Product deleted successfully", product_id=product_id)
```

**`products/exceptions.py`**

```python
class ProductError(Exception):
    """Base exception for product-related errors."""
    pass


class ProductNotFoundError(ProductError):
    """Raised when a product is not found."""
    pass


class ProductAlreadyExistsError(ProductError):
    """Raised when attempting to create a product with duplicate SKU."""
    pass
```

**`products/routes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.products.service import ProductService
from app.products.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.products.exceptions import ProductNotFoundError, ProductAlreadyExistsError
from app.shared.schemas import PaginationParams

router = APIRouter(prefix="/products", tags=["products"])


def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    """Dependency to get ProductService instance."""
    return ProductService(db)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    service: ProductService = Depends(get_product_service)
):
    """Create a new product."""
    try:
        return service.create_product(product_data)
    except ProductAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    service: ProductService = Depends(get_product_service)
):
    """Get a product by ID."""
    try:
        return service.get_product(product_id)
    except ProductNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/", response_model=List[ProductResponse])
def list_products(
    pagination: PaginationParams = Depends(),
    service: ProductService = Depends(get_product_service)
):
    """List products with pagination."""
    return service.list_products(skip=pagination.offset, limit=pagination.page_size)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    service: ProductService = Depends(get_product_service)
):
    """Update a product."""
    try:
        return service.update_product(product_id, product_data)
    except ProductNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    service: ProductService = Depends(get_product_service)
):
    """Delete a product."""
    try:
        service.delete_product(product_id)
    except ProductNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
```

**Why this structure works for AI:**

- All product-related code is in one place
- AI can load `products/` and understand the entire feature
- Clear separation: routes → service → repository → database
- Each file has a single, clear responsibility

## The Duplication vs. DRY Decision Matrix

This is the question everyone struggles with: "Should I extract this to shared, or duplicate it?"

### When to Duplicate (Prefer Coupling to Feature Over DRY)

**Duplicate when:**

1. **Used by 1-2 features** - Wait until the third feature needs it
2. **Slight variations exist** - If features need different behavior, don't force abstraction
3. **Feature-specific logic** - Even if code looks similar, if it solves different problems, keep it separate
4. **Uncertain stability** - If requirements might change independently per feature, duplicate

**Example: Validation logic**

```python
# products/validators.py
def validate_price(price: Decimal) -> Decimal:
    """Validate product price is positive and has max 2 decimal places."""
    if price <= 0:
        raise ValueError("Price must be positive")
    if price.as_tuple().exponent < -2:
        raise ValueError("Price cannot have more than 2 decimal places")
    return price

# inventory/validators.py
def validate_quantity(quantity: int) -> int:
    """Validate inventory quantity is non-negative."""
    if quantity < 0:
        raise ValueError("Quantity cannot be negative")
    return quantity
```

**Why duplicate:** These solve different problems. Extracting to `shared/validators.py` would create coupling between unrelated features.

### When to Extract to Shared (DRY Wins)

**Extract when:**

1. **Used by 3+ features** - Clear pattern of reuse
2. **Identical logic** - No variations across features
3. **Infrastructure-level** - Database mixins, base schemas, auth helpers
4. **Stable interface** - Won't need feature-specific modifications

**Example: Date utilities**

```python
# shared/utils.py
from datetime import datetime, timezone

def utcnow() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)

def format_iso(dt: datetime) -> str:
    """Format datetime as ISO 8601 string."""
    return dt.isoformat()
```

**Why shared:** Every feature needs consistent date handling. No feature-specific variations.

### The Three-Feature Rule

**Rule:** When you find yourself writing the same code for the third time, extract it to `shared/`.

**Why three?**

- One instance: specific to that feature
- Two instances: might be coincidence
- Three instances: proven pattern worth abstracting

**Process:**

1. First feature: Write the code inline
2. Second feature: Duplicate it (add comment noting duplication)
3. Third feature: Extract to `shared/` and refactor all three features to use it

This prevents premature abstraction while catching genuine shared behavior.

## AI Agent-Specific Infrastructure: LLM Clients and Prompt Management

If you're building an AI agent or LLM-powered application, you need additional infrastructure. Where does it go?

### LLM Client Setup: In `core/` or Dedicated Module?

**Option 1: In `core/` (for small apps)**

```python
# core/llm.py
from anthropic import Anthropic
from openai import OpenAI
from functools import lru_cache

from app.core.config import get_settings


@lru_cache()
def get_anthropic_client() -> Anthropic:
    """Get cached Anthropic client."""
    settings = get_settings()
    return Anthropic(api_key=settings.anthropic_api_key)


@lru_cache()
def get_openai_client() -> OpenAI:
    """Get cached OpenAI client."""
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)
```

**Use when:** Your entire app is an AI agent, and LLM calls are universal.

**Option 2: Dedicated `llm/` module (for larger apps)**

```
app/llm/
├── __init__.py
├── clients.py             # LLM client initialization
├── prompts.py             # Centralized prompt management
├── tools.py               # Tool/function definitions for LLM
├── messages.py            # Message formatting utilities
└── schemas.py             # LLM-specific Pydantic schemas
```

**Use when:** Multiple features use LLMs differently, or you have complex prompt management needs.

### Example: `llm/clients.py`

```python
from anthropic import Anthropic
from openai import OpenAI
from functools import lru_cache
from typing import Protocol

from app.core.config import get_settings


class LLMClient(Protocol):
    """Protocol for LLM clients."""
    def complete(self, prompt: str, **kwargs) -> str:
        ...


class AnthropicClientWrapper:
    """Wrapper for Anthropic client with standard interface."""

    def __init__(self):
        settings = get_settings()
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.default_model = settings.anthropic_model

    def complete(self, prompt: str, **kwargs) -> str:
        """Complete a prompt using Claude."""
        response = self.client.messages.create(
            model=kwargs.get("model", self.default_model),
            max_tokens=kwargs.get("max_tokens", 1024),
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text


class OpenAIClientWrapper:
    """Wrapper for OpenAI client with standard interface."""

    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.default_model = settings.openai_model

    def complete(self, prompt: str, **kwargs) -> str:
        """Complete a prompt using GPT."""
        response = self.client.chat.completions.create(
            model=kwargs.get("model", self.default_model),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=kwargs.get("max_tokens", 1024)
        )
        return response.choices[0].message.content


@lru_cache()
def get_llm_client(provider: str = "anthropic") -> LLMClient:
    """Get LLM client by provider name."""
    if provider == "anthropic":
        return AnthropicClientWrapper()
    elif provider == "openai":
        return OpenAIClientWrapper()
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
```

**Key decisions:**

- **Wrapper pattern**: Abstracts provider differences, makes switching easier
- **Protocol for type hints**: AI can understand the interface without knowing implementation
- **Caching**: Reuses client instances, critical for performance

### Prompt Management

**Simple approach (for few prompts):**

```python
# llm/prompts.py
from typing import Dict, Any

SYSTEM_PROMPTS = {
    "product_description_generator": """You are an expert e-commerce product description writer.
Generate compelling, SEO-optimized product descriptions that highlight key features and benefits.
Keep descriptions between 100-150 words.""",

    "support_agent": """You are a friendly customer support agent for an e-commerce platform.
Help customers with their questions about products, orders, and returns.
Always be professional and empathetic.""",
}


def get_system_prompt(name: str) -> str:
    """Get system prompt by name."""
    if name not in SYSTEM_PROMPTS:
        raise ValueError(f"Unknown prompt: {name}")
    return SYSTEM_PROMPTS[name]


def format_user_prompt(template: str, **kwargs) -> str:
    """Format a user prompt template with variables."""
    return template.format(**kwargs)
```

**Advanced approach (for many prompts):**

```python
# llm/prompts.py
from pathlib import Path
from typing import Dict, Any
import yaml

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt_from_file(name: str) -> str:
    """Load prompt from YAML file."""
    prompt_file = PROMPTS_DIR / f"{name}.yaml"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {name}")

    with open(prompt_file, "r") as f:
        data = yaml.safe_load(f)

    return data.get("system", "")


class PromptTemplate:
    """Manage prompt templates with variable substitution."""

    def __init__(self, template: str):
        self.template = template

    def format(self, **kwargs) -> str:
        """Format the template with provided variables."""
        return self.template.format(**kwargs)

    @classmethod
    def from_file(cls, name: str) -> "PromptTemplate":
        """Load template from file."""
        template = load_prompt_from_file(name)
        return cls(template)
```

**File structure for advanced approach:**

```
app/llm/prompts/
├── product_description.yaml
├── support_agent.yaml
└── content_moderator.yaml
```

**Example YAML:**

```yaml
# product_description.yaml
system: |
  You are an expert e-commerce product description writer.
  Generate compelling, SEO-optimized descriptions.

user_template: |
  Write a product description for:
  Name: {product_name}
  Category: {category}
  Key Features: {features}

variables:
  - product_name
  - category
  - features
```

### Tool Registry for LLM Function Calling

```python
# llm/tools.py
from typing import Dict, Any, Callable, List
from pydantic import BaseModel


class ToolParameter(BaseModel):
    """Parameter definition for a tool."""
    name: str
    type: str
    description: str
    required: bool = True


class ToolDefinition(BaseModel):
    """Definition of a tool that can be called by the LLM."""
    name: str
    description: str
    parameters: List[ToolParameter]


class ToolRegistry:
    """Registry for tools available to the LLM."""

    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._definitions: Dict[str, ToolDefinition] = {}

    def register(self, definition: ToolDefinition):
        """Decorator to register a tool."""
        def decorator(func: Callable) -> Callable:
            self._tools[definition.name] = func
            self._definitions[definition.name] = definition
            return func
        return decorator

    def get_tool(self, name: str) -> Callable:
        """Get tool function by name."""
        return self._tools[name]

    def get_definitions(self) -> List[ToolDefinition]:
        """Get all tool definitions for LLM."""
        return list(self._definitions.values())

    def execute(self, name: str, **kwargs) -> Any:
        """Execute a tool by name with given arguments."""
        tool = self.get_tool(name)
        return tool(**kwargs)


# Global registry instance
tool_registry = ToolRegistry()


# Example tool registration
@tool_registry.register(
    ToolDefinition(
        name="search_products",
        description="Search for products by name or category",
        parameters=[
            ToolParameter(
                name="query",
                type="string",
                description="Search query for product name or category"
            ),
            ToolParameter(
                name="max_results",
                type="integer",
                description="Maximum number of results to return",
                required=False
            )
        ]
    )
)
def search_products(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search products (implementation)."""
    # Implementation here
    pass
```

**Why this organization:**

- Tools are centrally managed but can be feature-specific
- LLM gets clean JSON schema for function calling
- Easy to test tools independently
- Clear registry pattern AI can understand

## Scaffolding a New Project: The Practical Checklist

Here's the exact order I set up new Vertical Slice projects optimized for AI coding:

### Step 1: Initialize Project (5 minutes)

```bash
# Create project directory
mkdir my-fastapi-app && cd my-fastapi-app

# Initialize with uv
uv init

# Add core dependencies
uv add fastapi uvicorn sqlalchemy pydantic pydantic-settings python-multipart

# Add dev dependencies
uv add --dev ruff mypy pytest pytest-cov httpx

# Add AI dependencies (if building AI features)
uv add anthropic openai litellm structlog
```

### Step 2: Create Directory Structure (5 minutes)

```bash
mkdir -p app/core app/shared tests
touch app/__init__.py app/core/__init__.py app/shared/__init__.py
touch app/main.py .env .env.example README.md
```

### Step 3: Setup Core Infrastructure (15 minutes)

Create in this order:

1. **`app/core/config.py`** - Configuration first, everything depends on it
2. **`app/core/logging.py`** - Logging second, for debugging setup issues
3. **`app/core/database.py`** - Database connection
4. **`app/core/exceptions.py`** - Base exception classes
5. **`app/core/dependencies.py`** - Common FastAPI dependencies

### Step 4: Create `main.py` (5 minutes)

```python
# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    # Add cleanup code here


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan
)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.version}


# Import and include routers here as features are added
# from app.products.routes import router as products_router
# app.include_router(products_router)
```

### Step 5: Setup Ruff and MyPy (5 minutes)

Add to `pyproject.toml`:

```toml
[tool.ruff]
target-version = "py312"
line-length = 100
exclude = [".git", ".venv", "venv", "__pycache__"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "C4", "UP", "ANN", "S", "RUF"]
ignore = ["B008", "ANN101", "ANN102", "S311"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "ANN"]
"__init__.py" = ["F401"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

### Step 6: Create First Feature Slice (15 minutes)

```bash
mkdir -p app/products
touch app/products/__init__.py
touch app/products/routes.py app/products/service.py
touch app/products/models.py app/products/schemas.py
touch app/products/repository.py app/products/exceptions.py
```

Add minimal implementations (use examples from earlier in this article).

### Step 7: Wire Up the Feature (5 minutes)

Update `app/main.py`:

```python
from app.products.routes import router as products_router

app.include_router(products_router)
```

### Step 8: Test Your Setup (5 minutes)

```bash
# Run the server
uv run uvicorn app.main:app --reload

# In another terminal, test the endpoints
curl http://localhost:8000/health
curl http://localhost:8000/products
```

**Total time: ~60 minutes** from zero to working Vertical Slice API with one feature.

## Adding New Features: The Incremental Process

Once infrastructure is in place, adding features is fast:

### The Template

Every feature follows this template:

1. Create feature directory: `mkdir -p app/feature_name`
2. Add required files (minimum: `routes.py`, `service.py`, `schemas.py`)
3. Implement from outside-in:
   - **Schemas first**: Define request/response shapes
   - **Routes second**: Define endpoints and wire to service
   - **Service third**: Implement business logic
   - **Repository if needed**: Add data access layer
   - **Models if needed**: Add database models
4. Register router in `main.py`
5. Write tests

### Example: Adding an Inventory Feature

```bash
# 1. Create structure
mkdir -p app/inventory
touch app/inventory/{__init__,routes,service,schemas,models,repository}.py

# 2. Implement (following same pattern as products/)
# ... add code here ...

# 3. Wire up in main.py
```

```python
# app/main.py
from app.inventory.routes import router as inventory_router
app.include_router(inventory_router)
```

**Time per feature: 30-60 minutes** depending on complexity.

## Migrating from Layered Architecture: The Strangler Fig Pattern

You have an existing layered architecture app. How do you migrate without rewriting everything?

### The Strategy: Parallel Development

Don't rewrite. Instead, **add new features in Vertical Slice alongside old code**, then gradually migrate hot paths.

### Step 1: Set Up the New Structure

```
my-app/
├── app/
│   ├── controllers/       # OLD: Keep for now
│   ├── services/          # OLD: Keep for now
│   ├── repositories/      # OLD: Keep for now
│   ├── core/              # NEW: Foundation infrastructure
│   ├── shared/            # NEW: Cross-feature utilities
│   └── products/          # NEW: First vertical slice
```

### Step 2: Create Migration Boundary

Add a file marking the boundary:

```python
# app/MIGRATION.md
# Architecture Migration

This codebase is migrating from layered to vertical slice architecture.

## New code (Vertical Slices)
- `app/core/` - Foundation infrastructure
- `app/shared/` - Cross-feature utilities
- `app/products/` - Product feature (NEW)
- More features will be added here...

## Legacy code (Layered)
- `app/controllers/`
- `app/services/`
- `app/repositories/`

**Guideline:** New features use vertical slices. When modifying old features,
migrate them to slices if you're touching >50% of the code.
```

### Step 3: Extract Core Infrastructure

Create `app/core/` but have it **wrap existing setup**:

```python
# app/core/database.py
# Wrap existing database setup
from app.database import SessionLocal as _SessionLocal
from app.database import engine, Base

# Provide clean interface for new slices
def get_db():
    """FastAPI dependency for database (works with both old and new code)."""
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Key principle:** Don't break existing code. Wrap it.

### Step 4: Add First Vertical Slice

Pick a **low-risk feature** (not user auth, not payments):

- ✅ Good: Product catalog, notifications, reporting
- ❌ Risky: Authentication, billing, core user management

Implement the slice using the patterns from this article.

### Step 5: Gradual Migration Schedule

**Week 1-2:** New feature in vertical slice
**Week 3-4:** Migrate one low-risk old feature
**Month 2:** Migrate 2-3 more features
**Month 3+:** Continue until critical mass (60-70%)

**Stop at 80%:** Leave stable, untouched legacy code alone. Perfect is the enemy of done.

### Step 6: Update Documentation

```markdown
# README.md

## Architecture

This project uses **Vertical Slice Architecture** for all features added after 2024-01.

See MIGRATION.md for details on legacy code.

### Adding New Features

All new features should be implemented as vertical slices in `app/{feature_name}/`.
See `app/products/` for a reference implementation.
```

## Observability: Structured Logging and Metrics

Observability deserves special attention because it's critical for AI agents to debug issues.

### Structured Logging Setup

**Why structured logging matters for AI:** AI agents can parse JSON logs easily. Traditional logs are harder to query.

Already shown earlier in `core/logging.py`, but here's how to use it in features:

```python
# products/service.py
from app.core.logging import get_logger

logger = get_logger(__name__)

class ProductService:
    def create_product(self, product_data: ProductCreate) -> ProductResponse:
        logger.info(
            "product.create.started",
            sku=product_data.sku,
            name=product_data.name,
            price=float(product_data.price)
        )

        try:
            product = self.repository.create(product_data)
            logger.info(
                "product.create.success",
                product_id=product.id,
                sku=product.sku
            )
            return ProductResponse.model_validate(product)

        except Exception as e:
            logger.error(
                "product.create.failed",
                sku=product_data.sku,
                error=str(e),
                exc_info=True
            )
            raise
```

**Benefits:**

- Consistent event naming (`{domain}.{action}.{status}`)
- Structured fields (sku, product_id) are grep-able
- AI agents can find errors by searching for `.failed` events

### Metrics and Monitoring

Where do metrics go? **In `core/metrics.py` if using across features**, or **in feature slice if feature-specific**.

**Example: `core/metrics.py`**

```python
from prometheus_client import Counter, Histogram, Gauge
import time
from contextlib import contextmanager
from typing import Generator

# Application-wide metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["method", "endpoint"]
)

llm_requests_total = Counter(
    "llm_requests_total",
    "Total LLM API requests",
    ["provider", "model", "status"]
)

llm_tokens_used = Counter(
    "llm_tokens_used_total",
    "Total tokens used",
    ["provider", "model", "type"]  # type: prompt_tokens or completion_tokens
)


@contextmanager
def track_duration(metric: Histogram, **labels) -> Generator:
    """Context manager to track operation duration."""
    start = time.time()
    try:
        yield
    finally:
        duration = time.time() - start
        metric.labels(**labels).observe(duration)
```

**Usage in feature:**

```python
# products/service.py
from app.core.metrics import track_duration, http_request_duration_seconds

def list_products(self):
    with track_duration(http_request_duration_seconds, method="GET", endpoint="/products"):
        # ... implementation ...
        pass
```

**Expose metrics endpoint:**

```python
# app/main.py
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

## Advanced Patterns: The Messy 20%

The first 80% of vertical slice architecture is straightforward. This section covers the complicated 20% that every production application encounters.

### Database Migrations with Alembic

**The problem:** Features own their models, but Alembic migrations are typically centralized. How do you organize them?

**The solution:** Centralized migrations, feature-tagged naming.

```
alembic/
├── versions/
│   ├── 001_products_create_table.py
│   ├── 002_inventory_create_table.py
│   ├── 003_products_add_sku_index.py
│   ├── 004_orders_create_table.py
│   └── 005_products_inventory_foreign_key.py
└── env.py
```

**Setup in `core/database.py`:**

```python
from alembic import command
from alembic.config import Config


def run_migrations():
    """Run database migrations."""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
```

**Naming convention:**

- `{number}_{feature}_{description}.py`
- Makes it clear which feature the migration belongs to
- Easy to grep: `git log | grep products` shows all product migrations

**Feature ownership:**

- Each feature documents its migrations in its README
- Migration files reference the feature: `# Feature: products`
- AI can search migration files by feature name

### Cross-Feature Transactions

**The challenge:** Creating an order requires touching products (check availability), inventory (reserve stock), and orders (create record). How do you handle transactions across features?

**Option 1: Orchestrating Service (Recommended for most cases)**

```python
# orders/service.py
from sqlalchemy.orm import Session

from app.products.repository import ProductRepository
from app.inventory.repository import InventoryRepository
from app.orders.repository import OrderRepository
from app.core.database import get_db


class OrderService:
    """Service that orchestrates across multiple features."""

    def __init__(self, db: Session):
        self.db = db
        self.products = ProductRepository(db)
        self.inventory = InventoryRepository(db)
        self.orders = OrderRepository(db)

    def create_order(self, order_data: OrderCreate) -> OrderResponse:
        """Create order with transaction spanning multiple features."""
        try:
            # All repositories share the same session = single transaction
            for item in order_data.items:
                product = self.products.get(item.product_id)
                if not product:
                    raise ProductNotFoundError(f"Product {item.product_id} not found")

                # Check and reserve inventory
                available = self.inventory.check_availability(product.sku, item.quantity)
                if not available:
                    raise InsufficientInventoryError(f"Not enough stock for {product.sku}")

                self.inventory.reserve(product.sku, item.quantity)

            # Create the order
            order = self.orders.create(order_data)

            # Commit happens when session context closes
            self.db.commit()

            return OrderResponse.model_validate(order)

        except Exception as e:
            self.db.rollback()
            raise
```

**Why this works:**

- All repositories share one database session
- Transaction boundary is clear (explicit commit/rollback)
- Orchestrating service coordinates the workflow
- AI can trace the entire flow in one file

**Option 2: Unit of Work Pattern (For complex domains)**

```python
# core/uow.py
from sqlalchemy.orm import Session
from contextlib import contextmanager


class UnitOfWork:
    """Unit of work pattern for managing transactions."""

    def __init__(self, db: Session):
        self.db = db
        self._repositories = {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()
        else:
            self.rollback()

    def commit(self):
        """Commit the transaction."""
        self.db.commit()

    def rollback(self):
        """Rollback the transaction."""
        self.db.rollback()

    def get_repository(self, repo_class):
        """Get or create repository instance."""
        if repo_class not in self._repositories:
            self._repositories[repo_class] = repo_class(self.db)
        return self._repositories[repo_class]


# Usage in orders/service.py
from app.core.uow import UnitOfWork
from app.products.repository import ProductRepository
from app.inventory.repository import InventoryRepository

def create_order(order_data: OrderCreate, db: Session) -> OrderResponse:
    with UnitOfWork(db) as uow:
        products = uow.get_repository(ProductRepository)
        inventory = uow.get_repository(InventoryRepository)

        # All operations in one transaction
        for item in order_data.items:
            product = products.get(item.product_id)
            inventory.reserve(product.sku, item.quantity)

        # Transaction commits when exiting context
```

**Option 3: Events for Eventual Consistency (When immediate consistency isn't required)**

Use the event bus pattern from earlier, but accept that inventory might be briefly inconsistent.

### Feature-to-Feature Data Access

**The problem:** Inventory needs to read product names. Orders need product prices. How do features share data?

**Decision Matrix:**

| Scenario                         | Solution                    | Trade-offs              |
| -------------------------------- | --------------------------- | ----------------------- |
| **Read-only, frequently needed** | Shared read repository      | Coupling, but practical |
| **Updated frequently**           | Events + denormalization    | Eventually consistent   |
| **Cross-service boundaries**     | API calls                   | Network overhead        |
| **Reporting/analytics**          | Read replicas or CQRS views | Complexity              |

**Example: Shared Read Access**

```python
# inventory/service.py
from app.products.repository import ProductRepository  # Read-only access

class InventoryService:
    def __init__(self, db: Session):
        self.inventory_repo = InventoryRepository(db)
        self.product_repo = ProductRepository(db)  # For reads only

    def get_inventory_with_details(self, sku: str):
        inventory = self.inventory_repo.get_by_sku(sku)
        product = self.product_repo.get_by_sku(sku)  # READ only, no writes

        return InventoryDetailResponse(
            sku=sku,
            quantity=inventory.quantity,
            product_name=product.name,  # From products feature
        )
```

**Critical rule:** If Feature A reads from Feature B's tables:

1. **Never write** to Feature B's tables from Feature A
2. Document the dependency in both feature READMEs
3. Consider events for writes, direct reads for queries

### Authentication: The Dual-Nature Feature

Authentication is unique—it's both a feature (login/register) and infrastructure (authorization).

**Structure:**

```
app/
├── core/
│   └── dependencies.py         # get_current_user() - used everywhere
├── auth/                       # Feature slice
│   ├── routes.py               # Login, register, password reset
│   ├── service.py              # User creation, token generation
│   ├── models.py               # User model
│   └── utils.py                # Password hashing, JWT helpers
```

**`core/dependencies.py`:**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.utils import decode_jwt
from app.auth.models import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    token = credentials.credentials

    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        return user

    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency requiring admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return current_user
```

**Why split this way:**

- `auth/` owns user data and authentication logic
- `core/dependencies.py` provides reusable FastAPI dependencies
- Other features just use `Depends(get_current_user)` without importing from `auth/`

### External API Clients (Stripe, SendGrid, etc.)

**Decision rule:**

| Usage                      | Location                             | Example                        |
| -------------------------- | ------------------------------------ | ------------------------------ |
| **Used by 1 feature only** | Inside that feature's directory      | `payments/stripe_client.py`    |
| **Used by 2-3 features**   | Duplicate or use shared with caution |                                |
| **Used by 3+ features**    | `shared/integrations/`               | `shared/integrations/email.py` |

**Example: Email client used by many features**

```
app/shared/integrations/
├── __init__.py
├── email.py                # SendGrid client
├── storage.py              # S3 client
└── payment.py              # Stripe client
```

```python
# shared/integrations/email.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from functools import lru_cache

from app.core.config import get_settings


@lru_cache()
def get_email_client() -> SendGridAPIClient:
    """Get cached SendGrid client."""
    settings = get_settings()
    return SendGridAPIClient(api_key=settings.sendgrid_api_key)


def send_email(to: str, subject: str, body: str) -> None:
    """Send email via SendGrid."""
    client = get_email_client()
    settings = get_settings()

    message = Mail(
        from_email=settings.from_email,
        to_emails=to,
        subject=subject,
        html_content=body
    )

    client.send(message)
```

**Example: Feature-specific client**

```python
# payments/stripe_client.py
import stripe
from functools import lru_cache

from app.core.config import get_settings


@lru_cache()
def get_stripe_client():
    """Get configured Stripe client."""
    settings = get_settings()
    stripe.api_key = settings.stripe_api_key
    return stripe


def create_payment_intent(amount: int, currency: str = "usd"):
    """Create Stripe payment intent."""
    client = get_stripe_client()
    return client.PaymentIntent.create(amount=amount, currency=currency)
```

### Background Tasks and Workers

Where do async jobs go? It depends on scope.

**Structure:**

```
app/
├── core/
│   └── worker.py               # Celery/RQ configuration
├── products/
│   ├── tasks.py                # Product-specific background tasks
│   └── service.py
└── shared/
    └── tasks.py                # Cross-feature tasks (cleanup, etc.)
```

**Example: `core/worker.py`**

```python
from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "app",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
```

**Example: `products/tasks.py`**

```python
from app.core.worker import celery_app
from app.core.database import SessionLocal
from app.products.service import ProductService
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task
def sync_product_to_search_index(product_id: int):
    """Background task to sync product to search index."""
    logger.info("search_sync.started", product_id=product_id)

    db = SessionLocal()
    try:
        service = ProductService(db)
        product = service.get_product(product_id)

        # Sync to Elasticsearch, Algolia, etc.
        # ... implementation ...

        logger.info("search_sync.completed", product_id=product_id)
    except Exception as e:
        logger.error("search_sync.failed", product_id=product_id, error=str(e), exc_info=True)
        raise
    finally:
        db.close()


@celery_app.task
def generate_product_images(product_id: int):
    """Background task to generate product thumbnails."""
    # Implementation...
    pass
```

**Usage in service:**

```python
# products/service.py
from app.products.tasks import sync_product_to_search_index

class ProductService:
    def create_product(self, product_data: ProductCreate) -> ProductResponse:
        product = self.repository.create(product_data)

        # Trigger background task
        sync_product_to_search_index.delay(product.id)

        return ProductResponse.model_validate(product)
```

### Caching Strategy

**Structure:**

```
app/core/
└── cache.py                    # Redis client setup

app/products/
└── cache.py                    # Product-specific cache keys and logic
```

**Example: `core/cache.py`**

```python
import redis
from functools import lru_cache

from app.core.config import get_settings


@lru_cache()
def get_redis_client() -> redis.Redis:
    """Get cached Redis client."""
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)
```

**Example: `products/cache.py`**

```python
from typing import Optional
import json

from app.core.cache import get_redis_client
from app.products.schemas import ProductResponse

CACHE_TTL = 3600  # 1 hour


def get_cache_key(product_id: int) -> str:
    """Generate cache key for product."""
    return f"product:{product_id}"


def get_cached_product(product_id: int) -> Optional[ProductResponse]:
    """Get product from cache."""
    redis = get_redis_client()
    key = get_cache_key(product_id)

    cached = redis.get(key)
    if cached:
        return ProductResponse.model_validate_json(cached)
    return None


def cache_product(product: ProductResponse) -> None:
    """Cache product data."""
    redis = get_redis_client()
    key = get_cache_key(product.id)
    redis.setex(key, CACHE_TTL, product.model_dump_json())


def invalidate_product_cache(product_id: int) -> None:
    """Remove product from cache."""
    redis = get_redis_client()
    key = get_cache_key(product_id)
    redis.delete(key)
```

**Usage in service:**

```python
# products/service.py
from app.products.cache import get_cached_product, cache_product, invalidate_product_cache

class ProductService:
    def get_product(self, product_id: int) -> ProductResponse:
        # Try cache first
        cached = get_cached_product(product_id)
        if cached:
            return cached

        # Cache miss - fetch from DB
        product = self.repository.get(product_id)
        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        response = ProductResponse.model_validate(product)

        # Update cache
        cache_product(response)

        return response

    def update_product(self, product_id: int, product_data: ProductUpdate) -> ProductResponse:
        product = self.repository.update(product_id, product_data)

        # Invalidate cache on update
        invalidate_product_cache(product_id)

        return ProductResponse.model_validate(product)
```

### File Storage (S3, Local, etc.)

**Structure:**

```
app/shared/integrations/
└── storage.py                  # S3/storage client

app/products/
└── storage.py                  # Product-specific upload logic
```

**Example: `shared/integrations/storage.py`**

```python
import boto3
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


@lru_cache()
def get_s3_client():
    """Get cached S3 client."""
    settings = get_settings()
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def upload_file(file_path: str, key: str, bucket: str | None = None) -> str:
    """Upload file to S3 and return URL."""
    settings = get_settings()
    bucket = bucket or settings.s3_bucket

    s3 = get_s3_client()
    s3.upload_file(file_path, bucket, key)

    return f"https://{bucket}.s3.amazonaws.com/{key}"


def delete_file(key: str, bucket: str | None = None) -> None:
    """Delete file from S3."""
    settings = get_settings()
    bucket = bucket or settings.s3_bucket

    s3 = get_s3_client()
    s3.delete_object(Bucket=bucket, Key=key)
```

**Example: `products/storage.py`**

```python
from pathlib import Path
from uuid import uuid4

from app.shared.integrations.storage import upload_file, delete_file


def upload_product_image(file_path: str, product_id: int) -> str:
    """Upload product image and return URL."""
    file_ext = Path(file_path).suffix
    key = f"products/{product_id}/{uuid4()}{file_ext}"

    url = upload_file(file_path, key)
    return url


def delete_product_images(product_id: int) -> None:
    """Delete all images for a product."""
    # List and delete all objects with prefix products/{product_id}/
    # Implementation depends on storage backend
    pass
```

### Enhanced Health Checks

Simple `/health` endpoints aren't enough for production. Check actual dependencies.

**Example: `core/health.py`**

```python
from fastapi import status
from sqlalchemy import text

from app.core.database import SessionLocal
from app.core.cache import get_redis_client
from app.core.logging import get_logger

logger = get_logger(__name__)


def check_database() -> dict:
    """Check database connectivity."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy"}
    except Exception as e:
        logger.error("health.database.failed", error=str(e))
        return {"status": "unhealthy", "error": str(e)}


def check_redis() -> dict:
    """Check Redis connectivity."""
    try:
        redis = get_redis_client()
        redis.ping()
        return {"status": "healthy"}
    except Exception as e:
        logger.error("health.redis.failed", error=str(e))
        return {"status": "unhealthy", "error": str(e)}


def check_health() -> dict:
    """Comprehensive health check."""
    checks = {
        "database": check_database(),
        "redis": check_redis(),
    }

    overall_healthy = all(check["status"] == "healthy" for check in checks.values())

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "checks": checks,
    }
```

**Usage in `main.py`:**

```python
from app.core.health import check_health

@app.get("/health")
def health():
    """Health check endpoint."""
    result = check_health()
    status_code = 200 if result["status"] == "healthy" else 503
    return JSONResponse(content=result, status_code=status_code)
```

### Handling Very Large Features

When a feature grows beyond 15 files, consider sub-features:

```
app/products/
├── __init__.py
├── routes.py                   # Main product routes
├── catalog/                    # Sub-feature
│   ├── routes.py
│   ├── service.py
│   ├── schemas.py
│   └── README.md
├── pricing/                    # Sub-feature
│   ├── routes.py
│   ├── service.py
│   ├── engine.py               # Pricing calculation engine
│   └── README.md
└── images/                     # Sub-feature
    ├── routes.py
    ├── service.py
    ├── storage.py
    └── tasks.py                # Image processing
```

**When to split:**

- Feature has 20+ files
- Clear sub-domains emerge (catalog vs pricing vs images)
- Different developers work on different sub-features

**How to register sub-feature routes:**

```python
# products/__init__.py
from fastapi import APIRouter

from app.products import routes
from app.products.catalog import routes as catalog_routes
from app.products.pricing import routes as pricing_routes

router = APIRouter(prefix="/products")
router.include_router(routes.router)
router.include_router(catalog_routes.router, prefix="/catalog")
router.include_router(pricing_routes.router, prefix="/pricing")
```

### API Versioning

**Structure:**

```
app/products/
├── v1/
│   ├── routes.py
│   ├── schemas.py               # V1 schemas
│   └── serializers.py           # V1-specific transformations
├── v2/
│   ├── routes.py
│   ├── schemas.py               # V2 schemas (breaking changes)
│   └── serializers.py
├── service.py                   # Shared business logic
└── repository.py                # Shared data access
```

**Main router:**

```python
# main.py
from app.products.v1 import routes as products_v1
from app.products.v2 import routes as products_v2

app.include_router(products_v1.router, prefix="/v1")
app.include_router(products_v2.router, prefix="/v2")
```

**Why this works:**

- Service and repository are shared (business logic doesn't change)
- Schemas differ per version (API contract changes)
- Routes can transform data between schema versions

### Testing Cross-Feature Workflows

Tests that span features don't belong in any single feature. Create integration tests:

```
tests/
├── conftest.py                 # Shared fixtures
├── integration/
│   ├── test_order_creation.py  # Tests products + inventory + orders
│   ├── test_checkout_flow.py  # Tests cart + payments + orders
│   └── test_search_indexing.py # Tests products + search
└── unit/                       # Optional: mirror app structure
```

**Example: `tests/integration/test_order_creation.py`**

```python
import pytest
from decimal import Decimal

def test_create_order_full_flow(db, client):
    """Test complete order creation spanning multiple features."""

    # 1. Create product (products feature)
    product_response = client.post("/products", json={
        "name": "Test Product",
        "sku": "TEST-001",
        "price": "99.99"
    })
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    # 2. Add inventory (inventory feature)
    client.post("/inventory", json={
        "sku": "TEST-001",
        "quantity": 100
    })

    # 3. Create order (orders feature)
    order_response = client.post("/orders", json={
        "items": [{"product_id": product_id, "quantity": 2}]
    })
    assert order_response.status_code == 201

    # 4. Verify inventory was reserved (inventory feature)
    inventory_response = client.get("/inventory/TEST-001")
    assert inventory_response.json()["quantity"] == 98
```

### Feature Flags

**Structure:**

```
app/core/
└── feature_flags.py            # Feature flag client

app/products/
└── flags.py                    # Product-specific flags
```

**Example: `core/feature_flags.py`**

```python
from enum import Enum
from functools import lru_cache


class FeatureFlag(str, Enum):
    """Global feature flags."""
    NEW_CHECKOUT = "new_checkout"
    ADVANCED_SEARCH = "advanced_search"
    BULK_PRICING = "bulk_pricing"


@lru_cache()
def is_feature_enabled(flag: FeatureFlag) -> bool:
    """Check if feature flag is enabled."""
    # Integration with LaunchDarkly, ConfigCat, or environment variables
    import os
    env_key = f"FEATURE_{flag.value.upper()}"
    return os.getenv(env_key, "false").lower() == "true"
```

**Usage in feature:**

```python
# products/service.py
from app.core.feature_flags import is_feature_enabled, FeatureFlag

def calculate_price(self, product: Product, quantity: int) -> Decimal:
    base_price = product.price * quantity

    if is_feature_enabled(FeatureFlag.BULK_PRICING):
        # Apply bulk discount
        return self._apply_bulk_discount(base_price, quantity)

    return base_price
```

### Rate Limiting

**Structure:**

```
app/core/
└── rate_limit.py               # Rate limiting middleware/decorators

app/products/
└── routes.py                   # Use rate limit decorators
```

**Example: `core/rate_limit.py`**

```python
from fastapi import Request, HTTPException, status
from app.core.cache import get_redis_client
from functools import wraps
import time


def rate_limit(max_requests: int, window_seconds: int):
    """Rate limit decorator for routes."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or args[0]
            client_ip = request.client.host

            redis = get_redis_client()
            key = f"rate_limit:{client_ip}:{func.__name__}"

            current = redis.get(key)
            if current and int(current) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )

            pipe = redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            pipe.execute()

            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

**Usage:**

```python
# products/routes.py
from app.core.rate_limit import rate_limit

@router.post("/")
@rate_limit(max_requests=100, window_seconds=60)
def create_product(product_data: ProductCreate):
    # Implementation
    pass
```

### Docker and Deployment

**Project structure for Docker:**

```
my-fastapi-app/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── app/
├── tests/
└── requirements.txt            # Generated from pyproject.toml
```

**Example: `Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen

# Copy application code
COPY ./app ./app

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

**Example: `docker-compose.yml`**

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### CLI and Management Commands

**Structure:**

```
app/
├── cli.py                      # Main CLI entry point
└── products/
    └── cli.py                  # Product-specific commands
```

**Example: `app/cli.py`**

```python
import typer

app = typer.Typer()


@app.command()
def migrate():
    """Run database migrations."""
    from app.core.database import run_migrations
    run_migrations()
    typer.echo("Migrations completed successfully")


@app.command()
def create_admin(email: str, password: str):
    """Create admin user."""
    from app.auth.service import AuthService
    from app.core.database import SessionLocal

    db = SessionLocal()
    service = AuthService(db)

    user = service.create_admin_user(email, password)
    typer.echo(f"Admin user created: {user.email}")


if __name__ == "__main__":
    app()
```

**Example: `products/cli.py`**

```python
import typer
import csv

app = typer.Typer()


@app.command()
def import_products(csv_file: str):
    """Import products from CSV file."""
    from app.products.service import ProductService
    from app.core.database import SessionLocal

    db = SessionLocal()
    service = ProductService(db)

    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            service.create_product(ProductCreate(**row))
            typer.echo(f"Imported: {row['sku']}")


if __name__ == "__main__":
    app()
```

**Usage:**

```bash
# Run migrations
python -m app.cli migrate

# Create admin user
python -m app.cli create-admin admin@example.com password123

# Import products
python -m app.products.cli import-products data.csv
```

## Testing Strategy for Vertical Slices

Each feature is independently testable. Tests live next to the code they test.

### Test Structure

```
app/products/
├── routes.py
├── service.py
├── repository.py
├── test_routes.py        # Integration tests (FastAPI test client)
├── test_service.py       # Unit tests (business logic)
└── test_repository.py    # Unit tests (data access)
```

### Example: `test_service.py`

```python
import pytest
from decimal import Decimal
from sqlalchemy.orm import Session

from app.products.service import ProductService
from app.products.schemas import ProductCreate
from app.products.exceptions import ProductNotFoundError, ProductAlreadyExistsError


def test_create_product_success(db: Session):
    """Test successful product creation."""
    service = ProductService(db)

    product_data = ProductCreate(
        name="Test Product",
        sku="TEST-001",
        price=Decimal("99.99"),
        description="A test product"
    )

    result = service.create_product(product_data)

    assert result.name == "Test Product"
    assert result.sku == "TEST-001"
    assert result.price == Decimal("99.99")
    assert result.id is not None


def test_create_product_duplicate_sku(db: Session):
    """Test creating product with duplicate SKU fails."""
    service = ProductService(db)

    # Create first product
    product_data = ProductCreate(
        name="Test Product",
        sku="TEST-001",
        price=Decimal("99.99")
    )
    service.create_product(product_data)

    # Attempt to create duplicate
    with pytest.raises(ProductAlreadyExistsError):
        service.create_product(product_data)


def test_get_product_not_found(db: Session):
    """Test getting non-existent product raises error."""
    service = ProductService(db)

    with pytest.raises(ProductNotFoundError):
        service.get_product(999999)
```

### Test Fixtures

**Shared fixtures in `tests/conftest.py`:**

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.database import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Session:
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
```

**Feature-specific fixtures in test file:**

```python
# app/products/test_service.py
import pytest
from app.products.models import Product
from decimal import Decimal


@pytest.fixture
def sample_product(db):
    """Create a sample product for testing."""
    product = Product(
        name="Sample Product",
        sku="SAMPLE-001",
        price=Decimal("49.99"),
        is_active=True
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
```

## The README: Your AI Agent's North Star

Every feature directory should have a README. This is critical for AI agents navigating your codebase.

### Example: `app/products/README.md`

````markdown
# Products Feature

Manages product catalog including CRUD operations, pricing, and inventory tracking integration.

## Key Flows

### Create Product

1. Validate product data (name, SKU, price)
2. Check SKU doesn't exist
3. Create product in database
4. Log creation event
5. Return product response

### Update Product

1. Fetch product by ID
2. Validate update data
3. Apply changes to product
4. Commit to database
5. Return updated product

## Database Schema

Table: `products`

- `id` (Integer, PK)
- `sku` (String, Unique)
- `name` (String)
- `description` (Text, nullable)
- `price` (Numeric)
- `is_active` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## API Endpoints

- `POST /products` - Create product
- `GET /products/{id}` - Get product by ID
- `GET /products` - List products (paginated)
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

## Dependencies

- Database session (from `core.database`)
- Logger (from `core.logging`)
- Pagination params (from `shared.schemas`)

## Business Rules

1. SKU must be unique across all products
2. Price must be positive with max 2 decimal places
3. Deleted products use soft delete (set `is_active=False`)
4. All prices stored in USD

## Integration Points

- **Inventory**: Products link to inventory records by SKU
- **Orders**: Order items reference products by ID
- **Search**: Product changes trigger search index update

## Testing

Run feature tests:

```bash
pytest app/products/test_*.py
```
````

Key test scenarios:

- Create product with valid/invalid data
- Duplicate SKU handling
- Price validation
- Soft delete behavior

````

**Why this helps AI:**
- AI reads the README before diving into code
- Clear flows guide AI's understanding
- Business rules prevent AI from breaking constraints
- Integration points show dependencies between features

## Configuration Best Practices

### Environment Variables

Create `.env.example` with all required variables:

```bash
# .env.example
# Application
APP_NAME="My FastAPI App"
DEBUG=False
VERSION="1.0.0"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Security
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# LLM Providers (if using AI features)
ANTHROPIC_API_KEY="your-key-here"
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
OPENAI_API_KEY="your-key-here"
OPENAI_MODEL="gpt-4o"

# Observability
LOG_LEVEL="INFO"
ENABLE_METRICS=True
````

### Feature-Specific Configuration

Sometimes features need their own config. Where does it go?

**Option 1: In `core/config.py` (simpler)**

```python
class Settings(BaseSettings):
    # ... other settings ...

    # Product feature settings
    max_product_image_size_mb: int = 5
    allowed_product_image_types: list[str] = ["jpg", "png", "webp"]
```

**Option 2: Feature-specific config class (more modular)**

```python
# products/config.py
from pydantic_settings import BaseSettings


class ProductSettings(BaseSettings):
    """Product feature configuration."""
    max_image_size_mb: int = 5
    allowed_image_types: list[str] = ["jpg", "png", "webp"]
    default_currency: str = "USD"

    model_config = SettingsConfigDict(env_prefix="PRODUCT_")


product_settings = ProductSettings()
```

**When to use Option 2:** Feature has 5+ settings, or settings might vary by deployment.

## Common Pitfalls and Solutions

### Pitfall 1: Over-Extracting to Shared Too Early

**Problem:** Moving code to `shared/` after seeing it twice, creating unnecessary coupling.

**Solution:** Wait for the third instance. Duplicate code in 2 places is better than the wrong abstraction.

### Pitfall 2: Putting Feature Logic in Core

**Problem:** Adding feature-specific code to `core/` because "it's important."

**Solution:** `core/` is for universal infrastructure only. If it's feature-specific, it goes in the feature slice.

### Pitfall 3: Creating Circular Dependencies

**Problem:** Feature A imports from Feature B, which imports from Feature A.

**Solution:** Extract the shared interface to `shared/` or use domain events for cross-feature communication.

```python
# Instead of: products importing from inventory
# Do this: Both use shared event system

# shared/events.py
from typing import Callable, Dict, List
from dataclasses import dataclass


@dataclass
class Event:
    """Base class for domain events."""
    pass


@dataclass
class ProductCreatedEvent(Event):
    """Fired when a new product is created."""
    product_id: int
    sku: str


class EventBus:
    """Simple event bus for cross-feature communication."""

    def __init__(self):
        self._handlers: Dict[type, List[Callable]] = {}

    def subscribe(self, event_type: type, handler: Callable):
        """Subscribe to an event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def publish(self, event: Event):
        """Publish an event to all subscribers."""
        event_type = type(event)
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                handler(event)


event_bus = EventBus()
```

### Pitfall 4: Not Documenting Feature Boundaries

**Problem:** Team doesn't know where code belongs, leading to inconsistency.

**Solution:** Create `ARCHITECTURE.md` with clear guidelines:

```markdown
# Architecture Guidelines

## Where Does Code Go?

### `core/`

- Database connection setup
- Logging configuration
- Global exception handlers
- Application lifecycle events
- Settings/config management

### `shared/`

- Base models (mixins like TimestampMixin)
- Common schemas (PaginationParams)
- Generic utilities (date formatting, string helpers)
- Standard response formats
- Must be used by 3+ features

### Feature Slices (`app/{feature}/`)

- All feature-specific code
- Routes, service, repository, models
- Feature-specific exceptions
- Feature-specific validators
- Tests for the feature

### `llm/` (if building AI features)

- LLM client wrappers
- Prompt templates
- Tool registry for function calling
- Message formatting utilities

## Decision Flowchart

Does it exist before any features? → `core/`
Used by 3+ features? → `shared/`
Feature-specific? → Feature slice
```

## Checklist: Is Your Project AI-Ready?

Use this checklist to audit your Vertical Slice project:

**✅ Structure**

- [ ] Clear `core/` directory with foundational infrastructure
- [ ] Optional `shared/` for genuinely shared utilities
- [ ] Each feature in its own directory with complete implementation
- [ ] No circular dependencies between features
- [ ] Clear separation between infrastructure and features

**✅ Documentation**

- [ ] Root `README.md` explains architecture and setup
- [ ] Each feature has its own `README.md` explaining purpose and flows
- [ ] `ARCHITECTURE.md` or similar documenting where code goes
- [ ] ADRs for major architectural decisions

**✅ Configuration**

- [ ] Single `core/config.py` for all settings
- [ ] `.env.example` with all required variables
- [ ] Settings validated with Pydantic
- [ ] Sensitive values never committed to git

**✅ Observability**

- [ ] Structured logging with consistent event naming
- [ ] Correlation IDs for request tracing
- [ ] Metrics for key operations
- [ ] Health check endpoint

**✅ Testing**

- [ ] Tests colocated with feature code
- [ ] Fixtures for common test data
- [ ] Unit tests for business logic
- [ ] Integration tests for endpoints

**✅ Developer Experience**

- [ ] Fast setup (30-60 min from clone to running)
- [ ] Clear commands in README for common tasks
- [ ] Linting and formatting configured (Ruff)
- [ ] Type checking configured (MyPy)
- [ ] Pre-commit hooks optional but documented

**✅ AI Agent Friendliness**

- [ ] Files under 300 lines each
- [ ] Explicit dependencies (no hidden globals)
- [ ] Clear, descriptive naming
- [ ] Minimal "magic" and metaprogramming
- [ ] Feature code is self-contained and discoverable

## Conclusion: Build for Change, Optimize for Understanding

Vertical Slice Architecture isn't about following dogma. It's about organizing code so both humans and AI can understand it quickly, modify it safely, and extend it easily.

The principles:

- **Start with infrastructure** - Core first, features second
- **Keep features isolated** - Everything related lives together
- **Duplicate until proven shared** - Three-feature rule for extraction
- **Document liberally** - READMEs are AI's navigation system
- **Make implicit explicit** - No hidden dependencies or magic
- **Test at the feature level** - Colocated tests, fast feedback

When you need to add a feature, you should know exactly where it goes. When AI needs to modify a feature, it should find all related code in one place. When something breaks, logs should point directly to the responsible slice.

This is how you build systems that scale with both team size and AI assistance.

Start your next project with Vertical Slice Architecture. Your future self—and your AI coding assistants—will thank you.

---

**About the Author**

Rasmus Widing is a Product Builder and AI adoption specialist who has been using AI to build agents, automations, and web apps for over three years. He created the PRP (Product Requirements Prompts) framework for agentic engineering, now used by hundreds of engineers. He helps teams adopt AI through systematic frameworks, workshops, and training at [rasmuswiding.com](https://rasmuswiding.com).

_Want to dive deeper? Check out my PRP framework on GitHub: [github.com/Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng)_

---

## Quick Reference: Project Structure Template

```
my-fastapi-app/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── cli.py                     # Main CLI entry point
│   │
│   ├── core/                      # Foundation (exists before features)
│   │   ├── __init__.py
│   │   ├── config.py              # Settings and environment
│   │   ├── database.py            # DB connection and session
│   │   ├── logging.py             # Structured logging with request IDs
│   │   ├── middleware.py          # Request/response middleware
│   │   ├── exceptions.py          # Base exception classes
│   │   ├── dependencies.py        # Global FastAPI dependencies
│   │   ├── events.py              # Application lifecycle
│   │   ├── cache.py               # Redis client
│   │   ├── worker.py              # Celery configuration
│   │   ├── health.py              # Health checks
│   │   ├── rate_limit.py          # Rate limiting
│   │   ├── feature_flags.py       # Feature toggles
│   │   └── uow.py                 # Unit of Work (optional)
│   │
│   ├── shared/                    # Cross-feature utilities (3+ features)
│   │   ├── __init__.py
│   │   ├── models.py              # Base models, mixins
│   │   ├── schemas.py             # Common Pydantic schemas
│   │   ├── utils.py               # Generic utilities
│   │   ├── validators.py          # Reusable validators
│   │   ├── responses.py           # Standard response formats
│   │   ├── events.py              # Domain events and event bus
│   │   ├── tasks.py               # Cross-feature background tasks
│   │   └── integrations/          # External API clients
│   │       ├── __init__.py
│   │       ├── email.py           # SendGrid, SES, etc.
│   │       ├── storage.py         # S3, GCS, etc.
│   │       └── payment.py         # Stripe, PayPal, etc.
│   │
│   ├── llm/                       # LLM infrastructure (if building AI)
│   │   ├── __init__.py
│   │   ├── clients.py             # LLM client wrappers
│   │   ├── prompts.py             # Prompt management
│   │   ├── tools.py               # Tool registry
│   │   └── messages.py            # Message formatting
│   │
│   ├── products/                  # Feature slice
│   │   ├── __init__.py
│   │   ├── routes.py              # FastAPI endpoints
│   │   ├── service.py             # Business logic
│   │   ├── repository.py          # Data access
│   │   ├── models.py              # Database models
│   │   ├── schemas.py             # Request/response schemas
│   │   ├── exceptions.py          # Feature exceptions
│   │   ├── validators.py          # Feature validators
│   │   ├── dependencies.py        # Feature dependencies
│   │   ├── constants.py           # Feature constants
│   │   ├── cache.py               # Feature-specific caching (optional)
│   │   ├── tasks.py               # Background jobs (optional)
│   │   ├── storage.py             # File operations (optional)
│   │   ├── cli.py                 # CLI commands (optional)
│   │   ├── config.py              # Feature config (optional)
│   │   ├── test_routes.py         # Integration tests
│   │   ├── test_service.py        # Unit tests
│   │   └── README.md              # Feature documentation
│   │
│   └── inventory/                 # Another feature slice
│       └── ...                    # (same structure as products/)
│
├── alembic/                       # Database migrations
│   ├── versions/
│   │   ├── 001_products_create_table.py
│   │   ├── 002_inventory_create_table.py
│   │   └── ...
│   ├── env.py
│   └── alembic.ini
│
├── tests/
│   ├── conftest.py                # Shared test fixtures
│   ├── integration/               # Cross-feature tests
│   │   ├── test_order_creation.py
│   │   └── ...
│   └── # Feature-specific unit tests live in the feature slice directory
│

├── docs/
│   └── architecture/
│       └── adr/                   # Architecture Decision Records
│           ├── 001-use-vertical-slice.md
│           └── ...
│
├── .env                           # Local environment (gitignored)
├── .env.example                   # Template for .env
├── Dockerfile                     # Docker configuration
├── docker-compose.yml             # Local dev environment
├── .dockerignore                  # Docker ignore patterns
├── pyproject.toml                 # Dependencies and config
├── uv.lock                        # Locked dependencies
├── README.md                      # Project overview
├── ARCHITECTURE.md                # Architecture guidelines
└── .gitignore
```

**Copy this structure. Adjust as needed. Ship features.**
