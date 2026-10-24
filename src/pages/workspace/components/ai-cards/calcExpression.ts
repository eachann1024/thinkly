
type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { type: "lp" } | { type: "rp" } | { type: "comma" };

const FUNCTIONS: Record<string, { arity: [number, number]; fn: (...args: number[]) => number }> = {
  min: { arity: [1, Infinity], fn: Math.min },
  max: { arity: [1, Infinity], fn: Math.max },
  round: { arity: [1, 2], fn: (x, digits = 0) => { const f = 10 ** digits; return Math.round(x * f) / f; } },
  floor: { arity: [1, 1], fn: Math.floor },
  ceil: { arity: [1, 1], fn: Math.ceil },
  sqrt: { arity: [1, 1], fn: Math.sqrt },
  abs: { arity: [1, 1], fn: Math.abs },
  log: { arity: [1, 2], fn: (x, base) => base === undefined ? Math.log(x) : Math.log(x) / Math.log(base) },
  exp: { arity: [1, 1], fn: Math.exp },
  pow: { arity: [2, 2], fn: Math.pow },
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export class CalcError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(i));
    if (number) { tokens.push({ type: "num", value: Number(number[0]) }); i += number[0].length; continue; }
    const ident = /^[A-Za-z_]\w*/.exec(source.slice(i));
    if (ident) { tokens.push({ type: "id", value: ident[0] }); i += ident[0].length; continue; }
    if (ch === "*" && source[i + 1] === "*") { tokens.push({ type: "op", value: "^" }); i += 2; continue; }
    if ("+-*/%^".includes(ch)) { tokens.push({ type: "op", value: ch as "+" }); i++; continue; }
    if (ch === "(") tokens.push({ type: "lp" });
    else if (ch === ")") tokens.push({ type: "rp" });
    else if (ch === ",") tokens.push({ type: "comma" });
    else throw new CalcError(`Unexpected "${ch}"`);
    i++;
  }
  return tokens;
}

type Node =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "neg"; arg: Node }
  | { type: "bin"; op: string; left: Node; right: Node }
  | { type: "call"; name: string; args: Node[] };

class Parser {
  private pos = 0;
  private readonly tokens: Token[];
  constructor(tokens: Token[]) { this.tokens = tokens; }

  parse(): Node {
    if (this.tokens.length === 0) throw new CalcError("Empty formula");
    const node = this.additive();
    if (this.pos < this.tokens.length) throw new CalcError("Unexpected token");
    return node;
  }

  private peek() { return this.tokens[this.pos]; }
  private isOp(...ops: string[]) { const t = this.peek(); return t?.type === "op" && ops.includes(t.value); }

  private additive(): Node {
    let left = this.multiplicative();
    while (this.isOp("+", "-")) {
      const op = (this.tokens[this.pos++] as { value: string }).value;
      left = { type: "bin", op, left, right: this.multiplicative() };
    }
    return left;
  }

  private multiplicative(): Node {
    let left = this.unary();
    while (this.isOp("*", "/", "%")) {
      const op = (this.tokens[this.pos++] as { value: string }).value;
      left = { type: "bin", op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): Node {
    if (this.isOp("-")) { this.pos++; return { type: "neg", arg: this.unary() }; }
    if (this.isOp("+")) { this.pos++; return this.unary(); }
    return this.power();
  }

  private power(): Node {
    const base = this.primary();
    if (this.isOp("^")) { this.pos++; return { type: "bin", op: "^", left: base, right: this.unary() }; }
    return base;
  }

  private primary(): Node {
    const token = this.tokens[this.pos++];
    if (!token) throw new CalcError("Unexpected end");
    if (token.type === "num") return token;
    if (token.type === "lp") {
      const inner = this.additive();
      if (this.tokens[this.pos++]?.type !== "rp") throw new CalcError("Missing )");
      return inner;
    }
    if (token.type === "id") {
      if (this.peek()?.type !== "lp") return { type: "var", name: token.value };
      this.pos++;
      const args: Node[] = [];
      if (this.peek()?.type !== "rp") {
        args.push(this.additive());
        while (this.peek()?.type === "comma") { this.pos++; args.push(this.additive()); }
      }
      if (this.tokens[this.pos++]?.type !== "rp") throw new CalcError("Missing )");
      return { type: "call", name: token.value, args };
    }
    throw new CalcError("Unexpected token");
  }
}

function evaluate(node: Node, vars: Record<string, number>): number {
  switch (node.type) {
    case "num": return node.value;
    case "var": {
      if (Object.prototype.hasOwnProperty.call(vars, node.name)) return vars[node.name];
      const constant = CONSTANTS[node.name.toLowerCase()];
      if (constant !== undefined) return constant;
      throw new CalcError(`Unknown variable "${node.name}"`);
    }
    case "neg": return -evaluate(node.arg, vars);
    case "bin": {
      const a = evaluate(node.left, vars);
      const b = evaluate(node.right, vars);
      if (node.op === "+") return a + b;
      if (node.op === "-") return a - b;
      if (node.op === "*") return a * b;
      if (node.op === "/") return a / b;
      if (node.op === "%") return a % b;
      return a ** b;
    }
    case "call": {
      const entry = Object.prototype.hasOwnProperty.call(FUNCTIONS, node.name.toLowerCase()) ? FUNCTIONS[node.name.toLowerCase()] : undefined;
      if (!entry) throw new CalcError(`Unknown function "${node.name}"`);
      const [lo, hi] = entry.arity;
      if (node.args.length < lo || node.args.length > hi) throw new CalcError(`Wrong arguments for ${node.name}`);
      return entry.fn(...node.args.map(arg => evaluate(arg, vars)));
    }
  }
}

export type CompiledFormula = (vars: Record<string, number>) => number;

export function compileFormula(formula: string): CompiledFormula {
  const ast = new Parser(tokenize(formula)).parse();
  return vars => evaluate(ast, vars);
}

export function safeEvaluate(compiled: CompiledFormula | null, vars: Record<string, number>): number | null {
  if (!compiled) return null;
  try {
    const value = compiled(vars);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
