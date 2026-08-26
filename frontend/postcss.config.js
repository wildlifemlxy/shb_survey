// Adds vendor prefixes (-webkit-, -moz-, etc.) to plain CSS based on the
// `browserslist` targets in package.json. No Tailwind here — this project
// doesn't use it.
export default {
  plugins: {
    autoprefixer: {},
  },
}
