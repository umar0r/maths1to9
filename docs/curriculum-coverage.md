# Curriculum coverage

What our built lessons actually teach, measured against the DfE GCSE maths subject content (`content/gcse-subject-content.json`).

Each statement is split into its parts. For each part:

- **Lessons**: the lesson folders that teach it (Learn or Try it), not just the ones whose skills link to it.
- **Covered**: `Yes` (taught and practised), `Partly` (some of it), `No` (no lesson teaches it yet).
- **Missing**: for `Partly`, the bit no lesson teaches, in a few words.

Checked all 50 built lesson folders at this commit, excluding `_template` and `_pie-charts`. Read the teaching, guided activities, Practice generators and Check questions. A topic used without explanation is not counted as teaching. A taught idea without pupil practice is only `Partly`. Broad statements stay `Partly` when named content is missing. `No` rows use a dash because the whole part is missing.

Tier: **F** = Foundation (both tiers), **H** = Higher only.

Last checked against `origin/main` at: `a9171a4b98b26c7d705191ac617e3a2f783ff03e`

## Summary

| Area | Parts | Yes | Partly | No |
|---|---|---|---|---|
| Number | 30 | 9 | 10 | 11 |
| Algebra | 64 | 15 | 20 | 29 |
| Ratio, proportion and rates of change | 29 | 8 | 6 | 15 |
| Geometry and measures | 39 | 3 | 8 | 28 |
| Probability | 10 | 0 | 0 | 10 |
| Statistics | 13 | 0 | 1 | 12 |
| **Total** | **185** | **35** | **45** | **105** |

## Number

### Structure and calculation

#### N1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| order positive and negative integers, decimals and fractions | F | `place-value`, `fractions-introduction` | Yes | — |
| use the symbols =, ≠, <, >, ≤, ≥ | F | `place-value`, `fractions-introduction`, `simplifying-fractions` | Partly | ≤ and ≥ |

#### N2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply the four operations, including formal written methods, to integers, decimals and simple fractions (proper and improper), and mixed numbers – all both positive and negative | F | `negative-numbers`, `adding-decimal-numbers`, `order-of-operations`, `fractions-introduction` | Partly | formal written integer methods; decimal subtraction and division; the four operations with fractions and mixed numbers |
| understand and use place value (e.g. when working with very large or very small numbers, and when calculating with decimals) | F | `place-value`, `adding-decimal-numbers`, `standard-form-to-ordinary-numbers` | Yes | — |

#### N3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| recognise and use relationships between operations, including inverse operations (e.g. cancellation to simplify calculations and expressions) | F | `function-machines-find-the-input-2`, `simplifying-fractions`, `place-value`, `solving-linear-equations` | Yes | — |
| use conventional notation for priority of operations, including brackets, powers, roots and reciprocals | F | `order-of-operations` | Yes | — |

#### N4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use the concepts and vocabulary of prime numbers, factors (divisors), multiples, common factors, common multiples, highest common factor, lowest common multiple, prime factorisation, including using product notation and the unique factorisation theorem | F | `factors`, `prime-factor-decomposition`, `highest-common-factor`, `lowest-common-multiple`, `simplifying-fractions` | Yes | — |

#### N5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply systematic listing strategies | F | `factors` | Yes | — |
| use the product rule for counting | H | — | No | — |

#### N6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use positive integer powers and associated real roots (square, cube and higher) | F | `indices-basics`, `order-of-operations`, `drawing-quadratic-graphs`, `drawing-cubic-graphs` | Partly | cube roots and higher roots |
| recognise powers of 2, 3, 4, 5 | F | `indices-basics` | Yes | — |
| estimate powers and roots of any given positive number | H | — | No | — |

#### N7

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate with roots, and with integer indices | F | `indices-basics`, `order-of-operations`, `multiplying-standard-form`, `standard-form-to-ordinary-numbers`, `drawing-quadratic-graphs`, `drawing-cubic-graphs` | Partly | cube and higher roots; zero and negative indices beyond powers of 10; general index laws |
| calculate with fractional indices | H | — | No | — |

#### N8

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate exactly with fractions and multiples of π | F | `simplifying-fractions`, `percentages-of-amounts`, `order-of-operations` | Partly | fraction calculations beyond simplifying and finding shares; multiples of π |
| calculate exactly with surds | H | — | No | — |
| simplify surd expressions involving squares (e.g. √12 = √(4 × 3) = √4 × √3 = 2√3) | H | — | No | — |
| rationalise denominators | H | — | No | — |

#### N9

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate with and interpret standard form A × 10ⁿ, where 1 ≤ A < 10 and n is an integer | F | `standard-form-to-ordinary-numbers`, `multiplying-standard-form` | Partly | ordinary numbers to standard form; addition, subtraction and division in standard form |

