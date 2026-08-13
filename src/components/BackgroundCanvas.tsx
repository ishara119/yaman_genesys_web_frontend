import { useEffect, useRef } from 'react';

const VERT_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main(){
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intensity;

  float hash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main(){
    vec2 uv = v_uv;
    vec2 px = uv * u_resolution;

    float frame = floor(u_time * 20.0);

    // horizontal glitch bands: displace + brighten random slices
    float bandCount = 48.0;
    float bandId = floor(uv.y * bandCount);
    float bandSeed = hash(vec2(bandId, floor(u_time * 6.0)));
    float activeThresh = 0.93 - u_intensity * 0.5;
    float active = step(activeThresh, bandSeed);
    float shift = (hash(vec2(bandId, 1.7 + floor(u_time * 6.0))) - 0.5)
                  * 0.06 * (1.0 + u_intensity * 4.0) * active;

    vec2 guv = uv;
    guv.x += shift;

    // film grain, re-rolled at ~20fps for authentic flicker
    float grain = hash(px * 1.0 + frame * 13.7);
    grain = grain * 0.06;

    // fine scanlines
    float scan = sin(px.y * 1.5 - u_time * 40.0) * 0.5 + 0.5;
    scan = mix(0.985, 1.0, scan);
    float scanline = (1.0 - scan) * 0.05;

    // slow vertical breathing wave (atmosphere)
    float wave = sin(guv.y * 3.0 - u_time * 0.25) * 0.5 + 0.5;
    float waveTerm = wave * 0.018;

    // base level
    float col = grain + scanline + waveTerm;

    // active band brightening
    col += active * 0.14 * (0.5 + u_intensity);

    // rare bright flash line on very high seed
    float flash = step(0.988, bandSeed) * (0.4 + u_intensity * 0.6);
    col += flash;

    // vertical center falloff so edges stay a touch darker
    float centerDist = distance(uv, vec2(0.5));
    col *= 1.0 - smoothstep(0.5, 0.95, centerDist) * 0.4;

    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(vec3(col), 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    const u_resolution = gl.getUniformLocation(program, 'u_resolution');
    const u_time = gl.getUniformLocation(program, 'u_time');
    const u_intensity = gl.getUniformLocation(program, 'u_intensity');

    let mouseIntensity = 0;
    let lastMouseX: number | null = null;
    let lastMouseY: number | null = null;
    const startTime = performance.now();
    let rafId = 0;
    let disposed = false;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function render() {
      if (disposed || !gl) return;
      resize();

      mouseIntensity *= 0.94;
      const t = (performance.now() - startTime) / 1000;

      gl.uniform2f(u_resolution, canvas!.width, canvas!.height);
      gl.uniform1f(u_time, t);
      gl.uniform1f(u_intensity, Math.min(mouseIntensity, 1.0));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    }

    function onPointerMove(e: PointerEvent) {
      if (lastMouseX !== null && lastMouseY !== null) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        mouseIntensity = Math.min(mouseIntensity + speed * 0.01, 1.0);
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    rafId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} id="bg-canvas" aria-hidden="true" />;
}
