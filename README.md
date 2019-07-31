# Theorem Prover

An automated theorem prover for first-order predicate logic written in TypeScript. It can prove provable closed formulae by using resolution principle.

## How it works

- Let F1 be a closed formula, validity of which is in concern.
- Get formula F2 by negating F1.
  - F2 is unsatisfiable if and only if F1 is valid.
- Get formula F3 which is logically equivalent to F2 and does not contain implications.
  - F3 is unsutisfiable if and only if F2 is unsatisfiable.
  - This is possible using the fact that `A implies B` is logically equivalent to `(not A) or B`.
- Get formula F4 which is logically equivalent to F3 and negations in which are pushed inward as much as possible.
  - F4 is unsutisfiable if and only if F3 is unsatisfiable.
- Introduce skolem functions to F4 and remove all its quantifiers, let the obtained formula be F5.
  - F5 is unsutisfiable if and only if F4 is unsatisfiable.
- By pushsing disjunctions inward as much as possible, we can obtain a formula in CNF from F5. Let it be F6.
- Let the corresponding set of clauses be C.
- Perform resolution refutation on C.
  - If the refutation succeeds (that is, if we obtain an empty clause from C by variabe replacements and resolutions), F6 is unsatisfiable. From this, we can say that F1 is valid.

## Usage

- Requirements: Node.js (>=10)

```console
$ npm i theorem-prover -g
$ theorem-prover
```

By default, a timeout error is thrown if it takes more than 5 seconds for resolutions. That can be overwritten as follows.

```console
$ THEOREM_PROVER_TIMEOUT=10 theorem-prover
```

## Examples

### Provable formulae