### Fractions, decimals and percentages

#### N10

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| work interchangeably with terminating decimals and their corresponding fractions (such as 3.5 and 7/2 or 0.375 and 3/8) | F | `convert-a-fraction-to-a-percentage`, `percentages-of-amounts` | Partly | general decimal-to-fraction conversions; improper fractions and mixed numbers in decimal form |
| change recurring decimals into their corresponding fractions and vice versa | H | — | No | — |

#### N11

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify and work with fractions in ratio problems | F | — | No | — |

#### N12

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| interpret fractions and percentages as operators | F | `percentages-of-amounts`, `percentage-multipliers`, `order-of-operations` | Yes | — |

### Measures and accuracy

#### N13

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use standard units of mass, length, time, money and other measures (including standard compound measures) using decimal quantities where appropriate | F | `speed-distance-time`, `density-and-pressure`, `time-between-two-times`, `scale-drawings`, `percentages-of-amounts`, `growth-decay-and-interest`, `indices-basics` | Yes | — |

#### N14

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| estimate answers | F | `rounding-and-significant-figures`, `adding-decimal-numbers` | Partly | pupil practice estimating calculations |
| check calculations using approximation and estimation, including answers obtained using technology | F | `rounding-and-significant-figures`, `adding-decimal-numbers` | Partly | pupil practice checking calculations with estimates |

#### N15

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| round numbers and measures to an appropriate degree of accuracy (e.g. to a specified number of decimal places or significant figures) | F | `rounding-and-significant-figures`, `significant-figures` | Partly | choosing a suitable number of decimal places or significant figures |
| use inequality notation to specify simple error intervals due to truncation or rounding | F | — | No | — |

#### N16

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply and interpret limits of accuracy | F | — | No | — |
| use upper and lower bounds | H | — | No | — |

## Algebra

### Notation, vocabulary and manipulation

#### A1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use and interpret algebraic notation, including: ab in place of a × b; 3y in place of y + y + y and 3 × y; a² in place of a × a, a³ in place of a × a × a, a²b in place of a × a × b; a/b in place of a ÷ b; coefficients written as fractions rather than as decimals; brackets | F | `algebraic-expressions`, `simplifying-expressions`, `substituting-into-formulae`, `drawing-quadratic-graphs`, `drawing-cubic-graphs`, `drawing-reciprocal-graphs`, `nth-term` | Partly | fractional coefficients; general a/b notation; mixed-letter products such as a²b |

#### A2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| substitute numerical values into formulae and expressions, including scientific formulae | F | `substituting-into-formulae`, `drawing-quadratic-graphs`, `drawing-cubic-graphs`, `drawing-reciprocal-graphs`, `nth-term`, `equations-of-straight-lines` | Yes | — |

#### A3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| understand and use the concepts and vocabulary of expressions, equations, formulae, identities, inequalities, terms and factors | F | `algebraic-expressions`, `simplifying-expressions`, `solving-linear-equations`, `solving-quadratic-equations`, `substituting-into-formulae` | Partly | identities and inequalities; the full set of terms used together |

#### A4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| simplify and manipulate algebraic expressions (including those involving surds) | F | `simplifying-expressions`, `solving-linear-equations`, `solving-quadratic-equations` | Partly | expressions involving surds |
| simplify and manipulate algebraic expressions by collecting like terms | F | `simplifying-expressions`, `solving-linear-equations`, `solving-quadratic-equations` | Yes | — |
| multiply a single term over a bracket | F | `solving-linear-equations` | Partly | letter terms outside brackets |
| take out common factors | F | `solving-quadratic-equations` | Partly | common factors other than a single x |
| expand products of two binomials | F | `solving-quadratic-equations` | Partly | binomials with coefficients of x other than 1 |
| factorise quadratic expressions of the form x² + bx + c, including the difference of two squares | F | `solving-quadratic-equations` | Yes | — |
| simplify expressions involving sums, products and powers, including the laws of indices | F | `simplifying-expressions` | Partly | division and powers of powers; zero and negative index laws |
| simplify and manipulate expressions involving algebraic fractions | H | — | No | — |
| expand products of more than two binomials | H | — | No | — |
| factorise quadratic expressions of the form ax² + bx + c | H | — | No | — |

#### A5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| understand and use standard mathematical formulae | F | `substituting-into-formulae`, `speed-distance-time`, `density-and-pressure`, `indices-basics` | Yes | — |
| rearrange formulae to change the subject | F | `equations-of-straight-lines` | Partly | formulae beyond linear equations rearranged for y |

