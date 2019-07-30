import { getClauses, refute, pushDisjunctionsInward, skolemize, pushQuantifiersOutward, pushNegationsInward, eliminateImplications } from '../src/resolution';
import chai from 'chai';
import 'mocha';
import { Predicate, Implication, PredicateApplication, Negation, Disjunction, Variable, Conjunction, ExistentialQuantification, UniversalQuantification, Formula } from '../src/syntax';

const unprovableFormulae = [
  (() => {
    const P = new Predicate('P');
    return new Conjunction(
      new PredicateApplication(P, []),
      new Negation(
        new PredicateApplication(P, []),
      ),
    );
  })(),
  (() => {
    const P = new Predicate('P');
    return new Implication(
      (() => {
        const x = new Variable('x');
        return new ExistentialQuantification(
          x,
          new PredicateApplication(P, [x]),
        );
      })(),
      (() => {
        const x = new Variable('x');
        return new UniversalQuantification(
          x,
          new Negation(
            new PredicateApplication(P, [x]),
          ),
        );
      })(),
    );
  })(),
];

const provableFormulae = [
  (() => {
    const P = new Predicate('P');
    const Q = new Predicate('Q');
    return new Implication(
      new Implication(
        new PredicateApplication(P, []),
        new PredicateApplication(Q, []),
      ),
      new Implication(
        new Negation(
          new PredicateApplication(Q, []),
        ),
        new Negation(
          new PredicateApplication(P, []),
        ),
      ),
    );
  })(),
  (() => {
    const P = new Predicate('P');
    return new Disjunction(
      new Negation(
        new PredicateApplication(P, []),
      ),
      new PredicateApplication(P, []),
    );
  })(),
  (() => {
    const P = new Predicate('P');
    return new Disjunction(
      (() => {
        const x = new Variable('x');
        return new ExistentialQuantification(
          x,
          new PredicateApplication(P, [x]),
        );
      })(),
      (() => {
        const x = new Variable('x');
        return new UniversalQuantification(
          x,
          new Negation(
            new PredicateApplication(P, [x]),
          ),
        );
      })(),
    );
  })(),
  (() => {
    const P = new Predicate('P');
    const Q = new Predicate('Q');
    return new Implication(
      (() => {
        const x = new Variable('x');
        const y = new Variable('y');
        return new UniversalQuantification(
          x,
          new UniversalQuantification(
            y,
            new Implication(
              new PredicateApplication(P, [x, y]),
              new PredicateApplication(Q, [x, y]),
            ),
          ),
        );
      })(),
      new Implication(
        (() => {
          const x = new Variable('x');
          const y = new Variable('y');
          return new ExistentialQuantification(
            x,
            new ExistentialQuantification(
              y,
              new PredicateApplication(P, [x, y]),
            ),
          );
        })(),
        (() => {
          const x = new Variable('x');
          const y = new Variable('y');
          return new ExistentialQuantification(
            x,
            new ExistentialQuantification(
              y,
              new PredicateApplication(Q, [x, y]),
            ),
          );
        })(),
      ),
    );
  })(),
];

const prepare = (formula: Formula) =>
  getClauses(
    pushDisjunctionsInward(
      skolemize(
        pushQuantifiersOutward(
          pushNegationsInward(
            eliminateImplications(
              new Negation(formula),
            ),
          ),
        ),
      ),
    ),
  );

describe('can prove provable formulae', () => {
  provableFormulae.forEach((formula) => {
    it(formula.toString(), () => {
      const clauses = prepare(formula);
      chai.assert.isNotNull(refute(clauses));
    });
  });
});

describe('cannot prove unprovable formulae', () => {
  unprovableFormulae.forEach((formula) => {
    it(formula.toString(), () => {
      chai.assert.isNull((() => {
        const clauses = prepare(formula);
        try {
          return refute(clauses);
        } catch (err) {
          return null;
        }
      })());
    });
  });
});
