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

    // Calculate eigenvalues using characteristic equation
    eigenvalues() {
        const trace = this.trace();
        const det = this.determinant();

        // Characteristic equation: λ² - trace*λ + det = 0
        const discriminant = trace * trace - 4 * det;

        if (discriminant < 0) {
            // Complex eigenvalues
            const real = trace / 2;
            const imag = Math.sqrt(-discriminant) / 2;
            return {
                lambda1: { real, imag },
                lambda2: { real, imag: -imag },
                isComplex: true
            };
        } else {
            // Real eigenvalues
            const sqrtDisc = Math.sqrt(discriminant);
            return {
                lambda1: { real: (trace + sqrtDisc) / 2, imag: 0 },
                lambda2: { real: (trace - sqrtDisc) / 2, imag: 0 },
                isComplex: false
            };
        }
    }

    // Calculate eigenvector for a given eigenvalue
    eigenvector(lambda) {
        // Solve (A - λI)v = 0
        const a = this.a - lambda;
        const b = this.b;
        const c = this.c;
        const d = this.d - lambda;

        let vx, vy;

        // Try first row
        if (Math.abs(b) > 1e-10) {
            vx = -b;
            vy = a;
        } else if (Math.abs(c) > 1e-10) {
            vx = -d;
            vy = c;
        } else {
            // Degenerate case - pick arbitrary vector
            vx = 1;
            vy = 0;
        }

        // Normalize
        const mag = Math.sqrt(vx * vx + vy * vy);
        return { x: vx / mag, y: vy / mag };
    }

    getEigenvectors() {
        const eigenvalues = this.eigenvalues();

        if (eigenvalues.isComplex) {
            return null; // No real eigenvectors
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

// Main Application
class EigenvectorApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.scale = 60; // pixels per unit
        this.origin = { x: this.width / 2, y: this.height / 2 };

        // Animation state
        this.currentMatrix = Matrix2D.identity();
        this.targetMatrix = new Matrix2D(2, 1, 1, 2);
        this.animationProgress = 0;
        this.isAnimating = false;
        this.animationSpeed = 1;
        this.animationId = null;

        // Test vectors to show transformation
        this.testVectors = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: -1 }
        ];

        this.setupInputListeners();
        this.updateMatrixFromInputs();
        this.draw();
    }

    setupInputListeners() {
        const inputs = ['a11', 'a12', 'a21', 'a22'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateMatrixFromInputs();
            });
        });
    }

    updateMatrixFromInputs() {
        const a = parseFloat(document.getElementById('a11').value) || 0;
        const b = parseFloat(document.getElementById('a12').value) || 0;
        const c = parseFloat(document.getElementById('a21').value) || 0;
        const d = parseFloat(document.getElementById('a22').value) || 0;

        this.targetMatrix = new Matrix2D(a, b, c, d);
        this.updateInfo();

        if (!this.isAnimating) {
            this.draw();
        }
    }

    updateInfo() {
        const eigenvalues = this.targetMatrix.eigenvalues();
        const eigenInfo = document.getElementById('eigenInfo');

        let html = '<div><strong>Eigenvalues:</strong></div>';

        if (eigenvalues.isComplex) {
            html += `<div>λ₁ = ${eigenvalues.lambda1.real.toFixed(3)} + ${eigenvalues.lambda1.imag.toFixed(3)}i</div>`;
            html += `<div>λ₂ = ${eigenvalues.lambda2.real.toFixed(3)} - ${eigenvalues.lambda2.imag.toFixed(3)}i</div>`;
            html += '<div style="color: #ff6b6b; margin-top: 8px;">Complex eigenvalues - no real eigenvectors</div>';
        } else {
            html += `<div>λ₁ = ${eigenvalues.lambda1.real.toFixed(3)}</div>`;
            html += `<div>λ₂ = ${eigenvalues.lambda2.real.toFixed(3)}</div>`;

            const eigenvectors = this.targetMatrix.getEigenvectors();
            if (eigenvectors) {
                html += '<div style="margin-top: 8px;"><strong>Eigenvectors:</strong></div>';
                html += `<div>v₁ = (${eigenvectors.v1.x.toFixed(3)}, ${eigenvectors.v1.y.toFixed(3)})</div>`;
                html += `<div>v₂ = (${eigenvectors.v2.x.toFixed(3)}, ${eigenvectors.v2.y.toFixed(3)})</div>`;
            }
        }

        eigenInfo.innerHTML = html;
    }

    loadPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) return;

        this.targetMatrix = preset.matrix;

        // Update input fields
        document.getElementById('a11').value = preset.matrix.a;
        document.getElementById('a12').value = preset.matrix.b;
        document.getElementById('a21').value = preset.matrix.c;
        document.getElementById('a22').value = preset.matrix.d;

        // Update info
        document.getElementById('transformInfo').innerHTML =
            `<strong>${preset.name}</strong><p style="margin-top: 8px; font-size: 11px;">${preset.description}</p>`;

        this.updateInfo();
        this.reset();
    }

    playAnimation() {
        this.reset();
        this.isAnimating = true;
        this.animate();
    }

    animate() {
        if (!this.isAnimating) return;

        this.animationProgress += 0.01 * this.animationSpeed;

        if (this.animationProgress >= 1) {
            this.animationProgress = 1;
            this.isAnimating = false;
        }

        // Ease in-out
        const t = this.easeInOutCubic(this.animationProgress);
        this.currentMatrix = Matrix2D.lerp(Matrix2D.identity(), this.targetMatrix, t);

        this.draw();

        if (this.isAnimating) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    stepForward() {
        this.isAnimating = false;
        this.animationProgress = Math.min(1, this.animationProgress + 0.1);
        const t = this.easeInOutCubic(this.animationProgress);
        this.currentMatrix = Matrix2D.lerp(Matrix2D.identity(), this.targetMatrix, t);
        this.draw();
    }

    reset() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animationProgress = 0;
        this.currentMatrix = Matrix2D.identity();
        this.draw();
    }

    setSpeed(speed) {
        this.animationSpeed = parseFloat(speed);
        document.getElementById('speedValue').textContent = speed;
    }

    // Drawing functions
    toScreenCoords(x, y) {
        return {
            x: this.origin.x + x * this.scale,
            y: this.origin.y - y * this.scale
        };
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.drawGrid();
        this.drawAxes();
        this.drawEigenvectors();
        this.drawTestVectors();
        this.drawProgressIndicator();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;

        const gridSize = 15;

        // Draw grid lines
        for (let i = -gridSize; i <= gridSize; i++) {
            for (let j = -gridSize; j <= gridSize; j++) {
                const p1 = this.currentMatrix.transform(i, j);
                const p2 = this.currentMatrix.transform(i + 1, j);
                const p3 = this.currentMatrix.transform(i, j + 1);

                const s1 = this.toScreenCoords(p1.x, p1.y);
                const s2 = this.toScreenCoords(p2.x, p2.y);
                const s3 = this.toScreenCoords(p3.x, p3.y);

                this.ctx.beginPath();
                this.ctx.moveTo(s1.x, s1.y);
                this.ctx.lineTo(s2.x, s2.y);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(s1.x, s1.y);
                this.ctx.lineTo(s3.x, s3.y);
                this.ctx.stroke();
            }
        }
    }

    drawAxes() {
        const maxDist = 10;

        // X-axis (transformed)
        const xAxis = this.currentMatrix.transform(maxDist, 0);
        const xAxisNeg = this.currentMatrix.transform(-maxDist, 0);
        const xStart = this.toScreenCoords(xAxisNeg.x, xAxisNeg.y);
        const xEnd = this.toScreenCoords(xAxis.x, xAxis.y);

        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(xStart.x, xStart.y);
        this.ctx.lineTo(xEnd.x, xEnd.y);
        this.ctx.stroke();

        // Y-axis (transformed)
        const yAxis = this.currentMatrix.transform(0, maxDist);
        const yAxisNeg = this.currentMatrix.transform(0, -maxDist);
        const yStart = this.toScreenCoords(yAxisNeg.x, yAxisNeg.y);
        const yEnd = this.toScreenCoords(yAxis.x, yAxis.y);

        this.ctx.beginPath();
        this.ctx.moveTo(yStart.x, yStart.y);
        this.ctx.lineTo(yEnd.x, yEnd.y);
        this.ctx.stroke();
    }

    drawVector(x, y, color, lineWidth = 3, label = '') {
        const transformed = this.currentMatrix.transform(x, y);
        const start = this.toScreenCoords(0, 0);
        const end = this.toScreenCoords(transformed.x, transformed.y);

        // Draw line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = 12;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Draw label
        if (label) {
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 12px monospace';
            this.ctx.fillText(label, end.x + 10, end.y - 10);
        }
    }

    drawEigenvectors() {
        const eigenvectors = this.targetMatrix.getEigenvectors();
        if (!eigenvectors) return;

        const scale = 3;

        // Draw eigenvector 1
        this.drawVector(
            eigenvectors.v1.x * scale,
            eigenvectors.v1.y * scale,
            '#00d9ff',
            4,
            `λ₁=${eigenvectors.lambda1.toFixed(2)}`
        );

        // Draw opposite direction
        this.drawVector(
            -eigenvectors.v1.x * scale,
            -eigenvectors.v1.y * scale,
            '#00d9ff',
            4
        );

        // Draw eigenvector 2
        this.drawVector(
            eigenvectors.v2.x * scale,
            eigenvectors.v2.y * scale,
            '#ff6b6b',
            4,
            `λ₂=${eigenvectors.lambda2.toFixed(2)}`
        );

        // Draw opposite direction
        this.drawVector(
            -eigenvectors.v2.x * scale,
            -eigenvectors.v2.y * scale,
            '#ff6b6b',
            4
        );
    }

    drawTestVectors() {
        this.testVectors.forEach(vec => {
            this.drawVector(vec.x, vec.y, '#ffeb3b', 2);
        });
    }

    drawProgressIndicator() {
        const barWidth = 200;
        const barHeight = 6;
        const x = this.width - barWidth - 20;
        const y = 20;

        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // Progress
        this.ctx.fillStyle = '#00d9ff';
        this.ctx.fillRect(x, y, barWidth * this.animationProgress, barHeight);

        // Border
        this.ctx.strokeStyle = '#00d9ff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);

        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(
            `Progress: ${(this.animationProgress * 100).toFixed(0)}%`,
            x,
            y - 5
        );
    }
}

// Initialize app
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new EigenvectorApp();
});
