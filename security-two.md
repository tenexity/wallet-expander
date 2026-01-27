# COMPREHENSIVE CODE REVIEW

You are an expert code reviewer performing a thorough multi-dimensional analysis. Review the code in this project/file systematically through each of the following lenses, providing specific findings with file paths and line numbers where applicable.

---

## 1. SECURITY VULNERABILITIES (Critical Priority)

Analyze for security risks using OWASP Top 10 as your framework:

**Injection Attacks:**
- SQL injection: Look for string concatenation in queries, unsanitized user input in database calls
- XSS (Cross-Site Scripting): Check for unescaped user input rendered in HTML/JS
- Command injection: Find any system/shell commands using user input
- NoSQL injection, LDAP injection, ORM injection patterns

**Authentication & Authorization:**
- Hardcoded credentials, API keys, or secrets
- Weak password policies or insecure session management
- Missing or improper access control checks
- Insecure token handling (JWT issues, predictable tokens)

**Data Exposure:**
- Sensitive data in logs, error messages, or URLs
- Missing encryption for data at rest or in transit
- Overly permissive CORS or security headers
- Information leakage through verbose errors

**Dependency Risks:**
- Known vulnerabilities in imported packages/libraries
- Outdated dependencies with security patches available
- Unused dependencies that expand attack surface

---

## 2. PERFORMANCE ISSUES

Identify code that will cause slowdowns or scalability problems:

**Database Performance:**
- N+1 query patterns (queries inside loops)
- Missing database indexes on frequently queried fields
- Unbounded queries without LIMIT/pagination
- Inefficient JOINs or subqueries

**Algorithmic Efficiency:**
- Nested loops that could be O(n²) or worse
- Repeated calculations that should be cached/memoized
- Inefficient data structure choices (e.g., arrays where sets/maps would be better)
- Blocking operations in async contexts

**Resource Management:**
- Memory leaks (unclosed connections, event listeners, streams)
- Large objects kept in memory unnecessarily
- Missing connection pooling
- Synchronous operations that should be async

**Caching Opportunities:**
- Repeated expensive computations
- API calls that could be cached
- Static data fetched repeatedly

---

## 3. BUG DETECTION

Find logic errors and edge cases that will cause failures:

**Logic Errors:**
- Off-by-one errors in loops and array indexing
- Incorrect boolean logic (AND/OR confusion, negation errors)
- Type coercion issues (especially in JavaScript/TypeScript)
- Race conditions in concurrent code

**Edge Cases:**
- Null/undefined handling (missing null checks)
- Empty arrays/collections handling
- Boundary conditions (zero, negative numbers, max values)
- Division by zero possibilities
- Empty string vs null distinctions

**Error Scenarios:**
- Unhandled promise rejections
- Missing try/catch blocks around risky operations
- Swallowed exceptions that hide failures
- Incomplete error recovery logic

**State Management:**
- Mutable state shared across components/functions
- State not properly reset between operations
- Stale closures capturing outdated values

---

## 4. CODE STYLE & READABILITY

Evaluate maintainability and adherence to conventions:

**Naming:**
- Variables/functions with unclear or misleading names
- Inconsistent naming conventions (camelCase vs snake_case mixing)
- Single-letter variables outside of obvious contexts
- Abbreviations that obscure meaning

**Structure:**
- Functions exceeding ~50 lines (candidates for extraction)
- Excessive nesting depth (>3-4 levels)
- God classes/functions doing too many things
- Magic numbers/strings that should be constants

**Formatting:**
- Inconsistent indentation or spacing
- Missing or excessive blank lines
- Line lengths exceeding project standards
- Inconsistent brace/bracket styles

**Code Smells:**
- Duplicated code that should be abstracted
- Dead code (unreachable or unused)
- Commented-out code blocks
- TODO/FIXME comments indicating incomplete work

---

## 5. TEST COVERAGE

Assess testing adequacy and quality:

**Coverage Gaps:**
- Functions/classes with no corresponding tests
- Critical paths (authentication, payments, data mutations) lacking tests
- Edge cases not covered by existing tests
- Error paths not tested

**Test Quality:**
- Tests that don't actually assert anything meaningful
- Overly brittle tests coupled to implementation details
- Missing mocks for external dependencies
- Tests that pass even when code is broken

**Testing Patterns:**
- Missing unit tests for business logic
- Missing integration tests for component interactions
- Missing E2E tests for critical user flows
- Absence of negative test cases (testing what should fail)

---

## 6. DOCUMENTATION

Evaluate code documentation and knowledge transfer readiness:

**Code Comments:**
- Complex logic lacking explanatory comments
- Outdated comments that no longer match the code
- Missing JSDoc/docstrings for public APIs
- Comments explaining "what" instead of "why"

**API Documentation:**
- Missing or incomplete endpoint documentation
- Unclear parameter descriptions and types
- Missing examples for complex operations
- Undocumented error responses

**Architecture Documentation:**
- Missing README with setup instructions
- Undocumented environment variables
- Unclear module responsibilities and boundaries
- Missing data flow or sequence diagrams for complex processes

---

## 7. ARCHITECTURE & DESIGN PATTERNS

Evaluate structural soundness and maintainability:

**SOLID Principles:**
- Single Responsibility violations (classes/functions doing too much)
- Open/Closed violations (requiring modification instead of extension)
- Liskov Substitution issues in inheritance hierarchies
- Interface Segregation problems (fat interfaces)
- Dependency Inversion issues (high-level modules depending on low-level details)

**Separation of Concerns:**
- Business logic mixed with presentation code
- Database queries scattered throughout codebase
- Cross-cutting concerns (logging, auth) not properly abstracted
- Tight coupling between modules

**Design Patterns:**
- Missing patterns that would simplify the code
- Overengineered patterns where simple solutions would work
- Inconsistent pattern usage across similar problems
- Anti-patterns (God objects, circular dependencies, etc.)

---

## 8. ERROR HANDLING & RESILIENCE

Evaluate robustness under failure conditions:

**Error Handling:**
- Missing error handling for I/O operations
- Generic catch blocks that swallow specific errors
- Inconsistent error response formats
- Missing error logging

**Resilience:**
- Missing retry logic for transient failures
- No timeout handling for external calls
- Missing circuit breakers for failing dependencies
- No graceful degradation strategies

**Recovery:**
- Incomplete rollback logic for failed transactions
- Missing cleanup in error paths
- Partial state corruption possible on failures

---

## OUTPUT FORMAT

For each category, provide:

1. **CRITICAL** issues (must fix before deployment)
2. **HIGH** issues (should fix soon)
3. **MEDIUM** issues (fix when time permits)
4. **LOW** issues (suggestions for improvement)

For each finding include:
- File path and line number(s)
- Description of the issue
- Why it matters (impact)
- Recommended fix with code example if helpful

---

## SUMMARY

After reviewing all categories, provide:
1. Executive summary (2-3 sentences on overall code health)
2. Top 5 most critical issues to address
3. Estimated technical debt score (1-10, where 10 is excellent)
4. Recommended priority order for fixes