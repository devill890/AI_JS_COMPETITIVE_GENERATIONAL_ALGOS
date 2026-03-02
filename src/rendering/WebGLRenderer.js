// ======================================
// WebGLRenderer.js
// Minimal Engine Renderer (Vanilla WebGL)
// ======================================

import { Mat4 } from "../math.js/Mat4.js";
import { Quat } from "../math.js/Quat.js";
import { Vec3 } from "../math.js/Vec3.js";

export class WebGLRenderer {
  constructor(container, canvas) {
    this.container = container;
    this.canvas = canvas;

    this.gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    if (!this.gl) {
      throw new Error("WebGL not supported");
    }

    this.physicsWorld = container.get("PhysicsWorld");
    this.particleSystem = container.has("ParticleSystem")
      ? container.get("ParticleSystem")
      : null;
    this.camera = container.has("CameraController")
      ? container.get("CameraController")
      : null;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.initGL();
    this.initShaders();
    this.initGeometry();
  }

  // ======================================
  // GL SETUP
  // ======================================

  initGL() {
    const gl = this.gl;

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0.05, 0.05, 0.08, 1);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.canvas.clientWidth * dpr;

    this.canvas.height = this.canvas.clientHeight * dpr;

    this.camera?.resize(this.canvas.width, this.canvas.height);
  }

  // ======================================
  // SHADERS
  // ======================================

  initShaders() {
    const gl = this.gl;

    const vs = `
      attribute vec3 position;

      uniform mat4 uModel;
      uniform mat4 uView;
      uniform mat4 uProjection;

      void main() {
        gl_Position =
          uProjection *
          uView *
          uModel *
          vec4(position,1.0);
      }
    `;

    const fs = `
      precision mediump float;

      uniform vec4 uColor;

      void main() {
        gl_FragColor = uColor;
      }
    `;

    const program = this.createProgram(vs, fs);

    gl.useProgram(program);

    this.program = program;

    this.attribs = {
      position: gl.getAttribLocation(program, "position"),
    };

    this.uniforms = {
      model: gl.getUniformLocation(program, "uModel"),
      view: gl.getUniformLocation(program, "uView"),
      projection: gl.getUniformLocation(program, "uProjection"),
      color: gl.getUniformLocation(program, "uColor"),
    };
  }

  createProgram(vsSource, fsSource) {
    const gl = this.gl;

    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }

      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }

    return program;
  }

  // ======================================
  // GEOMETRY (Cube)
  // ======================================

  initGeometry() {
    const gl = this.gl;

    const vertices = new Float32Array([
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,

      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4, 0, 4, 7, 7, 3, 0, 1, 5, 6, 6, 2, 1, 3,
      2, 6, 6, 7, 3, 0, 1, 5, 5, 4, 0,
    ]);

    this.indexCount = indices.length;

    this.vao = gl.createVertexArray?.();
    if (this.vao) gl.bindVertexArray(this.vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this.attribs.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  // ======================================
  // CAMERA MATRICES
  // ======================================

  buildCamera() {
    const aspect = this.canvas.width / this.canvas.height;

    const projection = new Mat4().makePerspective(
      Math.PI / 4,
      aspect,
      0.1,
      100,
    );

    const view = new Mat4().lookAt(
      new Vec3(8, 6, 8),
      new Vec3(0, 0, 0),
      new Vec3(0, 1, 0),
    );

    return { projection, view };
  }

  // ======================================
  // RENDER LOOP ENTRY
  // ======================================

  render() {
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection;
    let view;

    if (this.camera) {
      projection = this.camera.getProjectionMatrix();
      view = this.camera.getViewMatrix();
    } else {
      ({ projection, view } = this.buildCamera());
    }

    gl.useProgram(this.program);

    gl.uniformMatrix4fv(this.uniforms.view, false, view.toArray());

    gl.uniformMatrix4fv(this.uniforms.projection, false, projection.toArray());

    // draw all rigid bodies
    for (const body of this.physicsWorld.bodies) {
      this.drawBody(body);
    }

    if (this.particleSystem) {
      this.particleSystem.render(this);
    }
  }

  // ======================================
  // DRAW BODY
  // ======================================

  drawBody(body) {
    const gl = this.gl;

    const model = new Mat4().compose(body.position, body.rotation, body.scale);

    gl.uniformMatrix4fv(this.uniforms.model, false, model.toArray());

    const color = body.color ?? new Vec3(0.6, 0.8, 1);
    gl.uniform4f(
      this.uniforms.color,
      color.x,
      color.y,
      color.z,
      1,
    );

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  drawCaptureZone(center, radius, height = 0.2) {
    if (!center || radius <= 0) return;

    const gl = this.gl;

    const model = new Mat4().compose(
      new Vec3(center.x, center.y - height / 2, center.z),
      new Quat(),
      new Vec3(radius * 2, height, radius * 2),
    );

    gl.uniformMatrix4fv(this.uniforms.model, false, model.toArray());

    gl.uniform4f(this.uniforms.color, 0.25, 0.95, 0.4, 0.28);

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    const ring = new Mat4().compose(
      new Vec3(center.x, center.y + height / 2 + 0.01, center.z),
      new Quat(),
      new Vec3(radius * 1.9, 0.045, radius * 1.9),
    );

    gl.uniformMatrix4fv(this.uniforms.model, false, ring.toArray());
    gl.uniform4f(this.uniforms.color, 0.6, 0.3, 1, 0.45);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }
}
