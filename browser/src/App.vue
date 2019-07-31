<template>
  <div id="app">
    <h1 class="mb-3 h3">Theorem Prover</h1>
    <p>An automated theorem prover for first-order predicate logic. Given a valid closed formula, it will find a proof using resolution principle if possible. Type a formula below or <a @click="showExample" href="#">click here (multiple times) to see examples</a>.</p>
    <div class="mb-3">
      <input
        type="text"
        class="form-control"
        v-model="formula"
      />
    </div>

    <template v-if="parsedFormula">
      <p class="mb-3">
        {{parsedFormula.toString()}}
      </p>
    </template>

    <template  v-if="negated">
      <p class="mb-3 font-weight-bold">negating</p>
      <p class="mb-3">{{negated.toString()}}</p>
    </template>

    <template v-if="implicationsFree && implicationsFree.toString() !== negated.toString()">
      <p class="mb-3 font-weight-bold">eliminating implications</p>
      <p class="mb-3">{{implicationsFree.toString()}}</p>
    </template>

    <template v-if="negationsPushed && negationsPushed.toString() !== implicationsFree.toString()">
      <p class="mb-3 font-weight-bold">pushing negations inward</p>
      <p class="mb-3">{{negationsPushed.toString()}}</p>
    </template>

    <template v-if="quantifiersPushed && quantifiersPushed.toString() !== negationsPushed.toString()">
      <p class="mb-3 font-weight-bold">pushing quantifiers outward</p>
      <p class="mb-3">{{quantifiersPushed.toString()}}</p>
    </template>

    <template v-if="skolemized && skolemized.toString() !== quantifiersPushed.toString()">
      <p class="mb-3 font-weight-bold">skolemizing</p>
      <p class="mb-3">{{skolemized.toString()}}</p>
    </template>

    <template v-if="disjunctionsPushed && disjunctionsPushed.toString() !== skolemized.toString()">
      <p class="mb-3 font-weight-bold">pushing disjunctions inward</p>
      <p class="mb-3">{{disjunctionsPushed.toString()}}</p>
    </template>

    <template v-if="clauses">
      <p class="mb-3 font-weight-bold">getting clauses</p>
      <p class="mb-3">{{clauses.map(c => c.toString()).join(' ')}}</p>
    </template>
    <button type="button" class="btn btn-primary btn-block mb-3" v-if="clauses && !refutationResult" @click="refute">Find Proof</button>

    <template v-if="refutationResult && refutationResult !== 'unprovable'">
      <p class="mb-3 text-primary font-weight-bold">Proof Found</p>
      <p class="mb-3">
        <ul class="list-unstyled">
          <li v-for="(instantiation, idx) in refutationResult.instantiations" :key="'instantiation' + idx">
            {{ instantiation[0] }} → {{ instantiation[1] }}
          </li>
        </ul>
        <ul class="list-unstyled">
          <li v-for="(resolution, idx) in refutationResult.resolutions" :key="'resolution' + idx">
            {{ resolution.left.toString() }} {{ resolution.right.toString() }}  → {{ resolution.resolvent.toString() }}
          </li>
        </ul>
      </p>
    </template>

    <p class="mb-3" v-if="refutationResult && refutationResult === 'unprovable'">
      unprovable
    </p>

    <p class="text-danger mb-3" v-if="formula && error">
      error: {{error.message}}
    </p>

    <p class="text-secondary">
      Created by Kazushi Kitaya. For source code and descriptions, refer to the <a href="https://github.com/kkty/theorem-prover">GitHub repository</a>.
    </p>
  </div>
</template>

<script>
import * as TheoremProver from 'theorem-prover/dist.browser/lib';

export default {
  name: 'app',
  data() {
    return {
      formula: '',
      error: '',
      refutationResult: null,
      examples: [
        'or(not(P()), P())',
        'or(exists(x, P(x)), forall(x, not(P(x))))',
        'implies(forall(x, forall(y, P(x, y))), exists(x, exists(y, P(x, y))))',
        'implies(exists(x, and(P(x), Q(x))), implies(exists(x, P(x)), exists(x, Q(x))))',
        'implies(forall(x, implies(P(x), Q(x))), implies(exists(x, P(x)), exists(x, Q(x))))',
        'implies(forall(x, forall(y, implies(P(x, y), exists(z, Q(x, y, z))))), implies(exists(x, exists(y, P(x, y))), exists(x, exists(y, exists(z, Q(x, y, z))))))',
        'implies(and(forall(x, forall(y, forall(z, implies(A(x, y, z), A(s(x), y, s(z)))))), forall(x, A(z(), x, x))), A(s(z()), s(s(z())), s(s(s(z())))))',
      ],
    };
  },
  computed: {
    parsedFormula() {
      return this.parse(this.formula);
    },
    negated() {
      if (!this.parsedFormula) return null;
      return new TheoremProver.Negation(this.parsedFormula);
    },
    implicationsFree() {
      if (!this.negated) return null;
      return TheoremProver.eliminateImplications(this.negated);
    },
    negationsPushed() {
      if (!this.implicationsFree) return null;
      return TheoremProver.pushNegationsInward(this.implicationsFree);
    },
    quantifiersPushed() {
      if (!this.negationsPushed) return null;
      return TheoremProver.pushQuantifiersOutward(this.negationsPushed);
    },
    skolemized() {
      if (!this.quantifiersPushed) return null;
      return TheoremProver.skolemize(this.quantifiersPushed);
    },
    disjunctionsPushed() {
      if (!this.skolemized) return null;
      return TheoremProver.pushDisjunctionsInward(this.skolemized);
    },
    clauses() {
      if (!this.disjunctionsPushed) return null;
      return TheoremProver.getClauses(this.disjunctionsPushed);
    },

  },
  methods: {
    showExample() {
      [this.formula] = this.examples;
      this.examples = [...this.examples.slice(1), this.examples[0]];
    },
    parse(formula) {
      try {
        this.error = '';
        this.refutationResult = null;
        return TheoremProver.parseFormula(formula);
      } catch (err) {
        this.error = err;
        return null;
      }
    },
    solve() {
      console.log(TheoremProver.parseFormula(this.input).toString());
    },
    refute() {
      if (!this.clauses) return;
      try {
        this.refutationResult = TheoremProver.refute(this.clauses, 3 * 1000) || 'unprovable';
      } catch (err) {
        this.refutationResult = null;
        this.error = err;
      }
    },
  },
};
</script>

<style>
#app {
  font-family: 'Open Sans', sans-serif;
  margin-top: 60px;
  max-width: 960px;
  padding: 30px;
  margin: 0 auto;
}
</style>
