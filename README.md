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

## What This Application Does

### Visual Elements

1. **Transformation Grid**: A coordinate grid that deforms as the transformation is applied, showing how space itself is "warped" by the linear transformation

2. **Eigenvectors** (Cyan and Red arrows): These special vectors maintain their direction during the transformation. They only get stretched or compressed along their existing line. This is the key insight - while everything else in the space rotates and deforms, eigenvectors stay on their original line.

3. **Test Vectors** (Yellow arrows): Regular vectors scattered around the space that demonstrate typical transformation behavior. These rotate, shear, and change direction - contrasting with the eigenvectors' stability.

4. **Axes**: The transformed x and y coordinate axes, showing how the fundamental basis vectors change.

### Interactive Features

#### Custom Matrix Input
Users can enter any 2×2 transformation matrix:
```
[a  b]
[c  d]
```
The application automatically:
- Calculates eigenvalues using the characteristic equation: λ² - trace(A)·λ + det(A) = 0
- Computes eigenvectors by solving (A - λI)v = 0
- Handles edge cases like complex eigenvalues, repeated eigenvalues, and degenerate cases
- Updates the visualization in real-time

#### Animation System
- **Play Animation**: Smoothly interpolates from the identity transformation to the target transformation
- **Step-by-Step**: Advance through the transformation incrementally to study specific stages
- **Variable Speed**: Control animation speed from 0.1x to 3.0x
- **Progress Indicator**: Visual feedback showing transformation progress (0% = identity, 100% = full transformation)

#### Preset Transformation Library

Seven carefully chosen transformations that demonstrate different eigenvalue/eigenvector scenarios:

1. **Rotation (90°)**:
   - Matrix: `[[0, -1], [1, 0]]`
   - Complex eigenvalues (no real eigenvectors)
   - Demonstrates that rotations don't have real eigenvectors - nothing maintains its direction

2. **Uniform Scaling (2×)**:
   - Matrix: `[[2, 0], [0, 2]]`
   - Every vector is an eigenvector
   - Eigenvalue λ = 2 for all directions

3. **Shear X**:
   - Matrix: `[[1, 1], [0, 1]]`
   - Horizontal shearing transformation
   - X-axis vectors are eigenvectors (λ = 1)

4. **Shear Y**:
   - Matrix: `[[1, 0], [1, 1]]`
   - Vertical shearing transformation
   - Y-axis vectors are eigenvectors (λ = 1)

5. **Reflection (X-axis)**:
   - Matrix: `[[1, 0], [0, -1]]`
   - Mirrors across x-axis
   - Two eigenvectors: along x-axis (λ = 1) and y-axis (λ = -1)

6. **Projection onto X-axis**:
   - Matrix: `[[1, 0], [0, 0]]`
   - Collapses all y-components to zero
   - One eigenvalue is zero (dimension collapse)

7. **Squeeze Mapping**:
   - Matrix: `[[2, 1], [1, 2]]`
   - Stretches along diagonal directions
   - Clear eigenvector directions along diagonals

### Real-Time Mathematical Display

The application shows:
- **Eigenvalues** (λ₁, λ₂): Calculated using the quadratic formula from the characteristic equation
- **Eigenvectors** (v₁, v₂): Normalized vectors displayed as (x, y) components
- **Complex Eigenvalue Detection**: Alerts when eigenvalues are complex (discriminant < 0)
- **Transformation Description**: Context about each preset transformation's properties

## Educational Value

This tool bridges the gap between abstract linear algebra and geometric intuition by:

1. **Visual Learning**: Seeing transformations happen makes abstract concepts concrete
2. **Interactive Exploration**: Users can experiment with their own matrices and immediately see results
3. **Step-by-Step Analysis**: The ability to pause and step through transformations helps students understand the continuous nature of linear transformations
4. **Eigenvector Highlighting**: Clear visual distinction shows which vectors are "special" (eigenvectors) vs regular vectors
5. **Mathematical Verification**: Displays calculated eigenvalues and eigenvectors so students can verify their manual calculations

## Technical Implementation

### Mathematics
- **Matrix Interpolation**: Linear interpolation (LERP) from identity matrix to target matrix with easing function
- **Eigenvalue Computation**: Solves characteristic equation using discriminant method
- **Eigenvector Computation**: Solves null space of (A - λI) using row reduction concepts
- **Numerical Stability**: Handles near-zero values, degenerate cases, and complex results

### Visualization
- **Canvas-based Rendering**: HTML5 Canvas API for smooth 60fps animations
- **Coordinate Transformation**: Converts mathematical coordinates to screen pixels with proper scaling
- **Grid Deformation**: Renders transformed grid to show how the entire coordinate space warps
- **Vector Arrows**: Custom arrow rendering with proper arrowheads and labels

### User Interface
- Clean, modern dark theme optimized for visibility of mathematical elements
- Responsive controls panel with matrix inputs, preset buttons, and animation controls
- Real-time updates as users type matrix values
- Color-coded elements (cyan/red for eigenvectors, yellow for test vectors)

## Use Cases

1. **Linear Algebra Students**: Understand eigenvectors beyond formulas - see what they actually mean geometrically

2. **Educators**: Demonstrate transformations in class, show why eigenvectors are important in various applications

3. **Self-Learners**: Experiment with different matrices to build intuition about how different transformations behave

4. **Visual Learners**: Those who struggle with purely symbolic mathematics can gain understanding through animation

## Key Insights Users Will Gain

- Eigenvectors are directions that remain unchanged by a transformation (only scaled)
- Not all transformations have real eigenvectors (e.g., rotations)
- Some transformations have all vectors as eigenvectors (uniform scaling)
- Eigenvalues tell you how much stretching/compression happens along eigenvector directions
- Negative eigenvalues indicate reversal of direction
- Zero eigenvalues indicate dimension collapse (projection)

## Future Enhancement Possibilities

This codebase is designed to be extended with:
- 3D transformation visualization
- More preset transformations (rotation by arbitrary angles, non-uniform scaling, etc.)
- Eigenspace visualization for repeated eigenvalues
- Characteristic polynomial graphing
- Matrix decomposition visualization (diagonalization)
- Side-by-side comparison of multiple transformations
- Export animation as video/GIF
- Touch/mobile optimization

## Target Audience

- High school students learning linear algebra
- Undergraduate students in mathematics, physics, engineering, or computer science
- Self-learners exploring mathematical concepts
- Educators looking for teaching tools
- Anyone curious about how transformations work in mathematics and computer graphics
