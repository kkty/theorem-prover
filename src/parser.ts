import pegjs from 'pegjs';
import { Formula, Func, Variable, FuncApplication, Term, Predicate, Negation, PredicateApplication, Conjunction, Disjunction, Implication, UniversalQuantification, ExistentialQuantification } from './syntax';

// TODO: move the grammar defitnition to another file, and set up pre-compilation
const parser = pegjs.generate(`
formula
  = name:[A-Z]+ "(" terms:terms ")" { return { type: "predicate", name: name.join(''), terms } }
  / "and(" left:formula "," right:formula ")" { return { type: "and", left, right } }
  / "or(" left:formula "," right:formula ")" { return { type: "or", left, right } }
  / "implies(" left:formula "," right:formula ")" { return { type: "implies", left, right } }
  / "not(" inner:formula ")" { return { type: "not", inner } }
  / "forall(" variable:variable "," formula:formula ")" { return { type: "forall", variable, formula } }
  / "exists(" variable:variable "," formula:formula ")" { return { type: "exists", variable, formula } }

variable
  = name:[a-z]+ { return { type: "variable", name: name.join('') }; }

term
  =  name:[a-z]+ "(" terms:terms ")" { return { type: "function", name: name.join(''), terms } }
  / variable

terms
  = term:term "," terms:terms { return [term, ...terms] }
  / term:term { return [term] }
  / "" { return [] }
`);

function extractNames(obj: any, type: 'predicate' | 'function' | 'variable'): Set<string> {
  const ret = new Set<string>();

  if (obj.type === type) {
    ret.add(obj.name);
  }

  if (
    obj.type === 'predicate' ||
    obj.type === 'function'
  ) {
    for (const term of obj.terms) {
      extractNames(term, type).forEach((i) => { ret.add(i); });
    }
  }

  if (
    obj.type === 'and' ||
    obj.type === 'or' ||
    obj.type === 'implies'
  ) {
    extractNames(obj.left, type).forEach((i) => { ret.add(i); });
    extractNames(obj.right, type).forEach((i) => { ret.add(i); });
  }

  if (
    obj.type === 'forall' ||
    obj.type === 'exists'
  ) {
    extractNames(obj.formula, type).forEach((i) => { ret.add(i); });
  }

  if (obj.type === 'not') {
    extractNames(obj.inner, type).forEach((i) => { ret.add(i); });
  }

  return ret;
}

function convertToTerm(
  obj: any,
  variables: Map<string, Variable>,
  functions: Map<string, Func>,
): Term {
  if (obj.type === 'variable') {
    const variable = variables.get(obj.name);
    if (!variable) throw new Error('unbounded variable');
    return variable;
  }

  if (obj.type === 'function') {
    const func = functions.get(obj.name);
    if (!func) throw new Error('unbounded function');
    return new FuncApplication(
      func,
      obj.terms.map((term: any) => convertToTerm(term, variables, functions)),
    );
  }

  throw new Error('invalid object type');
}

function convertToFormula(
  obj: any,
  variables: Map<string, Variable>,
  functions: Map<string, Func>,
  predicates: Map<string, Predicate>,
  nextVariableIds: Map<string, number>,
): Formula {
  if (obj.type === 'not') {
    return new Negation(
      convertToFormula(obj.inner, variables, functions, predicates, nextVariableIds),
    );
  }

  if (obj.type === 'predicate') {
    const predicate = predicates.get(obj.name);
    if (!predicate) throw new Error('unbound predicate');
    return new PredicateApplication(
      predicate,
      obj.terms.map((term: any) => convertToTerm(term, variables, functions)),
    );
  }

  if (obj.type === 'and') {
    return new Conjunction(
      convertToFormula(obj.left, variables, functions, predicates, nextVariableIds),
      convertToFormula(obj.right, variables, functions, predicates, nextVariableIds),
    );
  }

  if (obj.type === 'or') {
    return new Disjunction(
      convertToFormula(obj.left, variables, functions, predicates, nextVariableIds),
      convertToFormula(obj.right, variables, functions, predicates, nextVariableIds),
    );
  }

  if (obj.type === 'implies') {
    return new Implication(
      convertToFormula(obj.left, variables, functions, predicates, nextVariableIds),
      convertToFormula(obj.right, variables, functions, predicates, nextVariableIds),
    );
  }

  if (obj.type === 'forall' || obj.type === 'exists') {
    // append different ids to different variables sharing the same name
    // not necessary, but it improves readability

    const id = nextVariableIds.get(obj.variable.name) || 0;
    nextVariableIds.set(obj.variable.name, id + 1);

    const variable = new Variable(`${obj.variable.name}${id}`);

    const variablesUpdated: Map<string, Variable> = new Map();
    for (const [k, v] of variables.entries()) {
      variablesUpdated.set(k, v);
    }
    variablesUpdated.set(obj.variable.name, variable);

    if (obj.type === 'forall') {
      return new UniversalQuantification(
        variable,
        convertToFormula(obj.formula, variablesUpdated, functions, predicates, nextVariableIds),
      );
    }
    return new ExistentialQuantification(
        variable,
        convertToFormula(obj.formula, variablesUpdated, functions, predicates, nextVariableIds),
      );

  }

  throw new Error('invalid object type');
}

export function parseFormula(str: string): Formula {
  const obj = parser.parse(str.trim().replace(/ /g, ''));

  const variables: Map<string, Variable> = new Map();
  const nextVariableIds: Map<string, number> = new Map();

  // predicates/functions sharing the same name should point to the same instance

  const predicates: Map<string, Predicate> = new Map();
  const functions: Map<string, Func> = new Map();

  for (const n of extractNames(obj, 'predicate')) {
    predicates.set(n, new Predicate(n));
  }

  for (const n of extractNames(obj, 'function')) {
    functions.set(n, new Func(n));
  }

  return convertToFormula(obj, variables, functions, predicates, nextVariableIds);
}
