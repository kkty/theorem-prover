import { Variable, Term, Func, FuncApplication, Formula, PredicateApplication, Conjunction, Disjunction, Implication, Negation, UniversalQuantification, ExistentialQuantification, Predicate } from './syntax';

class Substitution {
  constructor(
    public readonly variable: Variable,
    public readonly term: Term,
  ) {}

  toString(): string {
    return `${this.variable.toString()} -> ${this.term.toString()}`;
  }

  applyToTerm(term: Term): Term {
    if (term instanceof Variable) {
      if (term === this.variable) return this.term;
      return term;
    }

    return new FuncApplication(
      term.func,
      term.terms.map(t => this.applyToTerm(t)),
    );
  }

  applyToFormula(formula: Formula): Formula {
    if (formula instanceof PredicateApplication) {
      return new PredicateApplication(
        formula.predicate,
        formula.terms.map(t => this.applyToTerm(t)),
      );
    }

    if (formula instanceof Conjunction) {
      return new Conjunction(
        this.applyToFormula(formula.formulaLeft),
        this.applyToFormula(formula.formulaRight),
      );
    }

    if (formula instanceof Disjunction) {
      return new Disjunction(
        this.applyToFormula(formula.formulaLeft),
        this.applyToFormula(formula.formulaRight),
      );
    }

    if (formula instanceof Implication) {
      return new Implication(
        this.applyToFormula(formula.formulaLeft),
        this.applyToFormula(formula.formulaRight),
      );
    }

    if (formula instanceof Negation) {
      return new Negation(
        this.applyToFormula(formula.formula),
      );
    }

    if (formula instanceof UniversalQuantification) {
      return new UniversalQuantification(
        formula.variable,
        this.applyToFormula(formula.formula),
      );
    }

    if (formula instanceof ExistentialQuantification) {
      return new ExistentialQuantification(
        formula.variable,
        this.applyToFormula(formula.formula),
      );
    }

    return formula;
  }

  applyToLiteral(literal: Literal): Literal {
    return new Literal(
      literal.predicate,
      literal.terms.map(term => this.applyToTerm(term)),
      literal.negated,
    );
  }

  applyToClause(clause: Clause): Clause {
    return new Clause(
      clause.literals.map(literal => this.applyToLiteral(literal)),
    );
  }
}

class Constraint {
  constructor(
    private readonly left: Term,
    private readonly right: Term,
  ) {}

  static unify(constraints: Constraint[]): Substitution[] | null {
    if (constraints.length === 0) return [];

    const [{ left, right }, ...rest] = constraints;

    if (left instanceof Variable || right instanceof Variable) {
      if (left === right) {
        return Constraint.unify(rest);
      }

      const substitution = (() => {
        if (left instanceof Variable) return new Substitution(left, right);
        if (right instanceof Variable) return new Substitution(right, left);
        return null;
      })();

      // this will never happen
      if (!substitution) return null;

      // occur check
      if (getVariablesInTerm(substitution.term).has(substitution.variable)) return null;

      // apply the substution to the rest of constraints, and unify them
      const restSubstitutions = Constraint.unify(
        rest.map(({ left, right }) => new Constraint(substitution.applyToTerm(left), substitution.applyToTerm(right))),
      );

      if (restSubstitutions === null) return null;

      return [
        substitution,
        ...restSubstitutions,
      ];
    }

    // from here, `left instanceof FuncApplication && right instanceof FuncApplication` holds

    if (left.func !== right.func) return null;
    if (left.terms.length !== right.terms.length) return null;

    const newConstraints = [];
    for (let i = 0; i < left.terms.length; i += 1) {
      newConstraints.push(new Constraint(left.terms[i], right.terms[i]));
    }

    return Constraint.unify([...newConstraints, ...rest]);
  }
}

class Literal {
  constructor(
    public readonly predicate: Predicate,
    public readonly terms: Term[],
    public readonly negated: boolean,
  ) {}

  getVariables(): Set<Variable> {
    const variables = new Set<Variable>();
    for (const term of this.terms) {
      for (const variable of getVariablesInTerm(term)) {
        variables.add(variable);
      }
    }
    return variables;
  }

