import readline from 'readline';
import { Formula, Negation } from './syntax';
import { parseFormula } from './parser';
import { pushNegationsInward, eliminateImplications, pushQuantifiersOutward, skolemize, pushDisjunctionsInward, getClauses, refute } from './resolution';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.prompt();

rl.on('line', (input) => {
  try {
    let formula = parseFormula(input);
    console.log(formula.toString());
    console.log();

    [
      { f: (formula: Formula) => new Negation(formula), message: 'negating' },
      { f: eliminateImplications, message: 'eliminating implications' },
      { f: pushNegationsInward, message: 'pushing negations inward' },
      { f: pushQuantifiersOutward, message: 'pushing quantifiers outward' },
      { f: skolemize, message: 'skolemizing' },
      { f: pushDisjunctionsInward, message: 'pushing disjunctions inward' },
    ]
      .forEach(({ f, message }) => {
        console.log(message);
        formula = f(formula);
        console.log(formula.toString());
        console.log();
      });

    console.log('getting clauses');
    const clauses = getClauses(formula);
    console.log(clauses.map(i => i.toString()).join(', '));
    console.log();

    const tree = refute(clauses, 3000);
    if (tree === null) {
      console.log('cannot be proven');
    } else {
      console.log('proof found');
      for (const clauses of tree.reverse()) {
        console.log(clauses.map(i => i.toString()).join(' '));
      }
    }
  } catch (err) {
    console.log(`error: ${err.message}`);
  }
  rl.prompt();
});
