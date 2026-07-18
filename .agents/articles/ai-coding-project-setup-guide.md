# Setting Up Your Project for AI Coding Success: A Practical Framework

**By Rasmus Widing**
_Product Builder | AI Adoption Specialist | Creator of the PRP Framework_

After three years of building software with AI coding tools—having transitioned from product management—and helping hundreds of engineers adopt agentic workflows, I've learned that **success with AI-assisted development isn't about the prompts you write—it's about the infrastructure you build**.

This article distills the timeless principles I've discovered for creating codebases that amplify AI productivity rather than fight against it. Whether you're using Cursor, Claude Code, or any other AI coding assistant, these patterns will make your AI agent more reliable, predictable, and effective.

## The Core Principle: Green Checks = Done

Here's the fundamental shift in mindset: **the AI agent isn't done until all checks are green**.

When working with AI agents, success isn't about generating perfect code on the first attempt—it's about creating a self-assessment loop. The agent writes code, runs linters and type checkers, sees what fails, fixes it, and repeats until everything passes. No human intervention needed.

This transforms linting and type checking from passive quality gates into an active feedback system. Your agent iterates automatically, guided by clear, actionable errors. By the time code reaches you, the grunt work is done—you focus on logic and architecture, not missing semicolons.

## The Seven Pillars of AI-Ready Codebases

Through my experience building the PRP (Product Requirements Prompts) methodology and working with engineering teams on AI adoption, I've identified seven critical categories that separate AI-friendly codebases from AI-hostile ones.

### 1. Grep-ability: Make Your Code Searchable

AI agents navigate codebases through search. If your patterns aren't grep-able, your agent will hallucinate implementations instead of finding real ones.

**Core Rules:**

- **Ban default exports, mandate named exports** - An agent should be able to search for `export function createUser` and find exactly one definition
- **Use explicit, typed DTOs** - Instead of inline object types, create searchable type definitions
- **Consistent error types** - Don't scatter `new Error()` calls; create `UserNotFoundError`, `ValidationError`, etc.
- **Avoid magic strings** - Use enums or constants that can be searched

**Examples:**

```typescript
// ❌ AI-hostile: Default exports are invisible to search
export default function handler(req, res) { ... }

// ✅ AI-friendly: Named exports are grep-able
export function handleUserRegistration(req: Request, res: Response) { ... }
```

```python
# ❌ AI-hostile: Generic names, magic strings
def handler(request):
    if request.type == "user":  # Magic string
        return {"status": "ok"}

# ✅ AI-friendly: Explicit names, searchable constants
from app.constants import RequestType

def handle_user_registration(request: Request) -> Response:
    if request.type == RequestType.USER_REGISTRATION:
        return UserResponse(status=ResponseStatus.SUCCESS)
```

### 2. Glob-ability: Predictable File Structure

AI agents use file patterns to navigate. If your structure is chaotic, agents waste tokens asking "where should this go?"

**Core Rules:**

- **Collocate by feature, not by type** - Group `users/routes.py`, `users/types.py`, `users/service.py` together
- **Standardized file naming** - Always use `types.py`, `enums.py`, `helpers.py`, `service.py`, `test_*.py`
- **Tests live next to code** - Place `test_user_service.py` next to `user_service.py`
- **Absolute imports** - Use `from app.users.service import UserService` not `from ...users.service import UserService`

**Why it matters:** When an agent needs to add authentication logic, it should instantly know to look for `auth/service.py` and `auth/types.py` without burning tokens exploring your entire codebase.

### 3. Architectural Boundaries: Enforce Layers

AI agents are terrible at respecting implicit boundaries. They'll happily import your database layer into your API responses if you don't stop them. Make boundaries explicit through linting.

**Core Rules:**

- **Prevent cross-layer imports** - Database layer shouldn't import from HTTP layer
- **Use import allowlists/denylists** - Configure your linter to block `src/database` from importing `src/api`
- **Explicit dependency injection points** - Don't let agents create hidden dependencies

**Ruff Configuration (Python/FastAPI):**

```toml
[tool.ruff.lint]
select = ["I"]  # Import sorting and organization

[tool.ruff.lint.isort]
sections = ["FUTURE", "STDLIB", "THIRDPARTY", "FIRSTPARTY", "LOCALFOLDER"]
force-single-line = false
force-sort-within-sections = true
```