  static isEqual(a: Literal, b: Literal): boolean {
    if (a.predicate !== b.predicate) return false;
    if (a.negated !== b.negated) return false;
    if (a.terms.length !== b.terms.length) return false;

    for (let i = 0; i < a.terms.length; i += 1) {
      if (!isTermsEqual(a.terms[i], b.terms[i])) return false;
    }

    return true;
  }

  toString(): string {
    return `${this.negated ? '¬' : ''}${this.predicate.toString()}(${this.terms.map(i => i.toString()).join(', ')})`;
  }

  static fromFormula(formula: Formula): Literal {
    if (formula instanceof Negation && formula.formula instanceof PredicateApplication) {
      return new Literal(formula.formula.predicate, formula.formula.terms, true);
    }

    if (formula instanceof PredicateApplication) {
      return new Literal(formula.predicate, formula.terms, false);
    }

    throw new Error('invalid formula');
  }
}

class Clause {
  constructor(
    public readonly literals: Literal[],
  ) {}

  getVariables(): Set<Variable> {
    const variables = new Set<Variable>();
    for (const literal of this.literals) {
      for (const variable of literal.getVariables()) {
        variables.add(variable);
      }
    }
    return variables;
  }

  static isEqual(a: Clause, b: Clause): boolean {
    if (a.literals.length !== b.literals.length) return false;

    for (let i = 0; i < a.literals.length; i += 1) {
      if (!Literal.isEqual(a.literals[i], b.literals[i])) return false;
    }

    return true;
  }

  toString(): string {
    return `{${this.literals.map(i => i.toString()).join(', ')}}`;
  }
}

class Resolution {
  constructor(
    public readonly left: Clause,
    public readonly right: Clause,
    public readonly resolvent: Clause,
    public readonly substitions: Substitution[],
    public readonly leftSubstitutions: Substitution[],
    public readonly rightSubstitutions: Substitution[],
  ) {}

  static freshFunc = new Func('_');

  // list possible resolutions from a pair of clauses
  static execute(left: Clause, right: Clause): Resolution[] {
    const resolutions: Resolution[] = [];

    // refresh variables
    const leftSubstitutions = [...left.getVariables()].map(v => new Substitution(v, new Variable(v.name)));
    const rightSubstitutions = [...right.getVariables()].map(v => new Substitution(v, new Variable(v.name)));

    const leftRefreshed = leftSubstitutions.reduce((c, s) => s.applyToClause(c), left);
    const rightRefreshed = rightSubstitutions.reduce((c, s) => s.applyToClause(c), right);

    for (const literalLeft of leftRefreshed.literals) {
      for (const literalRight of rightRefreshed.literals) {
        if (literalLeft.predicate !== literalRight.predicate) continue;
        if (literalLeft.negated === literalRight.negated) continue;
        if (literalLeft.terms.length !== literalRight.terms.length) continue;

        const constraints: Constraint[] = [];
        for (let i = 0; i < literalLeft.terms.length; i += 1) {
          constraints.push(new Constraint(literalLeft.terms[i], literalRight.terms[i]));
        }

        const substitutions = Constraint.unify(constraints);
        if (!substitutions) continue;

        const applySubstitutions = (literal: Literal) => {
          let i = literal;
          for (const substitution of substitutions) {
            i = substitution.applyToLiteral(i);
          }
          return i;
        };

        const resolvent = (() => {
          const literals: Literal[] = [];
          [
            ...leftRefreshed.literals.filter(i => i !== literalLeft).map(applySubstitutions),
            ...rightRefreshed.literals.filter(i => i !== literalRight).map(applySubstitutions),
          ].forEach((literal) => {
            for (const i of literals) {
              if (Literal.isEqual(literal, i)) return;
            }
            literals.push(literal);
          });

          return new Clause(literals);
        })();

        resolutions.push(new Resolution(left, right, resolvent, substitutions, leftSubstitutions, rightSubstitutions));

        // if an empty clause has been found, we can stop searching
        if (resolvent.literals.length === 0) return resolutions;
      }
    }

    return resolutions;
  }
}

