// Lightweight Python→JavaScript transpiler for CAD scripting
// Handles: for/while/if/elif/else/def/return, math, range, f-strings, kwargs

export interface TranspileResult {
  js: string
  error?: string
}

export function transpilePython(src: string): TranspileResult {
  try {
    const lines = src.split('\n')
    const out: string[] = []
    const stack: number[] = [0] // open block indent levels
    let pendingMerge = false   // true when elif/else should merge with prev '}'

    function getIndent(line: string): number {
      let n = 0
      for (const ch of line) {
        if (ch === ' ') n++
        else if (ch === '\t') n += 4
        else break
      }
      return n
    }

    function nextContentIndent(fromIdx: number): number {
      for (let j = fromIdx; j < lines.length; j++) {
        const t = lines[j].trim()
        if (t && !t.startsWith('#')) return getIndent(lines[j])
      }
      return 0
    }

    function closeTo(target: number, forBranch = false) {
      while (stack.length > 1 && stack[stack.length - 1] > target) {
        stack.pop()
        const lvl = stack[stack.length - 1]
        if (forBranch && lvl === target) {
          pendingMerge = true // merge the } with else/elif
        } else {
          out.push(' '.repeat(lvl) + '}')
        }
      }
    }

    // Split function call args respecting nested parens/brackets
    function splitArgs(s: string): string[] {
      const parts: string[] = []
      let depth = 0, cur = ''
      for (const ch of s) {
        if ('([{'.includes(ch)) depth++
        else if (')]}'.includes(ch)) depth--
        if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = '' }
        else cur += ch
      }
      if (cur.trim()) parts.push(cur.trim())
      return parts
    }

    // Convert Python expression to JavaScript
    function xpr(e: string): string {
      // f-strings
      e = e.replace(/f"([^"]*)"/g, (_, s) => '`' + s.replace(/\{([^}]+)\}/g, '${$1}') + '`')
      e = e.replace(/f'([^']*)'/g, (_, s) => '`' + s.replace(/\{([^}]+)\}/g, '${$1}') + '`')
      // Constants
      e = e.replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\bmath\.pi\b/g, 'Math.PI')
        .replace(/\bmath\.e\b/g, 'Math.E')
        .replace(/\bmath\./g, 'Math.')
        .replace(/\bpi\b/g, 'Math.PI')
      // Built-ins
      e = e.replace(/\bprint\s*\(/g, '_print(')
        .replace(/\blen\s*\(/g, '_len(')
        .replace(/\brange\s*\(/g, '_range(')
        .replace(/\babs\s*\(/g, 'Math.abs(')
        .replace(/\bint\s*\(/g, 'Math.trunc(')
        .replace(/\bfloat\s*\(/g, 'parseFloat(')
        .replace(/\bstr\s*\(/g, 'String(')
        .replace(/\bround\s*\(/g, 'Math.round(')
        .replace(/\bmin\s*\(/g, 'Math.min(')
        .replace(/\bmax\s*\(/g, 'Math.max(')
        .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
        .replace(/\bsum\s*\(/g, '_sum(')
        .replace(/\bnot\b\s+/g, '!')
        .replace(/\s+and\s+/g, ' && ')
        .replace(/\s+or\s+/g, ' || ')
      // Convert Python kwargs: func(a=1, b=2) → func({a: 1, b: 2})
      e = e.replace(/(\w+)\(([^)]*)\)/g, (match, fname, argsStr) => {
        if (!argsStr.includes('=')) return match
        const args = splitArgs(argsStr)
        const hasKw = args.some((a) => /^\w+\s*=/.test(a))
        if (!hasKw) return match
        const jsArgs = args.map((a) => {
          const kw = a.match(/^(\w+)\s*=\s*(.+)$/)
          return kw ? `${kw[1]}: ${xpr(kw[2])}` : a
        })
        return `${fname}({${jsArgs.join(', ')}})`
      })
      return e
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const content = raw.trim()

      if (!content) { out.push(''); continue }

      const indent = getIndent(raw)
      const pad = ' '.repeat(indent)

      // Detect elif/else before closing (they need special merge)
      const isElif = /^elif\b/.test(content)
      const isElse = /^else\s*:/.test(content)

      if (isElif || isElse) {
        closeTo(indent, true) // sets pendingMerge for the last close
      } else {
        closeTo(indent)
        pendingMerge = false
      }

      const prefix = pendingMerge ? '} ' : ''
      pendingMerge = false

      // Skip imports
      if (/^import\s|^from\s/.test(content)) continue

      // Comment
      if (content.startsWith('#')) {
        out.push(`${pad}// ${content.slice(1).trim()}`)
        continue
      }

      // for i in range(...)
      let m = content.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:$/)
      if (m) {
        const [, v, args] = m
        const ps = splitArgs(args)
        let stmt = ''
        if (ps.length === 1) stmt = `for (let ${v} = 0; ${v} < ${xpr(ps[0])}; ${v}++)`
        else if (ps.length === 2) stmt = `for (let ${v} = ${xpr(ps[0])}; ${v} < ${xpr(ps[1])}; ${v}++)`
        else {
          const step = xpr(ps[2].trim())
          const dir = ps[2].trim().startsWith('-') ? '>=' : '<'
          stmt = `for (let ${v} = ${xpr(ps[0])}; ${v} ${dir} ${xpr(ps[1])}; ${v} += ${step})`
        }
        out.push(`${pad}${prefix}${stmt} {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }

      // for x in iterable
      m = content.match(/^for\s+(\w+)\s+in\s+(.+)\s*:$/)
      if (m) {
        out.push(`${pad}${prefix}for (const ${m[1]} of ${xpr(m[2])}) {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }

      // while
      m = content.match(/^while\s+(.+)\s*:$/)
      if (m) {
        out.push(`${pad}${prefix}while (${xpr(m[1])}) {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }

      // if / elif / else
      m = content.match(/^if\s+(.+)\s*:$/)
      if (m) {
        out.push(`${pad}${prefix}if (${xpr(m[1])}) {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }
      m = content.match(/^elif\s+(.+)\s*:$/)
      if (m) {
        out.push(`${pad}} else if (${xpr(m[1])}) {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }
      if (/^else\s*:$/.test(content)) {
        out.push(`${pad}} else {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }

      // def
      m = content.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*:$/)
      if (m) {
        const params = splitArgs(m[2]).map((p) => {
          const t = p.trim()
          const eq = t.indexOf('=')
          return eq >= 0 ? `${t.slice(0, eq).trim()} = ${xpr(t.slice(eq + 1).trim())}` : t
        }).filter(Boolean).join(', ')
        out.push(`${pad}${prefix}function ${m[1]}(${params}) {`)
        stack.push(nextContentIndent(i + 1))
        continue
      }

      // return
      m = content.match(/^return\s+(.+)$/)
      if (m) { out.push(`${pad}return ${xpr(m[1])};`); continue }
      if (content === 'return') { out.push(`${pad}return;`); continue }

      // Regular statement (expression or assignment)
      const stmt = xpr(content)
      out.push(`${pad}${stmt}${stmt.endsWith(';') ? '' : ';'}`)
    }

    // Close remaining open blocks
    closeTo(0)

    return { js: out.join('\n') }
  } catch (e) {
    return { js: '', error: String(e) }
  }
}
