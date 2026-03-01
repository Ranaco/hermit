---
title: API Design Principles & Architecture
description: This skill enables the agent to architect, design, and implement new backend API endpoints following established industry patterns for scalable Node.js/TypeScript services. It specifically enforces the Strict Layered Architecture (Routes -> Controllers -> Services/Wrappers), structured Validation, standard Error Handling, and Audit Logging.
---

## The Generic API Architecture

When building or modifying API endpoints, you MUST adhere to the **Strict Layered Architecture**. The backend code should be decoupled into specific layers to maintain security, testability, and separation of concerns regardless of the underlying ORM or framework.

---

### 1. Routes Layer

The Router is the entry point. It is strictly responsible for wiring up HTTP methods, paths, and middleware. It should contain **NO business logic**.

**Standard Middleware Chain Flow:**

1. `authentication`: Ensures the user has a valid, active session.
2. `validation`: Parses and validates incoming payloads (body, query, params) against a schema diagram.
3. `authorization`: Evaluates RBAC/IAM permissions to ensure the user can act on the target resource.
4. `controller`: The final destination.

**Example Implementation:**

```typescript
router.post(
  "/",
  authenticateLocalStrategy,
  validateSchema({ body: createResourceSchema }),
  authorizeResource("resource:create"),
  createResource,
);
```

---

### 2. Validation Layer

All incoming data (body, query, params) must be validated _before_ hitting the controller using a schema validation library (like Zod, Joi, or Yup).

**Rules:**

- Define external schemas exported as `create[Resource]Schema`, `update[Resource]Schema`, etc.
- Use strict type constraints (e.g., UUID validation, max length, strict enums).
- Fail fast: Drop requests with invalid schemas immediately with a `400 Bad Request`.

---

### 3. Controller Layer

The Controller acts as the bridge between HTTP requests and the business logic wrapper/service layer.

**Rules:**

- **Extract Context**: Extract data from `req.body`, `req.params`, `req.user`, `req.ip` and pass it down cleanly to the service.
- **Never perform DB calls**: Do not import or use your DB Client or ORM in the controller.
- **Async Handling**: Always wrap the controller functions in an Async Handler wrapper (or `try/catch` resolving to central `next(err)`) to prevent unhandled promise rejections crashing the node process.
- **Standard Response**: Always return a standard JSON structure across all endpoints:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Optional success message"
  }
  ```

**Example Implementation:**

```typescript
export const createResource = asyncWrapper(
  async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();

    const result = await resourceService.createResource(req.user.id, req.body, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res
      .status(201)
      .json({ success: true, data: result, message: "Created successfully" });
  },
);
```

---

### 4. Service / Wrapper Layer (Business Logic)

This layer contains the actual heart of the application. All Database calls, external API integrations, and heavy business logic go here.

**Rules:**

- **Database Operations**: Import your DB Client/ORM locally inside the wrapper function and perform queries here.
- **Throw Structured Errors**: Throw custom HTTP typed errors (e.g., `ValidationError`, `NotFoundError`, `ForbiddenError`). Do not throw generic JS Errors.
- **Audit Logging**: Any sensitive mutation endpoint (`CREATE`, `UPDATE`, `DELETE`) should trigger a standardized Audit Log before successfully returning to the controller.

**Example Implementation:**

```typescript
async createResource(userId: string, data: DataPayload, auditInfo: AuditInfo) {

  // 1. Validate Business Rules (e.g. Does the parent exist?)
  // 2. Perform DB Mutation securely
  const resource = await dbClient.resource.create({ ... });

  // 3. Create Audit Log async
  await emitAuditLog({
    userId,
    action: "CREATE_RESOURCE",
    resourceId: resource.id,
    ipAddress: auditInfo.ipAddress,
  });

  return resource;
}
```

---

## Agent Usage Guidelines

When asked to construct or refactor a new API endpoint natively in a workspace, the agent should:

1. **Define the Validator**: Write the schema layer first.
2. **Write the Service**: Implement the DB logic, business boundaries, and strictly log the action.
3. **Write the Controller**: Hook up the Service and return the standard JSON wrapper.
4. **Wire the Route**: Register the endpoint, placing Authentication, Validation, and Authorization middleware accurately before the controller.