#### A6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know the difference between an equation and an identity | F | — | No | — |
| argue mathematically to show algebraic expressions are equivalent | F | `solving-quadratic-equations`, `equations-of-straight-lines` | Partly | general arguments explaining why expressions are equivalent |
| use algebra to support and construct arguments | F | — | No | — |
| use algebra to construct proofs | H | — | No | — |

#### A7

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| where appropriate, interpret simple expressions as functions with inputs and outputs | F | `function-machines-find-the-input-2`, `nth-term` | Yes | — |
| interpret the reverse process as the ‘inverse function’ | H | `function-machines-find-the-input-2` | Partly | naming and interpreting the reverse rule as an inverse function |
| interpret the succession of two functions as a ‘composite function’ | H | — | No | — |

### Graphs

#### A8

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| work with coordinates in all four quadrants | F | `horizontal-and-vertical-lines`, `drawing-quadratic-graphs`, `drawing-cubic-graphs`, `quadratic-turning-points`, `simultaneous-equations-graphs` | Yes | — |

#### A9

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| plot graphs of equations that correspond to straight-line graphs in the coordinate plane | F | `horizontal-and-vertical-lines` | Partly | plotting sloping straight lines from equations |
| use the form y = mx + c to identify parallel lines | F | — | No | — |
| find the equation of the line through two given points, or through one point with a given gradient | F | `horizontal-and-vertical-lines` | Partly | sloping lines through two points or a point and a gradient |
| use the form y = mx + c to identify perpendicular lines | H | — | No | — |

#### A10

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify and interpret gradients and intercepts of linear functions graphically and algebraically | F | `finding-the-gradient`, `gradient-and-intercept`, `equations-of-straight-lines` | Yes | — |

#### A11

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify and interpret roots, intercepts, turning points of quadratic functions graphically | F | `quadratic-turning-points` | Partly | roots and intercepts read from quadratic graphs |
| deduce roots algebraically | F | `solving-quadratic-equations` | Yes | — |
| deduce turning points by completing the square | H | — | No | — |

#### A12

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| recognise, sketch and interpret graphs of linear functions, quadratic functions, simple cubic functions, the reciprocal function y = 1/x with x ≠ 0 | F | `recognising-graph-types`, `drawing-quadratic-graphs`, `drawing-cubic-graphs`, `drawing-reciprocal-graphs`, `horizontal-and-vertical-lines` | Partly | sketching sloping straight lines |
| recognise, sketch and interpret graphs of exponential functions y = kˣ for positive values of k | H | — | No | — |
| recognise, sketch and interpret the trigonometric functions (with arguments in degrees) y = sin x, y = cos x and y = tan x for angles of any size | H | — | No | — |

#### A13

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| sketch translations and reflections of a given function | H | `drawing-cubic-graphs`, `drawing-quadratic-graphs` | Partly | general translations and reflections of a given function |

#### A14

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| plot and interpret graphs (including reciprocal graphs) and graphs of non-standard functions in real contexts, to find approximate solutions to problems such as simple kinematic problems involving distance, speed and acceleration | F | `speed-from-distance-time-graphs`, `rate-of-change-graphs` | Partly | plotting real-context graphs; reciprocal and non-standard real-context graphs; acceleration |
| plot and interpret exponential graphs in real contexts | H | — | No | — |

#### A15

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate or estimate gradients of graphs and areas under graphs (including quadratic and other non-linear graphs), and interpret results in cases such as distance-time graphs, velocity-time graphs and graphs in financial contexts | H | `speed-from-distance-time-graphs`, `rate-of-change-graphs` | Partly | curved graphs; areas under graphs; velocity-time graphs |

#### A16

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| recognise and use the equation of a circle with centre at the origin | H | — | No | — |
| find the equation of a tangent to a circle at a given point | H | — | No | — |

### Solving equations and inequalities

#### A17

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve linear equations in one unknown algebraically (including those with the unknown on both sides of the equation) | F | `solving-linear-equations` | Partly | unknown on both sides |
| find approximate solutions using a graph | F | — | No | — |

#### A18

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve quadratic equations algebraically by factorising | F | `solving-quadratic-equations` | Yes | — |
| find approximate solutions using a graph | F | — | No | — |
| solve quadratic equations that require rearrangement | H | `solving-quadratic-equations` | Yes | — |
| solve quadratic equations by completing the square | H | — | No | — |
| solve quadratic equations using the quadratic formula | H | — | No | — |

#### A19

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve two simultaneous equations in two variables (linear/linear) algebraically | F | — | No | — |
| find approximate solutions using a graph | F | `simultaneous-equations-graphs` | Yes | — |
| solve linear/quadratic simultaneous equations | H | — | No | — |

#### A20

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| find approximate solutions to equations numerically using iteration | H | — | No | — |