### 4. Security & Privacy: Automated Safety Nets

Agents don't think about security—you must encode it into their constraints.

**Core Rules:**

- **Block hardcoded secrets** - Use `S105`, `S106` (flake8-bandit) rules to catch hardcoded passwords
- **Require input validation** - Never let raw user input reach business logic
- **Ban dangerous functions** - Block `eval()`, `exec()`, and similar
- **Enforce security patterns** - Require parameterized queries, not string concatenation

**Ruff Configuration:**

```toml
[tool.ruff.lint]
select = [
    "S",    # flake8-bandit (security)
    "B",    # flake8-bugbear (common pitfalls)
]
ignore = [
    "S311",  # Standard pseudo-random generators (OK for non-crypto)
]
```

### 5. Testability: Tests Are Non-Negotiable

Simon Willison nailed it: "Tests are non-negotiable, and AI removes all excuses to not write them." Test generation is fast with AI—there's no reason to skip it.

**Core Rules:**

- **Tests collocated with code** - `test_user_service.py` lives next to `user_service.py`
- **No network calls in unit tests** - Use mocks/fixtures
- **Assert on behavior, not implementation** - This is where AI often fails

**The Assertion Problem: AI Tests Lie**

Here's the dirty secret nobody talks about: **AI-generated tests pass, look beautiful, and assert complete nonsense**.

```python
# ❌ AI-generated assertion (wrong but looks right)
def test_calculate_discount():
    result = calculate_discount(price=100, code="SAVE20")
    assert result == 80  # AI guessed 20% off

# ✅ Human-validated assertion (correct)
def test_calculate_discount():
    result = calculate_discount(price=100, code="SAVE20")
    assert result == 85  # Actually 15% off in our system
```

**Why this happens:** LLMs don't know your business logic. They guess based on naming (`SAVE20` → probably 20% off). They're wrong just often enough to burn you in production.

**Two strategies that work:**

1. **Design assertions upfront**: Include explicit test cases and edge cases in your prompt. "Test that SAVE20 gives 15% off, not 20%. Test that discount doesn't exceed product price."

2. **Check assertions after**: Let AI generate test structure and mocks, but treat every assertion as guilty until proven innocent. This is the one place where you must remain in the loop.

**Ruff Configuration for Tests:**

```toml
[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = [
    "S101",   # Allow assert in tests
    "ANN",    # Skip type annotations in tests
    "ARG",    # Allow unused arguments in test fixtures
]
```

### 6. Observability: Structured Logging

AI agents need to add logging, but unstructured logs are noise. Make logging patterns grep-able and consistent.

**Core Rules:**

- **Structured logging only** - Use JSON logging with consistent field names
- **Standardized log levels** - `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Hybrid dotted namespace pattern** - Use `domain.component.action_state` format
- **Include context** - Always log `user_id`, `request_id`, `correlation_id`

**Event Naming Pattern:**

Format: `{domain}.{component}.{action}_{state}`

Examples:

- `user.registration_started` - User registration initiated
- `product.create_completed` - Product created successfully
- `agent.tool.execution_failed` - Agent tool execution failed
- `database.connection_initialized` - Database connection established

**Why This Pattern:**

- **OpenTelemetry compliant** - Follows 2024-2025 semantic conventions
- **AI/LLM parseable** - Hierarchical structure for pattern recognition
- **Grep-friendly** - Easy to search: `grep "user\."` or `grep "_failed"`
- **Scalable** - Supports agent features: `agent.tool.execution_started`

**Example Pattern:**

```python
import structlog

logger = structlog.get_logger()

def create_user(email: str) -> User:
    logger.info(
        "user.registration_started",
        email=email,
        source="api"
    )

    try:
        user = User.create(email=email)
        logger.info(
            "user.registration_completed",
            user_id=user.id,
            email=email
        )
        return user
    except Exception as e:
        logger.error(
            "user.registration_failed",
            email=email,
            error=str(e),
            error_type=type(e).__name__,
            exc_info=True
        )
        raise
