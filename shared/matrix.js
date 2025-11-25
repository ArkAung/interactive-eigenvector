// Matrix and Vector Math Utilities
class Matrix2D {
    constructor(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    static identity() {
        return new Matrix2D(1, 0, 0, 1);
    }

    static lerp(m1, m2, t) {
        return new Matrix2D(
            m1.a + (m2.a - m1.a) * t,
            m1.b + (m2.b - m1.b) * t,
            m1.c + (m2.c - m1.c) * t,
            m1.d + (m2.d - m1.d) * t
        );
    }

    transform(x, y) {
        return {
            x: this.a * x + this.b * y,
            y: this.c * x + this.d * y
        };
    }

    determinant() {
        return this.a * this.d - this.b * this.c;
    }

    trace() {
        return this.a + this.d;
    }

    eigenvalues() {
        const trace = this.trace();
        const det = this.determinant();
        const discriminant = trace * trace - 4 * det;

        if (discriminant < 0) {
            const real = trace / 2;
            const imag = Math.sqrt(-discriminant) / 2;
            return {
                lambda1: { real, imag },
                lambda2: { real, imag: -imag },
                isComplex: true
            };
        } else {
            const sqrtDisc = Math.sqrt(discriminant);
            return {
                lambda1: { real: (trace + sqrtDisc) / 2, imag: 0 },
                lambda2: { real: (trace - sqrtDisc) / 2, imag: 0 },
                isComplex: false
            };
        }
    }

    eigenvector(lambda) {
        const a = this.a - lambda;
        const b = this.b;
        const c = this.c;
        const d = this.d - lambda;

        let vx, vy;

        if (Math.abs(b) > 1e-10) {
            vx = -b;
            vy = a;
        } else if (Math.abs(c) > 1e-10) {
            vx = -d;
            vy = c;
        } else {
            vx = 1;
            vy = 0;
        }

        const mag = Math.sqrt(vx * vx + vy * vy);
        return { x: vx / mag, y: vy / mag };
    }

    getEigenvectors() {
        const eigenvalues = this.eigenvalues();

        if (eigenvalues.isComplex) {
            return null;
        }

        const v1 = this.eigenvector(eigenvalues.lambda1.real);
        const v2 = this.eigenvector(eigenvalues.lambda2.real);

        return {
            v1,
            v2,
            lambda1: eigenvalues.lambda1.real,
            lambda2: eigenvalues.lambda2.real
        };
    }

    // Compute inverse matrix
    inverse() {
        const det = this.determinant();
        if (Math.abs(det) < 1e-10) {
            return null; // Singular matrix
        }
        return new Matrix2D(
            this.d / det,
            -this.b / det,
            -this.c / det,
            this.a / det
        );
    }

    // Matrix multiplication: this * other
    multiply(other) {
        return new Matrix2D(
            this.a * other.a + this.b * other.c,
            this.a * other.b + this.b * other.d,
            this.c * other.a + this.d * other.c,
            this.c * other.b + this.d * other.d
        );
    }
}

// Transformation Presets
const PRESETS = {
    rotation: {
        name: "Rotation (90°)",
        matrix: new Matrix2D(0, -1, 1, 0),
        description: "Rotates vectors 90° counterclockwise. Has complex eigenvalues (no real eigenvectors)."
    },
    scaling: {
        name: "Uniform Scaling (2x)",
        matrix: new Matrix2D(2, 0, 0, 2),
        description: "Scales all vectors by 2. Every vector is an eigenvector with eigenvalue 2."
    },
    shearX: {
        name: "Shear X",
        matrix: new Matrix2D(1, 1, 0, 1),
        description: "Shears horizontally. Eigenvector along x-axis stays on same line."
    },
    shearY: {
        name: "Shear Y",
        matrix: new Matrix2D(1, 0, 1, 1),
        description: "Shears vertically. Eigenvector along y-axis stays on same line."
    },
    reflection: {
        name: "Reflection (X-axis)",
        matrix: new Matrix2D(1, 0, 0, -1),
        description: "Reflects across x-axis. Eigenvectors along x and y axes."
    },
    projection: {
        name: "Projection onto X-axis",
        matrix: new Matrix2D(1, 0, 0, 0),
        description: "Projects onto x-axis. Collapses y-dimension (eigenvalue = 0)."
    },
    squeeze: {
        name: "Squeeze Mapping",
        matrix: new Matrix2D(2, 1, 1, 2),
        description: "Stretches along diagonal directions. Clear eigenvector directions."
    }
};
