// SVG files are bundled as image assets and shown with expo-image.
declare module '*.svg' {
  const asset: number;
  // Asset modules have a default export by nature; the named-exports rule is for our own code.
  // eslint-disable-next-line import/no-default-export
  export default asset;
}