function getVariablesInTerm(term: Term): Set<Variable> {
  const variables = new Set<Variable>();

  if (term instanceof Variable) {
    variables.add(term);
  } else {
    for (const t of term.terms) {
      for (const v of getVariablesInTerm(t)) {
        variables.add(v);
      }
    }
  }

  return variables;
}

function isTermsEqual(a: Term, b: Term): boolean {
  if (a instanceof Variable && b instanceof Variable) return a === b;

  if (a instanceof FuncApplication && b instanceof FuncApplication) {
    if (a.func !== b.func) return false;
    if (a.terms.length !== b.terms.length) return false;

    for (let i = 0; i < a.terms.length; i += 1) {
      if (!isTermsEqual(a.terms[i], b.terms[i])) return false;
    }

    return true;
  }

  return false;
}

function splitFormula(formula: Formula, delimiter: 'conjunction' | 'disjunction'): Formula[] {
  if (
    (delimiter === 'conjunction' && formula instanceof Conjunction) ||
    (delimiter === 'disjunction' && formula instanceof Disjunction)
  ) {
    return [
      ...splitFormula(formula.formulaLeft, delimiter),
      ...splitFormula(formula.formulaRight, delimiter),
    ];
  }

  return [formula];
}

export function pushNegationsInward(formula: Formula): Formula {
  if (formula instanceof Negation) {
    const inner = pushNegationsInward(formula.formula);
    if (inner instanceof Conjunction) {
      return new Disjunction(
        pushNegationsInward(new Negation(inner.formulaLeft)),
        pushNegationsInward(new Negation(inner.formulaRight)),
      );
    }

    if (inner instanceof Disjunction) {
      return new Conjunction(
        pushNegationsInward(new Negation(inner.formulaLeft)),
        pushNegationsInward(new Negation(inner.formulaRight)),
      );
    }

    if (inner instanceof Negation) {
      return inner.formula;
    }

    if (inner instanceof UniversalQuantification) {
      return new ExistentialQuantification(
        inner.variable,
        pushNegationsInward(new Negation(inner.formula)),
      );
    }

    if (inner instanceof ExistentialQuantification) {
      return new UniversalQuantification(
        inner.variable,
        pushNegationsInward(new Negation(inner.formula)),
      );
    }

    return new Negation(inner);
  }

  if (formula instanceof Conjunction) {
    return new Conjunction(
      pushNegationsInward(formula.formulaLeft),
      pushNegationsInward(formula.formulaRight),
    );
  }

  if (formula instanceof Disjunction) {
    return new Disjunction(
      pushNegationsInward(formula.formulaLeft),
      pushNegationsInward(formula.formulaRight),
    );
  }

  if (formula instanceof Implication) {
    return new Implication(
      pushNegationsInward(formula.formulaLeft),
      pushNegationsInward(formula.formulaRight),
    );
  }

  if (formula instanceof UniversalQuantification) {
    return new UniversalQuantification(
      formula.variable,
      pushNegationsInward(formula.formula),
    );
  }

  if (formula instanceof ExistentialQuantification) {
    return new ExistentialQuantification(
      formula.variable,
      pushNegationsInward(formula.formula),
    );
  }

  return formula;
}