#### A21

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| translate simple situations or procedures into algebraic expressions or formulae | F | `algebraic-expressions`, `solving-linear-equations` | Yes | — |
| derive an equation (or two simultaneous equations), solve the equation(s) and interpret the solution | F | `solving-linear-equations`, `solving-quadratic-equations` | Partly | forming and solving simultaneous equations from a situation |

#### A22

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve linear inequalities in one variable | F | — | No | — |
| represent the solution set on a number line | F | — | No | — |
| solve linear inequalities in two variables | H | — | No | — |
| solve quadratic inequalities in one variable | H | — | No | — |
| represent the solution set using set notation and on a graph | H | — | No | — |

### Sequences

#### A23

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| generate terms of a sequence from either a term-to-term or a position-to-term rule | F | `sequences`, `nth-term`, `finding-the-nth-term`, `fibonacci-sequences` | Yes | — |

#### A24

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| recognise and use sequences of triangular, square and cube numbers, simple arithmetic progressions, Fibonacci type sequences, quadratic sequences, and simple geometric progressions (rⁿ where n is an integer, and r is a rational number > 0) | F | `sequences`, `fibonacci-sequences`, `nth-term` | Partly | triangular and cube-number sequences; recognising quadratic sequences from their terms |
| recognise and use geometric progressions where r is a surd | H | — | No | — |
| recognise and use other sequences | H | `sequences` | Yes | — |

#### A25

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| deduce expressions to calculate the nth term of linear sequences | F | `finding-the-nth-term` | Yes | — |
| deduce expressions to calculate the nth term of quadratic sequences | H | — | No | — |

## Ratio, proportion and rates of change

#### R1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| change freely between related standard units (e.g. time, length, area, volume/capacity, mass) and compound units (e.g. speed, rates of pay, prices, density, pressure) in numerical and algebraic contexts | F | `time-between-two-times`, `speed-distance-time`, `density-and-pressure` | Partly | length, area, volume and capacity conversions; compound-unit conversions; algebraic conversions |

#### R2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use scale factors, scale diagrams and maps | F | `scale-drawings` | Yes | — |

#### R3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| express one quantity as a fraction of another, where the fraction is less than 1 or greater than 1 | F | `pie-charts` | Partly | one quantity as a fraction greater than 1 of another |

#### R4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use ratio notation, including reduction to simplest form | F | — | No | — |

#### R5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| divide a given quantity into two parts in a given part:part or part:whole ratio | F | — | No | — |
| express the division of a quantity into two parts as a ratio | F | — | No | — |
| apply ratio to real contexts and problems (such as those involving conversion, comparison, scaling, mixing, concentrations) | F | — | No | — |

#### R6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| express a multiplicative relationship between two quantities as a ratio or a fraction | F | — | No | — |

#### R7

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| understand and use proportion as equality of ratios | F | — | No | — |

#### R8

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| relate ratios to fractions and to linear functions | F | — | No | — |

#### R9

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| define percentage as ‘number of parts per hundred’ | F | `percentages-of-amounts`, `convert-a-fraction-to-a-percentage` | Yes | — |
| interpret percentages and percentage changes as a fraction or a decimal, and interpret these multiplicatively | F | `percentages-of-amounts`, `percentage-multipliers` | Yes | — |
| express one quantity as a percentage of another | F | `one-amount-as-a-percentage`, `convert-a-fraction-to-a-percentage` | Yes | — |
| compare two quantities using percentages | F | `percentages-of-amounts`, `one-amount-as-a-percentage` | Yes | — |
| work with percentages greater than 100% | F | `percentages-of-amounts`, `one-amount-as-a-percentage` | Yes | — |
| solve problems involving percentage change, including percentage increase/decrease and original value problems, and simple interest including in financial mathematics | F | `percentage-multipliers`, `growth-decay-and-interest` | Partly | original values after percentage change |

#### R10

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve problems involving direct and inverse proportion, including graphical and algebraic representations | F | `direct-proportion`, `inverse-proportion` | Partly | graphical and algebraic representations |

#### R11

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use compound units such as speed, rates of pay, unit pricing, density and pressure | F | `speed-distance-time`, `speed-from-distance-time-graphs`, `density-and-pressure`, `direct-proportion` | Partly | rates of pay |

#### R12

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| compare lengths, areas and volumes using ratio notation | F | — | No | — |
| make links to similarity (including trigonometric ratios) and scale factors | F | — | No | — |

#### R13

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| understand that X is inversely proportional to Y is equivalent to X is proportional to 1/Y | F | — | No | — |
| interpret equations that describe direct and inverse proportion | F | — | No | — |
| construct equations that describe direct and inverse proportion | H | — | No | — |

#### R14

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| interpret the gradient of a straight line graph as a rate of change | F | `rate-of-change-graphs`, `speed-from-distance-time-graphs` | Yes | — |
| recognise and interpret graphs that illustrate direct and inverse proportion | F | — | No | — |

