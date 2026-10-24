// Turns the demo build into one self-contained HTML fragment (CSS and JS inlined) in the shape a
// claude.ai Artifact page expects: no doctype, html, head or body tags of its own.
import fs from 'node:fs'

const dist = new URL('../dist-demo/', import.meta.url)
const html = fs.readFileSync(new URL('index.html', dist), 'utf8')

const scriptPath = /<script[^>]*src="\.\/([^"]+\.js)"[^>]*><\/script>/.exec(html)?.[1]
const stylePath = /<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"[^>]*>/.exec(html)?.[1]
if (!scriptPath || !stylePath) throw new Error('Could not find the bundled script and stylesheet.')

const script = fs
  .readFileSync(new URL(scriptPath, dist), 'utf8')
  .replace(/<\/script/gi, '<\\/script')
  .replace(/<!--/g, '<\\!--')
const style = fs.readFileSync(new URL(stylePath, dist), 'utf8')
const fonts = /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/.exec(html)?.[1]

const page = `<title>Pocket Change</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts ? `<link rel="stylesheet" href="${fonts}">` : ''}
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`

fs.writeFileSync(new URL('pocket-change.html', dist), page)
console.log(`Wrote dist-demo/pocket-change.html (${Math.round(page.length / 1024)} KB)`)