export function pushQuantifiersOutward(formula: Formula): Formula {
  if (formula instanceof Conjunction) {
    const left = pushQuantifiersOutward(formula.formulaLeft);
    const right = pushQuantifiersOutward(formula.formulaRight);

    if (left instanceof UniversalQuantification) {
      return new UniversalQuantification(
        left.variable,
        pushQuantifiersOutward(new Conjunction(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof UniversalQuantification) {
      return new UniversalQuantification(
        right.variable,
        pushQuantifiersOutward(new Conjunction(formula.formulaLeft, right.formula)),
      );
    }

    if (left instanceof ExistentialQuantification) {
      return new ExistentialQuantification(
        left.variable,
        pushQuantifiersOutward(new Conjunction(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof ExistentialQuantification) {
      return new ExistentialQuantification(
        right.variable,
        pushQuantifiersOutward(new Conjunction(formula.formulaLeft, right.formula)),
      );
    }

    return new Conjunction(left, right);
  }

  if (formula instanceof Disjunction) {
    const left = pushQuantifiersOutward(formula.formulaLeft);
    const right = pushQuantifiersOutward(formula.formulaRight);

    if (left instanceof UniversalQuantification) {
      return new UniversalQuantification(
        left.variable,
        pushQuantifiersOutward(new Disjunction(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof UniversalQuantification) {
      return new UniversalQuantification(
        right.variable,
        pushQuantifiersOutward(new Disjunction(formula.formulaLeft, right.formula)),
      );
    }

    if (left instanceof ExistentialQuantification) {
      return new ExistentialQuantification(
        left.variable,
        pushQuantifiersOutward(new Disjunction(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof ExistentialQuantification) {
      return new ExistentialQuantification(
        right.variable,
        pushQuantifiersOutward(new Disjunction(formula.formulaLeft, right.formula)),
      );
    }

    return new Disjunction(left, right);
  }

  if (formula instanceof Implication) {
    const left = pushQuantifiersOutward(formula.formulaLeft);
    const right = pushQuantifiersOutward(formula.formulaRight);

    if (left instanceof UniversalQuantification) {
      return new ExistentialQuantification(
        left.variable,
        pushQuantifiersOutward(new Implication(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof UniversalQuantification) {
      return new ExistentialQuantification(
        right.variable,
        pushQuantifiersOutward(new Implication(formula.formulaLeft, right.formula)),
      );
    }

    if (left instanceof ExistentialQuantification) {
      return new UniversalQuantification(
        left.variable,
        pushQuantifiersOutward(new Implication(left.formula, formula.formulaRight)),
      );
    }

    if (right instanceof ExistentialQuantification) {
      return new UniversalQuantification(
        right.variable,
        pushQuantifiersOutward(new Implication(formula.formulaLeft, right.formula)),
      );
    }

    return new Implication(left, right);
  }

  if (formula instanceof Negation) {
    const inner = pushQuantifiersOutward(formula.formula);

    if (inner instanceof UniversalQuantification) {
      return new ExistentialQuantification(
        inner.variable,
        pushQuantifiersOutward(new Negation(inner.formula)),
      );
    }

    if (inner instanceof ExistentialQuantification) {
      return new UniversalQuantification(
        inner.variable,
        pushQuantifiersOutward(new Negation(inner.formula)),
      );
    }

    return new Negation(inner);
  }

  if (formula instanceof UniversalQuantification) {
    return new UniversalQuantification(
      formula.variable,
      pushQuantifiersOutward(formula.formula),
    );
  }

  if (formula instanceof ExistentialQuantification) {
    return new ExistentialQuantification(
      formula.variable,
      pushQuantifiersOutward(formula.formula),
    );
  }

  return formula;
}

export function eliminateImplications(formula: Formula): Formula {
  if (formula instanceof Implication) {
    return new Disjunction(
      eliminateImplications(new Negation(formula.formulaLeft)),
      eliminateImplications(formula.formulaRight),
    );
  }

  if (formula instanceof Conjunction) {
    return new Conjunction(
      eliminateImplications(formula.formulaLeft),
      eliminateImplications(formula.formulaRight),
    );
  }

  if (formula instanceof Disjunction) {
    return new Disjunction(
      eliminateImplications(formula.formulaLeft),
      eliminateImplications(formula.formulaRight),
    );
  }

  if (formula instanceof Negation) {
    return new Negation(eliminateImplications(formula.formula));
  }

  if (formula instanceof UniversalQuantification) {
    return new UniversalQuantification(formula.variable, eliminateImplications(formula.formula));
  }

  if (formula instanceof ExistentialQuantification) {
    return new ExistentialQuantification(formula.variable, eliminateImplications(formula.formula));
  }

  return formula;
}

export function pushDisjunctionsInward(formula: Formula): Formula {
  if (formula instanceof Disjunction) {
    if (formula.formulaLeft instanceof Conjunction) {
      return new Conjunction(
        pushDisjunctionsInward(new Disjunction(formula.formulaLeft.formulaLeft, formula.formulaRight)),
        pushDisjunctionsInward(new Disjunction(formula.formulaLeft.formulaRight, formula.formulaRight)),
      );
    }

    if (formula.formulaRight instanceof Conjunction) {
      return new Conjunction(
        pushDisjunctionsInward(new Disjunction(formula.formulaLeft, formula.formulaRight.formulaLeft)),
        pushDisjunctionsInward(new Disjunction(formula.formulaLeft, formula.formulaRight.formulaRight)),
      );
    }
  }

  return formula;
}

export function skolemize(formula: Formula): Formula {
  let f = formula;

  const substitions: Substitution[] = [];
  const variables: Variable[] = [];
  let idx = 0;
  while (f instanceof UniversalQuantification || f instanceof ExistentialQuantification) {
    if (f instanceof UniversalQuantification) {
      variables.push(f.variable);
      f = f.formula;
      continue;
    }

    const skolemFunc = new Func(`sko${idx}`);
    idx += 1;

    substitions.push(
      new Substitution(
        f.variable,
        new FuncApplication(
          skolemFunc,
          [...variables],
        ),
      ),
    );

    f = f.formula;
  }

  for (const substitution of substitions) {
    f = substitution.applyToFormula(f);
  }

  return f;
}

export function getClauses(formula: Formula): Clause[] {
  return splitFormula(formula, 'conjunction')
    .map((i) => {
      const literals = splitFormula(i, 'disjunction').map(j => Literal.fromFormula(j));
      return new Clause(literals);
    });
}

function cloneSet<T>(s: Set<T>): Set<T> {
  const ret = new Set<T>();
  for (const i of s) {
    ret.add(i);
  }
  return ret;
}

function getSubsets<T>(s: Set<T>): Set<Set<T>> {
  const subsets = new Set<Set<T>>();
  subsets.add(new Set());

  for (const i of s) {
    for (const subset of [...subsets]) {
      subsets.add(cloneSet(subset).add(i));
    }
  }

  return subsets;
}

export function refute(
  initialClauses: Clause[],
  timeout: number | null = null,
): { resolutions: { left: Clause, right: Clause, resolvent: Clause }[], instantiations: [Clause, Clause][] } | null {
  const start = Date.now();
  const freshFunc = new Func('_');
  const resolutions: Resolution[] = [];

  while (true) {
    // list all available clauses
    const availableClauses = [
      ...initialClauses,
      ...resolutions.map(resolution => resolution.resolvent),
    ];

    let updated = false;

    // try all combinations of clauses
    for (const clause1 of availableClauses) {
      for (const clause2 of availableClauses) {
        // do not repeat the same resolution
        if (resolutions.find(({ left, right }) => {
          if (Clause.isEqual(left, clause1) && Clause.isEqual(right, clause2)) return true;
          if (Clause.isEqual(left, clause2) && Clause.isEqual(right, clause1)) return true;
          return false;
        })) {
          continue;
        }

        for (const resolution of Resolution.execute(clause1, clause2)) {
          if (timeout && Date.now() - start >= timeout) throw new Error('refutation timeout');

          resolutions.push(resolution);
          updated = true;
        }
      }
    }

    // if no new resolutions could have been made, refutation is not possible
    if (!updated) {
      return null;
    }

    // find a resolution which leads to an empty clause
    for (const resolution of resolutions) {
      if (resolution.resolvent.literals.length === 0) {
        // if found, build up a resolution tree and return it

        type ResolutionTreeNode = {
          left: ResolutionTreeNode | null,
          right: ResolutionTreeNode | null,
          parent: ResolutionTreeNode | null,
          v: Resolution,
        };

        const buildResolutionTree = (resolution: Resolution, parent: ResolutionTreeNode | null) => {
          const left = resolutions.find(({ resolvent }) => Clause.isEqual(resolvent, resolution.left));
          const right = resolutions.find(({ resolvent }) => Clause.isEqual(resolvent, resolution.right));
          const node: ResolutionTreeNode = {
            parent,
            left: null,
            right: null,
            v: resolution,
          };
          if (left) node.left = buildResolutionTree(left, node);
          if (right) node.right = buildResolutionTree(right, node);
          return node;
        };

        const resolutionTree = buildResolutionTree(resolution, null);

        // clauses within `resolutionTree` may contain variables
        // from here, we will build a tree without variables applying substitutions to them

        type ConcreteResolutionTreeNode = {
          left: ConcreteResolutionTreeNode | null,
          right: ConcreteResolutionTreeNode | null,
          v: {
            left: Clause,
            right: Clause,
            resolvent: Clause,
          },
        };

        // instantiations from initial clauses
        // `buildConcreteResolutionTree` adds elements to this
        const instantiations: [Clause, Clause][] = [];

        const buildConcreteResolutionTree = (resolutionTreeNode: ResolutionTreeNode) => {
          // climb up the tree and collect substitutions

          const ancestors = (() => {
            const ret: [ResolutionTreeNode, 'left' | 'right'][] = [];
            let n = resolutionTreeNode;
            while (n.parent) {
              ret.push([n.parent, n.parent.left === n ? 'left' : 'right']);
              n = n.parent;
            }
            return ret;
          })();

          const substitutionsOfAncestors: Substitution[] = [];

          for (const ancestor of ancestors) {
            for (const substitution of ancestor[1] === 'left' ? ancestor[0].v.leftSubstitutions : ancestor[0].v.rightSubstitutions) {
              substitutionsOfAncestors.push(substitution);
            }
            for (const substitution of ancestor[0].v.substitions) {
              substitutionsOfAncestors.push(substitution);
            }
          }

          const applySubstitutions = (substitutions: Substitution[], clause: Clause) => {
            return substitutions.reduce((c, s) => s.applyToClause(c), clause);
          };

          // even after applying `substitutionsOfAncestors`, clauses may contain
          // variables (e.g. initial clauses = [{P(x)}, {¬P(x)}])
          // so, we replace them with a fresh function

          const replaceVariablesWithFreshFunc = (clause: Clause) => {
            const variables = clause.getVariables();
            const substitutions = [...variables].map(v => new Substitution(v, new FuncApplication(freshFunc, [])));
            return substitutions.reduce((c, s) => s.applyToClause(c), clause);
          };

          const n: ConcreteResolutionTreeNode = {
            left: resolutionTreeNode.left ? buildConcreteResolutionTree(resolutionTreeNode.left) : null,
            right: resolutionTreeNode.right ? buildConcreteResolutionTree(resolutionTreeNode.right) : null,
            v: {
              left: replaceVariablesWithFreshFunc(
                applySubstitutions(
                  [...resolutionTreeNode.v.leftSubstitutions, ...resolutionTreeNode.v.substitions, ...substitutionsOfAncestors],
                  resolutionTreeNode.v.left,
                ),
              ),
              right: replaceVariablesWithFreshFunc(
                applySubstitutions(
                  [...resolutionTreeNode.v.rightSubstitutions, ...resolutionTreeNode.v.substitions, ...substitutionsOfAncestors],
                  resolutionTreeNode.v.right,
                ),
              ),
              resolvent: replaceVariablesWithFreshFunc(
                applySubstitutions(
                  substitutionsOfAncestors,
                  resolutionTreeNode.v.resolvent,
                ),
              ),
            },
          };

          if (!n.left) {
            // `resolutionTreeNode.v.left` is one of the initial clauses
            // `n.v.left` has been obtained from that clause and does not contain variables
            instantiations.push([
              resolutionTreeNode.v.left,
              n.v.left,
            ]);
          }

          if (!n.right) {
            // `resolutionTreeNode.v.right` is one of the initial clauses
            // `n.v.right` has been obtained from that clause and does not contain variables
            instantiations.push([
              resolutionTreeNode.v.right,
              n.v.right,
            ]);
          }

          return n;
        };

        const concreteResolutionTree = buildConcreteResolutionTree(resolutionTree);

        return {
          instantiations,
          resolutions: (() => {
            // perform BFS on `concreteResolutionTree` and collect resolutions (without variables)
            const ret = [];
            {
              const queue = [concreteResolutionTree];
              while (true) {
                const n = queue.shift();
                if (!n) break;
                ret.push({
                  left: n.v.left,
                  right: n.v.right,
                  resolvent: n.v.resolvent,
                });
                if (n.left) queue.push(n.left);
                if (n.right) queue.push(n.right);
              }
            }

            return ret.reverse();
          })(),
        };
      }
    }
  }
}