```console
$ theorem-prover
> implies(forall(x, or(P(x), Q(x))), forall(x, implies(not(P(x)), Q(x))))
(∀x0.((P(x0) ⋁ Q(x0))) → ∀x1.((¬(P(x1)) → Q(x1))))

negating
¬((∀x0.((P(x0) ⋁ Q(x0))) → ∀x1.((¬(P(x1)) → Q(x1)))))

eliminating implications
¬((¬(∀x0.((P(x0) ⋁ Q(x0)))) ⋁ ∀x1.((¬(¬(P(x1))) ⋁ Q(x1)))))

pushing negations inward
(∀x0.((P(x0) ⋁ Q(x0))) ⋀ ∃x1.((¬(P(x1)) ⋀ ¬(Q(x1)))))

pushing quantifiers outward
∀x0.(∃x1.(((P(x0) ⋁ Q(x0)) ⋀ (¬(P(x1)) ⋀ ¬(Q(x1))))))

skolemizing
((P(x0) ⋁ Q(x0)) ⋀ (¬(P(sko0(x0))) ⋀ ¬(Q(sko0(x0)))))

pushing disjunctions inward
((P(x0) ⋁ Q(x0)) ⋀ (¬(P(sko0(x0))) ⋀ ¬(Q(sko0(x0)))))

getting clauses
{P(x0), Q(x0)}, {¬P(sko0(x0))}, {¬Q(sko0(x0))}

proof found

instantiations
{P(x0), Q(x0)} -> {P(sko0(_())), Q(sko0(_()))}
{¬Q(sko0(x0))} -> {¬Q(sko0(_()))}
{¬P(sko0(x0))} -> {¬P(sko0(_()))}

resolutions
({P(sko0(_())), Q(sko0(_()))}, {¬Q(sko0(_()))}) -> {P(sko0(_()))}
({¬P(sko0(_()))}, {P(sko0(_()))}) -> {}

> implies(and(forall(x, forall(y, forall(z, implies(A(x, y, z), A(s(x), y, s(z)))))), forall(x, A(z(), x, x))), A(s(z()), s(s(z())), s(s(s(z())))))
((∀x0.(∀y0.(∀z0.((A(x0, y0, z0) → A(s(x0), y0, s(z0)))))) ⋀ ∀x1.(A(z(), x1, x1))) → A(s(z()), s(s(z())), s(s(s(z())))))

negating
¬(((∀x0.(∀y0.(∀z0.((A(x0, y0, z0) → A(s(x0), y0, s(z0)))))) ⋀ ∀x1.(A(z(), x1, x1))) → A(s(z()), s(s(z())), s(s(s(z()))))))

eliminating implications
¬((¬((∀x0.(∀y0.(∀z0.((¬(A(x0, y0, z0)) ⋁ A(s(x0), y0, s(z0)))))) ⋀ ∀x1.(A(z(), x1, x1)))) ⋁ A(s(z()), s(s(z())), s(s(s(z()))))))

pushing negations inward
((∀x0.(∀y0.(∀z0.((¬(A(x0, y0, z0)) ⋁ A(s(x0), y0, s(z0)))))) ⋀ ∀x1.(A(z(), x1, x1))) ⋀ ¬(A(s(z()), s(s(z())), s(s(s(z()))))))

pushing quantifiers outward
∀x0.(∀y0.(∀z0.(∀x1.((((¬(A(x0, y0, z0)) ⋁ A(s(x0), y0, s(z0))) ⋀ A(z(), x1, x1)) ⋀ ¬(A(s(z()), s(s(z())), s(s(s(z()))))))))))

skolemizing
(((¬(A(x0, y0, z0)) ⋁ A(s(x0), y0, s(z0))) ⋀ A(z(), x1, x1)) ⋀ ¬(A(s(z()), s(s(z())), s(s(s(z()))))))

pushing disjunctions inward
(((¬(A(x0, y0, z0)) ⋁ A(s(x0), y0, s(z0))) ⋀ A(z(), x1, x1)) ⋀ ¬(A(s(z()), s(s(z())), s(s(s(z()))))))

getting clauses
{¬A(x0, y0, z0), A(s(x0), y0, s(z0))}, {A(z(), x1, x1)}, {¬A(s(z()), s(s(z())), s(s(s(z()))))}

proof found

instantiations
{¬A(x0, y0, z0), A(s(x0), y0, s(z0))} -> {¬A(z(), s(s(z())), s(s(z()))), A(s(z()), s(s(z())), s(s(s(z()))))}
{¬A(s(z()), s(s(z())), s(s(s(z()))))} -> {¬A(s(z()), s(s(z())), s(s(s(z()))))}
{A(z(), x1, x1)} -> {A(z(), s(s(z())), s(s(z())))}

resolutions
({¬A(z(), s(s(z())), s(s(z()))), A(s(z()), s(s(z())), s(s(s(z()))))}, {¬A(s(z()), s(s(z())), s(s(s(z()))))}) -> {¬A(z(), s(s(z())), s(s(z())))}
({A(z(), s(s(z())), s(s(z())))}, {¬A(z(), s(s(z())), s(s(z())))}) -> {}
```

### Unprovable formulae

```console
$ theorem-prover
> and(P(), not(P()))
(P() ⋀ ¬(P()))

negating
¬((P() ⋀ ¬(P())))

eliminating implications
¬((P() ⋀ ¬(P())))

pushing negations inward
(¬(P()) ⋁ P())

pushing quantifiers outward
(¬(P()) ⋁ P())

skolemizing
(¬(P()) ⋁ P())

pushing disjunctions inward
(¬(P()) ⋁ P())

getting clauses
{¬P(), P()}

cannot be proven

> and(exists(x, P(x)), forall(x, not(P(x))))
(∃x0.(P(x0)) ⋀ ∀x1.(¬(P(x1))))

negating
¬((∃x0.(P(x0)) ⋀ ∀x1.(¬(P(x1)))))

eliminating implications
¬((∃x0.(P(x0)) ⋀ ∀x1.(¬(P(x1)))))

pushing negations inward
(∀x0.(¬(P(x0))) ⋁ ∃x1.(P(x1)))

pushing quantifiers outward
∀x0.(∃x1.((¬(P(x0)) ⋁ P(x1))))

skolemizing
(¬(P(x0)) ⋁ P(sko0(x0)))

pushing disjunctions inward
(¬(P(x0)) ⋁ P(sko0(x0)))

getting clauses
{¬P(x0), P(sko0(x0))}

error: refutation timeout
```
