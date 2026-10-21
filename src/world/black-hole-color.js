// The source viewer's color balance, applied only to emitted light.
export const blackHoleColorBalanceShader = /* glsl */ `
  vec3 sourceColorBalance(vec3 color) {
    float lengthBefore = length(color);
    float lightness = (max(max(color.r, color.g), color.b)
      + min(min(color.r, color.g), color.b)) * 0.5;
    lightness = 1.5 * lightness / (lightness + 0.5);
    vec3 low = vec3(0.7, 0.35, 0.0)
      * clamp((lightness - 0.333) / -0.25 + 0.5, 0.0, 1.0);
    vec3 mid = vec3(0.4, 0.2, 0.0)
      * clamp((lightness - 0.333) / 0.25 + 0.5, 0.0, 1.0)
      * clamp((lightness + 0.333 - 1.0) / -0.25 + 0.5, 0.0, 1.0);
    vec3 balanced = max(color + 0.7 * (low + mid), vec3(0.0));
    return balanced * lengthBefore / max(length(balanced), 0.00001);
  }
`;
