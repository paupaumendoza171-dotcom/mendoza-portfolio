'use strict';

const canvas = document.querySelector('.dither-background');
const gl = canvas?.getContext('webgl2', { antialias: false, powerPreference: 'low-power' });

if (canvas && gl) {
  const vertexSource = `#version 300 es
    precision mediump float;
    layout(location = 0) in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `#version 300 es
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_pixelRatio;
    uniform float u_time;
    out vec4 fragColor;

    const float PI = 3.14159265358979323846;
    const float TWO_PI = 6.28318530718;
    const int bayer4x4[16] = int[16](
      0, 8, 2, 10,
      12, 4, 14, 6,
      3, 11, 1, 9,
      15, 7, 13, 5
    );

    float bayerValue(vec2 uv) {
      ivec2 position = ivec2(fract(uv / 4.0) * 4.0);
      int index = position.y * 4 + position.x;
      return float(bayer4x4[index]) / 16.0;
    }

    void main() {
      float pixelSize = 2.0 * u_pixelRatio;
      vec2 pixelUV = gl_FragCoord.xy - 0.5 * u_resolution;
      pixelUV /= pixelSize;
      vec2 canvasUV = (floor(pixelUV) + 0.5) * pixelSize / u_resolution;
      vec2 shapeUV = canvasUV * u_resolution / min(u_resolution.x, u_resolution.y);
      shapeUV /= 0.6;
      shapeUV *= 2.0;

      float time = 0.5 * u_time;
      float distanceFromCenter = length(shapeUV);
      float angle = 6.0 * atan(shapeUV.y, shapeUV.x) + 4.0 * time;
      float twist = 1.2;
      float offset = 1.0 / pow(max(distanceFromCenter, 1e-6), twist) + angle / TWO_PI;
      float middle = smoothstep(0.0, 1.0, pow(distanceFromCenter, twist));
      float shape = mix(0.0, fract(offset), middle);

      float threshold = bayerValue(pixelUV) - 0.5;
      float dither = step(0.5, shape + threshold);
      vec3 foreground = vec3(0.11372549, 0.38431373, 0.24705882);
      fragColor = vec4(foreground * dither, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (vertexShader && fragmentShader && program) {
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        1, -1, -1, -1, 1, 1, -1, 1,
      ]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
      const pixelRatioLocation = gl.getUniformLocation(program, 'u_pixelRatio');
      const timeLocation = gl.getUniformLocation(program, 'u_time');
      const startTime = performance.now();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function drawFrame(now = startTime) {
        const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
        const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        gl.viewport(0, 0, width, height);
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1f(pixelRatioLocation, pixelRatio);
        gl.uniform1f(timeLocation, reducedMotion ? 0 : (now - startTime) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (!reducedMotion) requestAnimationFrame(drawFrame);
      }

      drawFrame();
      window.addEventListener('resize', () => {
        if (reducedMotion) drawFrame();
      });
    } else {
      console.warn(gl.getProgramInfoLog(program));
    }
  }
}