```

### 7. Documentation: Context is King. I'll Say It Again: Context is King

This aligns directly with my work on context engineering—AI agents need rich, accessible context.

**Core Rules:**

- **Public APIs require docstrings** - Use `D` rules in Ruff to enforce. I like using Google-style docstrings for functions and APIs. But when writing tools for AI agents, you also need to include instructions on how to use the tool. This is a critical distinction: tool docstrings are for the AI agent _within_ your application, while function/API docstrings are for the agent _writing_ your application.
- **Link to architectural decision records (ADRs)** - When you ignore a lint rule, explain why—both so you remember the reasoning and so the agent doesn't change it without you noticing.
- **README in every major directory** - Brief context about the module's purpose
- **Type annotations everywhere** - Use `ANN` rules to enforce

**Ruff Configuration:**

```toml
[tool.ruff.lint]
select = [
    "D",      # pydocstyle (docstrings)
    "ANN",    # flake8-annotations
]
ignore = [
    "D100",   # Missing docstring in public module (too noisy)
    "D104",   # Missing docstring in public package
]
```

## The Complete Ruff + MyPy + Pyright Configuration for FastAPI

Here's the battle-tested configuration I use for FastAPI projects with strict typing and dual-layer type checking:

```toml
[tool.ruff]
target-version = "py312"
line-length = 100
exclude = [
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".mypy_cache",
    "alembic",  # Migration files don't need strict linting
]

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # pyflakes
    "I",      # isort (import sorting)
    "B",      # flake8-bugbear (catch mutable defaults, etc.)
    "C4",     # flake8-comprehensions
    "UP",     # pyupgrade (modernize syntax)
    "ANN",    # flake8-annotations (enforce type hints)
    "S",      # flake8-bandit (security)
    "DTZ",    # flake8-datetimez (timezone-aware datetimes)
    "RUF",    # Ruff-specific rules
    "ARG",    # flake8-unused-arguments
    "PTH",    # flake8-use-pathlib (prefer Path over os.path)
]

ignore = [
    "B008",   # FastAPI uses Depends() in function defaults
    "S311",   # Standard random is fine for non-crypto use
    "E501",   # Line too long (formatter handles this)
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "ANN", "ARG001", "D"]
"__init__.py" = ["F401"]  # Allow unused imports in package init
"scripts/**/*.py" = ["T201"]  # Allow print in scripts

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
line-ending = "auto"

[tool.ruff.lint.isort]
known-first-party = ["app"]

[tool.mypy]
python_version = "3.12"
strict = true
show_error_codes = true
warn_unused_ignores = true

# FastAPI compatibility
plugins = ["pydantic.mypy"]

# Practical strictness (not dogmatic)
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = false  # FastAPI decorators aren't typed

[tool.pydantic-mypy]
init_forbid_extra = true
init_typed = true
warn_required_dynamic_aliases = true
```

### Adding Pyright: The Second Layer of Type Safety

After working with both MyPy and Pyright across dozens of AI-assisted projects, I've learned that **MyPy is excellent for pragmatic development, but Pyright catches the edge cases that slip through**.

Here's the reality: MyPy and Pyright are different tools with different philosophies. MyPy is lenient with third-party libraries and focuses on developer ergonomics. Pyright is strict about type correctness and catches variance issues, protocol mismatches, and deprecated patterns that MyPy lets slide.

**When to add Pyright:**

- **Production systems** - When incorrect types could cause runtime failures
- **Library code** - When your code will be consumed by others
- **Strict teams** - When you want maximum type safety
- **After MyPy passes** - Use it as a second layer, not a replacement

**When MyPy alone is enough:**

- **Early prototypes** - Speed matters more than perfect types
- **Internal tools** - Pragmatism over pedantry
- **Learning projects** - One type checker is easier to learn

**What Pyright catches that MyPy doesn't:**

Think of it like TypeScript's `strict` mode vs `noImplicitAny`—Pyright catches the subtle bugs that only show up at 3am in production.

```python
# Example: Processor type variance
def add_metadata(
    logger: Any,
    method_name: str,
    event_dict: dict[str, Any]  # MyPy: ✅ Pyright: ❌
) -> dict[str, Any]:
    # MyPy accepts dict[str, Any] anywhere
    # Pyright knows dict is not assignable where MutableMapping is expected
    return event_dict