#### R15

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| interpret the gradient at a point on a curve as the instantaneous rate of change | H | — | No | — |
| apply the concepts of average and instantaneous rate of change (gradients of chords and tangents) in numerical, algebraic and graphical contexts | H | — | No | — |

#### R16

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| set up, solve and interpret the answers in growth and decay problems, including compound interest | F | `percentage-multipliers`, `growth-decay-and-interest` | Yes | — |
| work with general iterative processes | H | `sequences` | Partly | general algebraic iterative processes beyond simple number machines |

## Geometry and measures

### Properties and constructions

#### G1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use conventional terms and notations: points, lines, vertices, edges, planes, parallel lines, perpendicular lines, right angles, polygons, regular polygons and polygons with reflection and/or rotation symmetries | F | `angle-facts` | Partly | vertices, edges, planes, polygons, regular polygons and symmetries; the full notation |
| use the standard conventions for labelling and referring to the sides and angles of triangles | F | — | No | — |
| draw diagrams from written description | F | `scale-drawings` | Partly | diagrams beyond rectangular scale plans |

#### G2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use the standard ruler and compass constructions (perpendicular bisector of a line segment, constructing a perpendicular to a given line from/at a given point, bisecting a given angle) | F | — | No | — |
| use these to construct given figures and solve loci problems | F | — | No | — |
| know that the perpendicular distance from a point to a line is the shortest distance to the line | F | — | No | — |

#### G3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply the properties of angles at a point, angles at a point on a straight line, vertically opposite angles | F | `angle-facts` | Yes | — |
| understand and use alternate and corresponding angles on parallel lines | F | `angle-facts` | Yes | — |
| derive and use the sum of angles in a triangle (e.g. to deduce and use the angle sum in any polygon, and to derive properties of regular polygons) | F | — | No | — |

#### G4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| derive and apply the properties and definitions of special types of quadrilaterals, including square, rectangle, parallelogram, trapezium, kite and rhombus; and triangles and other plane figures using appropriate language | F | — | No | — |

#### G5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use the basic congruence criteria for triangles (SSS, SAS, ASA, RHS) | F | — | No | — |

#### G6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply angle facts, triangle congruence, similarity and properties of quadrilaterals to conjecture and derive results about angles and sides, including Pythagoras’ Theorem and the fact that the base angles of an isosceles triangle are equal, and use known results to obtain simple proofs | F | `angle-facts` | Partly | triangle congruence, similarity, quadrilaterals, Pythagoras and geometric proofs |

#### G7

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify, describe and construct congruent and similar shapes, including on coordinate axes, by considering rotation, reflection, translation and enlargement (including fractional scale factors) | F | — | No | — |
| enlarge using negative scale factors | H | — | No | — |

#### G8

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| describe the changes and invariance achieved by combinations of rotations, reflections and translations | H | — | No | — |

#### G9

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify and apply circle definitions and properties, including: centre, radius, chord, diameter, circumference, tangent, arc, sector and segment | F | `pie-charts` | Partly | circle vocabulary beyond centre and sector |

#### G10

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply and prove the standard circle theorems concerning angles, radii, tangents and chords, and use them to prove related results | H | — | No | — |

#### G11

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| solve geometrical problems on coordinate axes | F | — | No | — |

#### G12

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| identify properties of the faces, surfaces, edges and vertices of: cubes, cuboids, prisms, cylinders, pyramids, cones and spheres | F | — | No | — |

#### G13

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| construct and interpret plans and elevations of 3D shapes | F | — | No | — |

### Mensuration and calculation

#### G14

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use standard units of measure and related concepts (length, area, volume/capacity, mass, time, money, etc.) | F | `time-between-two-times`, `speed-distance-time`, `density-and-pressure`, `scale-drawings`, `indices-basics`, `substituting-into-formulae` | Yes | — |

#### G15

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| measure line segments and angles in geometric figures, including interpreting maps and scale drawings and use of bearings | F | `scale-drawings`, `pie-charts` | Partly | bearings; measuring angles beyond pie-chart construction |

#### G16

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know and apply formulae to calculate: area of triangles, parallelograms, trapezia; volume of cuboids and other right prisms (including cylinders) | F | `indices-basics` | Partly | areas of triangles, parallelograms and trapezia; volumes of cuboids other than cubes and other right prisms |

#### G17

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know the formulae: circumference of a circle = 2πr = πd, area of a circle = πr² | F | — | No | — |
| calculate: perimeters of 2D shapes, including circles; areas of circles and composite shapes; surface area and volume of spheres, pyramids, cones and composite solids | F | `substituting-into-formulae` | Partly | perimeters beyond rectangles; circles and composite areas; surface areas; sphere, cone and composite volumes |

