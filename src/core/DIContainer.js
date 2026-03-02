// ======================================
// DIContainer.js
// Lightweight Dependency Injection Container
// ======================================

export class DIContainer {
  constructor() {
    // service definitions
    this._services = new Map();

    // currently resolving services (circular guard)
    this._resolutionStack = new Set();
  }

  // ==================================================
  // REGISTER SINGLETON
  // One shared instance for entire application
  // ==================================================
  register(name, factory) {
    this._assertNotRegistered(name);

    this._services.set(name, {
      factory,
      instance: undefined,
      lifetime: "singleton",
    });
  }

  // ==================================================
  // REGISTER TRANSIENT
  // New instance every resolution
  // ==================================================
  registerTransient(name, factory) {
    this._assertNotRegistered(name);

    this._services.set(name, {
      factory,
      lifetime: "transient",
    });
  }

  // ==================================================
  // RESOLVE SERVICE
  // ==================================================
  get(name) {
    const record = this._services.get(name);

    if (!record) {
      throw new Error(`[DI] Service "${name}" is not registered`);
    }

    // Circular dependency protection
    if (this._resolutionStack.has(name)) {
      throw new Error(
        `[DI] Circular dependency detected while resolving "${name}"`,
      );
    }

    // Return cached singleton
    if (record.lifetime === "singleton" && record.instance !== undefined) {
      return record.instance;
    }

    this._resolutionStack.add(name);

    try {
      // factory receives container for dependency resolution
      const instance = record.factory(this);

      if (record.lifetime === "singleton") {
        record.instance = instance;
      }

      return instance;
    } finally {
      this._resolutionStack.delete(name);
    }
  }

  // ==================================================
  // CHECK EXISTENCE
  // ==================================================
  has(name) {
    return this._services.has(name);
  }

  // ==================================================
  // REMOVE SERVICE
  // Useful for dev hot-reload or plugins
  // ==================================================
  unregister(name) {
    this._services.delete(name);
  }

  // ==================================================
  // RESET CONTAINER
  // ==================================================
  clear() {
    this._services.clear();
    this._resolutionStack.clear();
  }

  // ==================================================
  // INTERNAL HELPERS
  // ==================================================
  _assertNotRegistered(name) {
    if (this._services.has(name)) {
      throw new Error(`[DI] Service "${name}" already registered`);
    }
  }
}
