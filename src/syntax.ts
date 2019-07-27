export class Predicate {
  constructor(public readonly name: string) { }
  toString() { return this.name; }
}

export class Func {
  constructor(public readonly name: string) { }
  toString() { return this.name; }
}

export type Term = FuncApplication | Variable;
export type Formula = PredicateApplication | Conjunction | Disjunction | Implication | Negation | UniversalQuantification | ExistentialQuantification;

export class Variable {
  constructor(public readonly name: string) { }
  toString() { return this.name; }
}

export class FuncApplication {
  constructor(
    public readonly func: Func,
    public readonly terms: Term[],
  ) { }

  toString(): string {
    return `${this.func.toString()}(${this.terms.map(t => t.toString()).join(', ')})`;
  }
}

export class PredicateApplication {
  constructor(
    public readonly predicate: Predicate,
    public readonly terms: Term[],
  ) { }

  toString(): string {
    return `${this.predicate.toString()}(${this.terms.map(t => t.toString()).join(', ')})`;
  }
}

export class Conjunction {
  constructor(
    public readonly formulaLeft: Formula,
    public readonly formulaRight: Formula,
  ) { }

  toString(): string {
    return `(${this.formulaLeft.toString()} ⋀ ${this.formulaRight.toString()})`;
  }
}

export class Disjunction {
  constructor(
    public readonly formulaLeft: Formula,
    public readonly formulaRight: Formula,
  ) { }

  toString(): string {
    return `(${this.formulaLeft.toString()} ⋁ ${this.formulaRight.toString()})`;
  }
}

export class Implication {
  constructor(
    public readonly formulaLeft: Formula,
    public readonly formulaRight: Formula,
  ) { }

  toString(): string {
    return `(${this.formulaLeft.toString()} → ${this.formulaRight.toString()})`;
  }
}

export class Negation {
  constructor(
    public readonly formula: Formula,
  ) { }

  toString(): string {
    return `¬${this.formula.toString()}`;
  }
}

export class UniversalQuantification {
  constructor(
    public readonly variable: Variable,
    public readonly formula: Formula,
  ) { }

  toString(): string {
    return `∀${this.variable.toString()}.(${this.formula.toString()})`;
  }
}

export class ExistentialQuantification {
  constructor(
    public readonly variable: Variable,
    public readonly formula: Formula,
  ) { }

  toString(): string {
    return `∃${this.variable.toString()}.(${this.formula.toString()})`;
  }
}