#### G18

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate arc lengths, angles and areas of sectors of circles | F | `pie-charts` | Partly | arc lengths and sector areas |

#### G19

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply the concepts of congruence and similarity, including the relationships between lengths in similar figures | F | — | No | — |
| use the relationships between areas and volumes in similar figures | H | — | No | — |

#### G20

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know the formulae for Pythagoras’ theorem, a² + b² = c², and the trigonometric ratios, sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse and tan θ = opposite/adjacent | F | — | No | — |
| apply them to find angles and lengths in right-angled triangles in two dimensional figures | F | — | No | — |
| apply them to find angles and lengths in general triangles, where possible | H | — | No | — |
| apply them in three dimensional figures | H | — | No | — |

#### G21

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know the exact values of sin θ and cos θ for θ = 0°, 30°, 45°, 60° and 90° | F | — | No | — |
| know the exact value of tan θ for θ = 0°, 30°, 45° and 60° | F | — | No | — |

#### G22

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know and apply the sine rule, a/sin A = b/sin B = c/sin C, and cosine rule, a² = b² + c² − 2bc cos A, to find unknown lengths and angles | H | — | No | — |

#### G23

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| know and apply Area = ½ab sin C to calculate the area, sides or angles of any triangle | H | — | No | — |

### Vectors

#### G24

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| describe translations as 2D vectors | F | — | No | — |

#### G25

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply addition and subtraction of vectors, multiplication of vectors by a scalar, and diagrammatic and column representations of vectors | F | — | No | — |
| use vectors to construct geometric arguments and proofs | H | — | No | — |

## Probability

#### P1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| record, describe and analyse the frequency of outcomes of probability experiments using tables and frequency trees | F | — | No | — |

#### P2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply ideas of randomness, fairness and equally likely events to calculate expected outcomes of multiple future experiments | F | — | No | — |

#### P3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| relate relative expected frequencies to theoretical probability, using appropriate language and the 0 - 1 probability scale | F | — | No | — |

#### P4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply the property that the probabilities of an exhaustive set of outcomes sum to one | F | — | No | — |
| apply the property that the probabilities of an exhaustive set of mutually exclusive events sum to one | F | — | No | — |

#### P5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| understand that empirical unbiased samples tend towards theoretical probability distributions, with increasing sample size | F | — | No | — |

#### P6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| enumerate sets and combinations of sets systematically, using tables, grids, Venn diagrams and tree diagrams | F | — | No | — |

#### P7

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| construct theoretical possibility spaces for single and combined experiments with equally likely outcomes and use these to calculate theoretical probabilities | F | — | No | — |

#### P8

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate the probability of independent and dependent combined events, including using tree diagrams and other representations, and know the underlying assumptions | F | — | No | — |

#### P9

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| calculate and interpret conditional probabilities through representation using expected frequencies with two-way tables, tree diagrams and Venn diagrams | H | — | No | — |

## Statistics

#### S1

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| infer properties of populations or distributions from a sample, whilst knowing the limitations of sampling | F | — | No | — |

#### S2

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| interpret and construct tables, charts and diagrams, including frequency tables, bar charts, pie charts and pictograms for categorical data, vertical line charts for ungrouped discrete numerical data, tables and line graphs for time series data and know their appropriate use | F | `pie-charts` | Partly | constructing frequency tables; bar charts, pictograms, vertical line charts and time-series graphs; choosing suitable charts |

#### S3

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| construct and interpret diagrams for grouped discrete data and continuous data, i.e. histograms with equal and unequal class intervals and cumulative frequency graphs, and know their appropriate use | H | — | No | — |

#### S4

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| interpret, analyse and compare the distributions of data sets from univariate empirical distributions through appropriate graphical representation involving discrete, continuous and grouped data | F | — | No | — |
| use appropriate measures of central tendency (median, mean, mode and modal class) and spread (range, including consideration of outliers) | F | — | No | — |
| use box plots | H | — | No | — |
| use quartiles and inter-quartile range | H | — | No | — |

#### S5

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| apply statistics to describe a population | F | — | No | — |

#### S6

| Part | Tier | Lessons | Covered | Missing |
|---|---|---|---|---|
| use and interpret scatter graphs of bivariate data | F | — | No | — |
| recognise correlation and know that it does not indicate causation | F | — | No | — |
| draw estimated lines of best fit | F | — | No | — |
| make predictions | F | — | No | — |
| interpolate and extrapolate apparent trends whilst knowing the dangers of so doing | F | — | No | — |

## Skill links that don't match the lesson

`content_references` in `content/skills.json` that point to a statement the lesson doesn't teach, or miss one it does.

