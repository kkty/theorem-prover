import { parseFormula } from '../src/parser';
import 'mocha';

describe('can parse valid formulae without errors', () => {
  const formulae = [
    'implies(implies(P(), Q()), implies(not(Q()), not(P())))',
    'or(not(P()), P())',
    'or(exists(x, P(x)), forall(x, not(P(x))))',
    'implies(forall(x, P(x)), exists(x, P(x)))',
    'implies(forall(x, forall(y, P(x, y))), exists(x, exists(y, P(x, y))))',
    'implies(and(forall(x, forall(y, forall(z, implies(A(x, y, z), A(s(x), y, s(z)))))), forall(x, A(z(), x, x))), A(s(z()), s(s(z())), s(s(s(z())))))',
  ];

  formulae.forEach((formula) => {
    it(formula, () => {
      parseFormula(formula);
    });
  });
});
