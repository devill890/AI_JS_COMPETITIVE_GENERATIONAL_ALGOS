// ======================================
// Mesh.js
// Geometry container for WebGL rendering
// ======================================

export class Mesh {
  constructor(gl, options = {}) {
    if (!gl) {
      throw new Error("Mesh requires WebGL context");
    }

    this.gl = gl;

    this.vertices = options.vertices || null;
    this.indices = options.indices || null;
    this.normals = options.normals || null;
    this.uvs = options.uvs || null;

    this.vao = null;
    this.indexCount = 0;

    this._build();
  }

  // ======================================
  // BUILD GPU BUFFERS
  // ======================================

  _build() {
    const gl = this.gl;

    this.vao = gl.createVertexArray?.();
    if (this.vao) gl.bindVertexArray(this.vao);

    // ---------------------------
    // Vertex positions
    // ---------------------------
    if (!this.vertices) {
      throw new Error("Mesh requires vertices");
    }

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    // attribute location 0 reserved for position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // ---------------------------
    // Normals (optional)
    // ---------------------------
    if (this.normals) {
      this.nbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);

      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    }

    // ---------------------------
    // UVs (optional)
    // ---------------------------
    if (this.uvs) {
      this.ubo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ubo);

      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    }

    // ---------------------------
    // Indices
    // ---------------------------
    if (this.indices) {
      this.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);

      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

      this.indexCount = this.indices.length;
      this.indexed = true;
    } else {
      this.indexCount = this.vertices.length / 3;
      this.indexed = false;
    }

    // cleanup
    gl.bindVertexArray?.(null);
  }

  // ======================================
  // BIND FOR DRAWING
  // ======================================

  bind() {
    const gl = this.gl;

    if (this.vao) {
      gl.bindVertexArray(this.vao);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    }
  }

  // ======================================
  // DRAW CALL
  // ======================================

  draw() {
    const gl = this.gl;

    if (this.indexed) {
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, this.indexCount);
    }
  }

  // ======================================
  // STATIC HELPERS
  // ======================================

  static createCube(gl) {
    const vertices = new Float32Array([
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,

      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4, 0, 4, 7, 7, 3, 0, 1, 5, 6, 6, 2, 1, 3,
      2, 6, 6, 7, 3, 0, 1, 5, 5, 4, 0,
    ]);

    return new Mesh(gl, {
      vertices,
      indices,
    });
  }
}
