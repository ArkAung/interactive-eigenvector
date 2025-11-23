# Eigenvector Visualizer

An interactive web-based educational tool for visualizing and understanding linear transformations, eigenvectors, and eigenvalues in 2D space.

## Purpose

This application helps students and learners develop an intuitive understanding of one of linear algebra's most important concepts: **eigenvectors**. Rather than just calculating eigenvalues mathematically, users can see what happens geometrically when linear transformations are applied to 2D space.

## Core Concept

**Eigenvectors** are special vectors that, when a linear transformation is applied, only get scaled (stretched or compressed) but maintain their direction. The scaling factor is called the **eigenvalue**.

For a transformation matrix **A** and eigenvector **v**:
```
A·v = λ·v
```
where λ (lambda) is the eigenvalue.

## Key Insights Users Will Gain

- Eigenvectors are directions that remain unchanged by a transformation (only scaled)
- Not all transformations have real eigenvectors (e.g., rotations)
- Some transformations have all vectors as eigenvectors (uniform scaling)
- Eigenvalues tell you how much stretching/compression happens along eigenvector directions
- Negative eigenvalues indicate reversal of direction
- Zero eigenvalues indicate dimension collapse (projection)