Only skills used by built lessons are assessed here. References describe a statement, not every part of it. Extra references below include supporting ideas explicitly taught in the lesson; they do not mean those statements are fully covered. Two scope mismatches keep N15 because whole-number rounding still belongs there. No skill file has been changed.

| Lesson | Skill | Links now | Should be | Why |
|---|---|---|---|---|
| `place-value` | `place-value` | N2 | N2, N3 | The “Changes can cancel out” screen teaches inverse scaling of factors, with a matching Try it activity. |
| `adding-decimal-numbers` | `decimal-add-subtract` | N2 | N2, N14 | Learn checks 14.7 + 6.82 with an estimate near 22. Estimation is explained but not practised. |
| `order-of-operations` | `order-of-operations` | N3 | N2, N3, N6, N7, N8, N12 | Learn and the generator include signed arithmetic, powers, square roots and multiplication by unit fractions. |
| `rounding-and-significant-figures` | `round-in-context` | N15 | N14, N15, with narrower skill wording | Learn explains estimates and checking calculator answers. Practice has practical rounding, but Learn and Try it do not teach choosing suitable accuracy. Significant figures are now taught in the separate `significant-figures` lesson; neither current skill here links to a separate statement for them. |
| `fractions-introduction` | `interpret-fractions` | N2, N8 | N2 | Names and pictures fractions; converts mixed and improper fractions. It does not teach exact fraction calculations under N8. |
| `fractions-introduction` | `compare-fractions` | N1, N10 | N1 | Compares and orders fractions, including negatives. No fraction–decimal conversion is taught. |
| `simplifying-fractions` | `equivalent-fractions` | N2, N3 | N3, N8 | Teaches equivalent fractions and exact simplification, rather than the four operations on fractions or place value. |
| `simplifying-fractions` | `simplify-fractions` | N3, N4 | N1, N3, N4, N8 | Also explains =, ≠, < and > and rewrites fractions exactly. These links would still describe only parts of N1 and N8. |
| `indices-basics` | `positive-integer-powers` | N6 | N6, N7, N13, A5, G14, G16 | Teaches and calculates powers; explains square units, square area and cube volume, and practises square/cube applications. |
| `factors` | `factors-and-multiples` | N4 | N4, N5 | Teaches an ordered, complete listing of factor pairs and when to stop. |
| `standard-form-to-ordinary-numbers` | `write-standard-form` | N9 | N2, N7, N9, with conversion-specific skill wording | Explains place-value shifts and positive, zero and negative powers of 10. Pupils convert from standard form; they do not write ordinary numbers in standard form. |
| `multiplying-standard-form` | `calculate-standard-form` | N9 | N7, N9 | Explicitly teaches adding positive and negative indices when multiplying powers of 10. |
| `algebraic-expressions` | `write-expressions` | A1, A21 | A1, A3, A21 | Introduces what an expression is. This is only part of the vocabulary in A3. |
| `substituting-into-formulae` | `substitute-formulae` | A2 | A1, A2, A3, A5, G14, G17 | Learn explains formulae, adjacent letters and brackets; uses standard measure units and rectangle perimeter and square-based pyramid volume formulae. G17 is only partial. |
| `simplifying-expressions` | `collect-like-terms` | A4 | A3, A4 | Learn explicitly defines expressions, terms and coefficients before collecting terms. |
| `solving-linear-equations` | `solve-one-step-equations`, `solve-two-step-equations` | A17 | N3, A3, A17, A21 | Teaches equations, inverse operations and forming an equation from a fare or cost story. The lesson never puts the unknown on both sides. |
| `solving-linear-equations` | `solve-equations-with-brackets` | A17 | A4, A17 | Teaches multiplying each term inside a bracket and collecting the resulting terms, as well as solving. |
| `solving-quadratic-equations` | `solve-quadratics-factorising` | A18 | A3, A4, A6, A11, A18, A21 | Defines factors; expands two monic brackets; factorises monic quadratics, common x and a difference of squares; explains equivalent forms; deduces roots algebraically and interprets a rectangle equation. A6 and A21 remain partial. |
| `horizontal-and-vertical-lines` | `horizontal-vertical-lines` | A9 | A8, A9, A12 | Explains coordinates while drawing lines and recognises their equations and shapes. This covers only horizontal and vertical cases within A9 and A12. |
| `equations-of-straight-lines` | `use-y-mx-c` | A9, A10 | A2, A5, A6, A10 | Teaches substitution to test a point, rearrangement for y and equivalent equations. It does not teach plotting sloping lines, parallel lines or finding their equations from points/gradient under A9. Pressing an equation button only reveals its graph. |
| `simultaneous-equations-graphs` | `simultaneous-graphs` | A19 | A8, A19 | Teaches reading both coordinates of the crossing, including negative and estimated coordinates. |
| `drawing-quadratic-graphs` | `quadratic-graphs` | A11, A12 | N6, N7, A1, A2, A8, A12, A13 | Teaches squares, substitution, plotting coordinates and the upside-down curve. No roots, intercepts or turning points are identified under A11. The shape change gives only partial A13 coverage. |
| `quadratic-turning-points` | `quadratic-turning-points` | A11 | A8, A11 | Teaches reading x then y for a turning point in any quadrant. |
| `drawing-cubic-graphs` | `cubic-graphs` | A12 | N6, N7, A1, A2, A8, A12, A13 | Teaches x³, negative cubes, substitution, coordinates and moving every point up 1 for y = x³ + 1. A13 is only partial. |
| `drawing-reciprocal-graphs` | `reciprocal-graphs` | A12 | A1, A2, A12 | Explicitly teaches that 1/x means 1 ÷ x, then substitutes x to fill the table. |
| `speed-from-distance-time-graphs` | `speed-from-distance-time-graph` | A14, R11, R14 | A14, A15, R11, R14 | Calculates gradients of straight sections and interprets speed. This is only the straight-line part of A15: no curved gradients or areas under graphs. |
| `sequences` | `generate-sequences` | A23 | A23, A24, R16 | Also recognises arithmetic/geometric sequences and repeats a two-step number-machine rule. R16 covers only this simple iterative process. |
| `nth-term` | `use-nth-term` | A23 | A1, A2, A7, A23, A24 | Explains powers, substitution and a rule turning each position into its term; uses quadratic rules as well as linear ones. |
| `finding-the-nth-term` | `find-linear-nth-term` | A25 | A23, A25 | Pupils use their new rule to calculate later terms, as well as deducing it. |
| `fibonacci-sequences` | `continue-fibonacci-sequences` | A24 | A23, A24 | Explicitly teaches and practises generating terms from a rule using the previous two terms. |
| `percentages-of-amounts` | `percentage-as-operator`, `percentage-of-amount` | N12, R9 | N8, N10, N12, N13, R9 | Teaches exact fractional shares and fraction/decimal/percentage equivalents, then uses decimal quantities of money and mass. N8 and N10 are partial. |
| `growth-decay-and-interest` | `simple-interest`, `compound-growth-decay` | R9; R16 respectively | Keep R9 and R16 respectively; add N13 for the money work | Uses decimal money amounts and distinguishes the total balance from interest earned. |
| `direct-proportion` | `direct-proportion-numerical` | R10 | R10, R11 | Explicitly teaches finding the price of one item, a unit price. |
| `speed-distance-time` | `speed-distance-time` | R11 | N13, A5, R1, R11, G14 | Explains standard speed units, uses the three related formulae and teaches hours/minutes to decimal hours. |
| `density-and-pressure` | `density-mass-volume` | R1, R11 | N13, A5, R1, R11, G14 | Explains g/cm³, the related formulae and kg-to-g conversion. |
| `density-and-pressure` | `pressure-force-area` | R1, R11 | N13, A5, R11, G14 | Explains pressure units and the three related formulae, but does not convert pressure or area units. The lesson’s R1 coverage comes from mass conversion in its density work. |
| `rate-of-change-graphs` | `gradient-as-rate` | R14 | A14, A15, R14 | Also reads and interprets real-context graphs and calculates straight-section gradients. A14 and A15 remain partial. |
| `time-between-two-times` | `time-calculations` | G14, R1 | N13, R1, G14 | Explains standard time units and 60 minutes to an hour, alongside time calculations. |
| `scale-drawings` | `scale-drawings` | R2, G15 | N13, R2, G1, G14, G15 | Teaches rectangular drawings from descriptions and standard lengths/areas. The different units describe a drawing scale, not conversion between units. No bearings are taught. |
| `angle-facts` | `angles-point-line`, `vertically-opposite-angles`, `parallel-line-angles` | G3 | G1, G3, G6 | Also introduces angle types, parallel-line notation and linked angle arguments. G1 and G6 are partial; this is not a lesson on triangle or polygon properties or geometric proofs. |
| `pie-charts` | `construct-pie-charts` | S2 | R3, G9, G15, G18, S2 | Defines a sector and uses the centre; teaches shares as fractions, measuring sector angles with a protractor and calculating those angles. It does not teach arc lengths or sector areas. |
| `pie-charts` | `interpret-pie-charts` | S2 | R3, S2 | Teaches how a slice represents a fraction of the total group. |

## Lessons with no matching statement

Built lessons whose content isn't in the GCSE subject content at all.

| Lesson | Note |
|---|---|
| None | All 50 built lessons teach at least part of a GCSE statement. None was left unjudged. |