# Pyright error: "dict[str, Any]" is incompatible with "MutableMapping[str, Any]"
# This prevents runtime errors when the function is called with other mapping types
```

**The key insight:** Pyright enforces **structural subtyping** more strictly. A `dict` is a `MutableMapping`, but `MutableMapping` is not always a `dict`. This distinction prevents bugs that only surface at runtime.

**Strict Pyright Configuration:**

Add this to your `pyproject.toml` right after the MyPy configuration:

```toml
[tool.pyright]
include = ["app"]
exclude = [
    "**/__pycache__",
    ".venv",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache"
]

# Python version configuration
pythonVersion = "3.12"
pythonPlatform = "Darwin"  # or "Linux", "Windows"

# Strict mode - no escape hatches
typeCheckingMode = "strict"

# Report all issues - no disabling
reportMissingImports = true
reportMissingTypeStubs = true
reportUnusedImport = true
reportUnusedVariable = true
reportDuplicateImport = true
reportOptionalMemberAccess = true
reportOptionalSubscript = true
reportOptionalCall = true
reportUntypedFunctionDecorator = true
reportUntypedClassDecorator = true
reportUnknownParameterType = true
reportUnknownArgumentType = true
reportUnknownVariableType = true
reportUnknownMemberType = true
reportMissingParameterType = true
reportIncompatibleMethodOverride = true
reportIncompatibleVariableOverride = true
reportUninitializedInstanceVariable = true
```

**Important: Don't use false patterns.** You might see configurations with settings like:

```toml
# ❌ Don't do this - defeats the purpose
reportMissingTypeStubs = false
reportUnknownMemberType = false
reportUnknownArgumentType = false
```

These settings disable Pyright's core value proposition. If you're getting errors, fix the types—don't silence the checker. The errors are telling you where your types are incomplete or incorrect.

**Running Pyright:**

```bash
# Install
uv add --dev pyright

# Run type checking
uv run pyright app/

# Run alongside MyPy
uv run mypy app/ && uv run pyright app/
```

**Practical workflow:** Start with MyPy for fast iteration. Add Pyright before merging to main. Use Pyright in CI/CD to catch issues before production.

**Why this works for AI agents:** Stricter type checking means fewer runtime surprises. When an AI agent generates code that passes both MyPy and Pyright, you can have higher confidence it won't fail with unexpected types at runtime. The agent learns to be more precise with types, reducing the "looks correct but breaks in production" problem.

## Integration with uv: The Modern Python Workflow

For new projects, I strongly recommend `uv` as your package manager—it's blazingly fast, reliable, and works seamlessly with Ruff.

**Setup:**

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create new project
uv init my-fastapi-app
cd my-fastapi-app

# Add dependencies
uv add fastapi uvicorn pydantic structlog

# Add dev dependencies
uv add --dev ruff mypy pyright pytest pytest-cov
```

**Pre-commit Integration:**

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies: [pydantic, structlog]

  - repo: https://github.com/RobertCraigie/pyright-python
    rev: v1.1.365
    hooks:
      - id: pyright
        additional_dependencies: [structlog]
```

**Install hooks:**

```bash
uv tool install pre-commit
pre-commit install
```

## The AI Development Workflow

Here's how these pieces come together in practice:

### 1. Context-Rich PRPs (Product Requirements Prompts)

Start with a detailed PRP that includes:

- **Goal**: What you're building and why
- **Technical Context**: Existing patterns, architecture decisions
- **Constraints**: Security requirements, performance targets
- **Examples**: Show existing code patterns to follow

### 2. Let the Agent Generate

The agent writes code following your patterns. Don't expect perfection on the first pass—expect a solid first draft that needs iteration.

### 3. Automated Feedback Loop

```bash
# Agent's code runs through automated checks
uv run ruff check . --fix
uv run ruff format .
uv run mypy .
uv run pytest

# Optional: Add Pyright for stricter type checking
uv run pyright .
```

The agent sees linting errors and iterates. This is where your configuration pays dividends—clear, actionable errors that the agent can fix automatically.

**Tip:** Run Pyright after MyPy passes. MyPy catches the obvious issues quickly; Pyright catches the subtle ones that could cause production failures.

### 4. Human Review: Focus on Logic

Your job isn't to fix formatting or catch missing type hints—the linter handles that. Your job is to:

- **Validate test assertions** - Are they testing the right behavior?
- **Review security implications** - Does this expose sensitive data?
- **Assess architectural fit** - Does this belong here?

### 5. Ship with Confidence

When tests pass and linters are green, you have confidence. The grunt work is handled; you focused on high-leverage decisions.

## The Presentation Problem: Making Errors AI-Readable

Here's an insight from the Aider team: **LLMs are terrible at line numbers**. They make off-by-one errors constantly.

**Solution:** When presenting lint errors to AI (if you're building custom tooling), use AST-aware context:

```
❌ Bad (line-number-only):
./app/users.py:42: error: Missing type annotation

✅ Good (context-rich):
./app/users.py: In function 'create_user':
    def create_user(email, password):
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    error: Missing type annotation for parameters
```

Show the error within its semantic boundary (the function, class, or module). This dramatically improves fix accuracy.

Most modern AI coding tools (Cursor, Claude Code, Copilot) already handle this well, but if you're building automation or custom agents, keep this in mind.

## Why This Matters: Velocity vs. Technical Debt

Here's the hard truth: **Without proper infrastructure—tests, linting, CI/CD—AI-assisted development can actually reduce velocity by introducing technical debt**.

The "vibe coding" approach works for throwaway prototypes. But for production systems, discipline scales. Your linting configuration, testing strategy, and logging patterns are what separate sustainable AI-augmented development from unsustainable chaos.

## Timeless Principles for an AI-Augmented Future

As I've explored in my work on context engineering, these aren't just "best practices for ai coding"—they're timeless principles that work regardless of which AI coding tool you're using:

1. **Make patterns searchable** - Named exports, explicit types, consistent naming
2. **Encode constraints as lints** - Don't rely on agent judgment for security or architecture
3. **Automate feedback loops** - Let agents self-correct without human intervention
4. **Test structure vs. test assertions** - AI generates structure; you validate logic
5. **Structured over unstructured** - Logging, errors, types—structure enables automation
6. **Context is currency** - Rich documentation and type hints multiply agent effectiveness
7. **Green checks = done** - Make it your definition of completion

## Getting Started: Don't Boil the Ocean

You don't need to implement all seven pillars on day one. Here's my recommended approach:

**Start here** (Week 1):

- Add Ruff with `E`, `F`, `I` rules (errors, imports, sorting)
- Set up pre-commit hooks
- Install uv for dependency management

**Then add** (Weeks 2-3):

- Enable `B`, `S` rules (bugbear, security)
- Add MyPy with basic strict mode
- Standardize file naming conventions

**Finally** (Week 4+):

- Enable `ANN`, `D` rules (annotations, docstrings)
- Write your first structured logging patterns
- Create ADRs for architectural decisions

Rome wasn't built in a day, and neither is a perfect linting setup. Start small, iterate, and let the wins compound.

**Beyond: Continuous Refinement**

- Add Pyright for dual-layer type checking (production systems)
- Add project-specific lint rules for your patterns
- Build custom tooling to present errors to AI
- Share your configuration across team projects

## Conclusion: Infrastructure Scales, Vibes Don't

The promise of AI coding isn't that we stop caring about code quality—it's that we can **systematically enforce quality at scale**.

Your configuration files—`pyproject.toml`, `.pre-commit-config.yaml`, `mypy.ini`—are the scaffolding that lets AI agents build reliable systems instead of rickety prototypes.

I've seen teams transform their AI adoption from frustrating to force-multiplying by implementing these patterns. Their agents aren't smarter than yours. Their environment is just more structured.

As you build your next project, remember: **the goal isn't to constrain AI, but to give it clear rails to run on at full speed**.

---

**About the Author**

Rasmus Widing is a Product Builder and AI adoption specialist who has been using AI to build agents, automations, and web apps for over three years. He created the PRP (Product Requirements Prompts) framework for agentic engineering, now used by hundreds of engineers. He helps teams adopt AI through systematic frameworks, workshops, and training at [rasmuswiding.com](https://rasmuswiding.com).

_Want to dive deeper? Check out my PRP framework on GitHub: [github.com/Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng)_
