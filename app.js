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

        // Set canvas to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.scale = 60;
        this.origin = { x: this.width / 2, y: this.height / 2 };

        // Animation state
        this.currentMatrix = Matrix2D.identity();
        this.targetMatrix = new Matrix2D(2, 1, 1, 2);
        this.animationProgress = 0;
        this.isAnimating = false;
        this.animationSpeed = 1;
        this.animationId = null;

        // Ghost trail history
        this.eigenTrails = [[], []]; // Two trails for two eigenvectors
        this.maxTrailLength = 30;

        // Test vectors
        this.testVectors = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: -1 }
        ];

        // Hover state
        this.mousePos = null;
        this.hoveredVectorIndex = -1;
        this.hoveredEigenvectorIndex = -1; // -1: none, 0: v1, 1: v2
        this.hoverRadius = 15; // pixels radius for hover detection

        this.setupInputListeners();
        this.setupScrubber();
        this.setupPresetChips();
        this.setupMouseTracking();
        this.updateMatrixFromInputs();
        this.draw();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.origin = { x: this.width / 2, y: this.height / 2 };
    }

    setupInputListeners() {
        const inputs = ['a11', 'a12', 'a21', 'a22'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updateMatrixFromInputs();
            });
        });
    }

    setupScrubber() {
        const track = document.getElementById('scrubberTrack');
        const handle = document.getElementById('scrubberHandle');
        let isDragging = false;

        const updateProgress = (clientX) => {
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const progress = x / rect.width;
            this.setProgress(progress);
        };

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        track.addEventListener('mousedown', (e) => {
            updateProgress(e.clientX);
            isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.isAnimating = false;
                updateProgress(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    setupPresetChips() {
        const chips = document.querySelectorAll('.preset-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const preset = chip.dataset.preset;
                this.loadPreset(preset);

                // Update active state
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
    }

    setupMouseTracking() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            // Reset hover states
            this.hoveredVectorIndex = -1;
            this.hoveredEigenvectorIndex = -1;

            // Check if hovering over any eigenvector endpoint
            const eigenvectors = this.targetMatrix.getEigenvectors();
            if (eigenvectors) {
                const scale = 3;
                const eigenVecs = [
                    { x: eigenvectors.v1.x * scale, y: eigenvectors.v1.y * scale, idx: 0 },
                    { x: -eigenvectors.v1.x * scale, y: -eigenvectors.v1.y * scale, idx: 0 },
                    { x: eigenvectors.v2.x * scale, y: eigenvectors.v2.y * scale, idx: 1 },
                    { x: -eigenvectors.v2.x * scale, y: -eigenvectors.v2.y * scale, idx: 1 }
                ];

                eigenVecs.forEach(vec => {
                    const transformed = this.currentMatrix.transform(vec.x, vec.y);
                    const end = this.toScreenCoords(transformed.x, transformed.y);

                    const dx = this.mousePos.x - end.x;
                    const dy = this.mousePos.y - end.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= this.hoverRadius * 1.5) { // Slightly larger radius for eigenvectors
                        this.hoveredEigenvectorIndex = vec.idx;
                    }
                });
            }

            // Check if hovering over any test vector endpoint (only if not hovering eigenvector)
            if (this.hoveredEigenvectorIndex === -1) {
                this.testVectors.forEach((vec, idx) => {
                    const transformed = this.currentMatrix.transform(vec.x, vec.y);
                    const end = this.toScreenCoords(transformed.x, transformed.y);

                    const dx = this.mousePos.x - end.x;
                    const dy = this.mousePos.y - end.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= this.hoverRadius) {
                        this.hoveredVectorIndex = idx;
                    }
                });
            }

            if (!this.isAnimating) {
                this.draw();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = null;
            this.hoveredVectorIndex = -1;
            this.hoveredEigenvectorIndex = -1;
            if (!this.isAnimating) {
                this.draw();
            }
        });

        // Change cursor when hovering
        this.canvas.addEventListener('mousemove', () => {
            const isHovering = this.hoveredVectorIndex >= 0 || this.hoveredEigenvectorIndex >= 0;
            this.canvas.style.cursor = isHovering ? 'pointer' : 'default';
        });
    }

    setProgress(progress) {
        this.animationProgress = Math.max(0, Math.min(1, progress));
        const t = this.easeInOutCubic(this.animationProgress);
        this.currentMatrix = Matrix2D.lerp(Matrix2D.identity(), this.targetMatrix, t);
        this.updateProgressUI();
        this.draw();
    }

    updateMatrixFromInputs() {
        const a = parseFloat(document.getElementById('a11').value) || 0;
        const b = parseFloat(document.getElementById('a12').value) || 0;
        const c = parseFloat(document.getElementById('a21').value) || 0;
        const d = parseFloat(document.getElementById('a22').value) || 0;

        this.targetMatrix = new Matrix2D(a, b, c, d);
        this.updateInfo();

        if (!this.isAnimating) {
            const t = this.easeInOutCubic(this.animationProgress);
            this.currentMatrix = Matrix2D.lerp(Matrix2D.identity(), this.targetMatrix, t);
            this.draw();
        }
    }

    updateInfo() {
        const eigenvalues = this.targetMatrix.eigenvalues();
        const eigenCards = document.getElementById('eigenCards');
        const charEquation = document.getElementById('charEquation');

        // Display characteristic equation
        const trace = this.targetMatrix.trace();
        const det = this.targetMatrix.determinant();
        charEquation.innerHTML = `
            <div class="char-equation-label">Characteristic Equation</div>
            <div class="char-equation">
                λ² − ${trace.toFixed(3)}λ + ${det.toFixed(3)} = 0
            </div>
        `;

        if (eigenvalues.isComplex) {
            eigenCards.innerHTML = `
                <div class="complex-warning">
                    Complex eigenvalues detected: No real eigenvectors exist.
                    This transformation involves rotation.
                </div>
                <div class="eigen-card">
                    <div class="eigen-value" style="color: #06B6D4;">
                        λ₁ = ${eigenvalues.lambda1.real.toFixed(3)} + ${eigenvalues.lambda1.imag.toFixed(3)}i
                    </div>
                </div>
                <div class="eigen-card">
                    <div class="eigen-value" style="color: #EC4899;">
                        λ₂ = ${eigenvalues.lambda2.real.toFixed(3)} - ${eigenvalues.lambda2.imag.toFixed(3)}i
                    </div>
                </div>
            `;
        } else {
            const eigenvectors = this.targetMatrix.getEigenvectors();
            eigenCards.innerHTML = `
                <div class="eigen-card">
                    <div class="eigen-card-header">
                        <span class="eigen-label">EIGENVECTOR 1</span>
                        <div class="eigen-color-indicator" style="background: #06B6D4; color: #06B6D4;"></div>
                    </div>
                    <div class="eigen-value" style="color: #06B6D4;">
                        λ₁ = ${eigenvectors.lambda1.toFixed(3)}
                    </div>
                    <div class="eigen-vector">
                        v₁ = [${eigenvectors.v1.x.toFixed(3)}, ${eigenvectors.v1.y.toFixed(3)}]
                    </div>
                </div>
                <div class="eigen-card">
                    <div class="eigen-card-header">
                        <span class="eigen-label">EIGENVECTOR 2</span>
                        <div class="eigen-color-indicator" style="background: #EC4899; color: #EC4899;"></div>
                    </div>
                    <div class="eigen-value" style="color: #EC4899;">
                        λ₂ = ${eigenvectors.lambda2.toFixed(3)}
                    </div>
                    <div class="eigen-vector">
                        v₂ = [${eigenvectors.v2.x.toFixed(3)}, ${eigenvectors.v2.y.toFixed(3)}]
                    </div>
                </div>
            `;
        }
    }

    loadPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) return;

        this.targetMatrix = preset.matrix;

        document.getElementById('a11').value = preset.matrix.a;
        document.getElementById('a12').value = preset.matrix.b;
        document.getElementById('a21').value = preset.matrix.c;
        document.getElementById('a22').value = preset.matrix.d;

        document.getElementById('transformDesc').innerHTML = `
            <div class="desc-title">${preset.name}</div>
            <div>${preset.description}</div>
        `;

        this.updateInfo();
        this.reset();
    }

    togglePlay() {
        const playBtn = document.getElementById('playBtn');

        if (this.isAnimating) {
            this.isAnimating = false;
            playBtn.textContent = '▶';
        } else {
            if (this.animationProgress >= 1) {
                this.reset();
            }
            this.isAnimating = true;
            playBtn.textContent = '⏸';
            this.animate();
        }
    }

    animate() {
        if (!this.isAnimating) return;

        this.animationProgress += 0.008 * this.animationSpeed;

        if (this.animationProgress >= 1) {
            this.animationProgress = 1;
            this.isAnimating = false;
            document.getElementById('playBtn').textContent = '▶';
        }

        const t = this.easeInOutCubic(this.animationProgress);
        this.currentMatrix = Matrix2D.lerp(Matrix2D.identity(), this.targetMatrix, t);

        // Record trail positions
        this.recordTrails();

        this.updateProgressUI();
        this.draw();

        if (this.isAnimating) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }

    recordTrails() {
        const eigenvectors = this.targetMatrix.getEigenvectors();
        if (!eigenvectors) {
            this.eigenTrails = [[], []];
            return;
        }

        const scale = 3;

        // Record eigenvector 1 position
        const v1 = this.currentMatrix.transform(
            eigenvectors.v1.x * scale,
            eigenvectors.v1.y * scale
        );
        this.eigenTrails[0].push({ x: v1.x, y: v1.y });
        if (this.eigenTrails[0].length > this.maxTrailLength) {
            this.eigenTrails[0].shift();
        }

        // Record eigenvector 2 position
        const v2 = this.currentMatrix.transform(
            eigenvectors.v2.x * scale,
            eigenvectors.v2.y * scale
        );
        this.eigenTrails[1].push({ x: v2.x, y: v2.y });
        if (this.eigenTrails[1].length > this.maxTrailLength) {
            this.eigenTrails[1].shift();
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    stepForward() {
        this.isAnimating = false;
        document.getElementById('playBtn').textContent = '▶';
        this.setProgress(Math.min(1, this.animationProgress + 0.1));
    }

    reset() {
        this.isAnimating = false;
        document.getElementById('playBtn').textContent = '▶';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animationProgress = 0;
        this.currentMatrix = Matrix2D.identity();
        this.eigenTrails = [[], []];
        this.updateProgressUI();
        this.draw();
    }

    setSpeed(speed) {
        this.animationSpeed = speed;

        // Update active state on speed buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateProgressUI() {
        const progress = document.getElementById('scrubberProgress');
        const handle = document.getElementById('scrubberHandle');
        const percent = document.getElementById('progressPercent');

        const percentage = this.animationProgress * 100;
        progress.style.width = percentage + '%';
        handle.style.left = percentage + '%';
        percent.textContent = Math.round(percentage) + '%';
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

        const isDimmed = this.hoveredEigenvectorIndex >= 0;

        this.drawGrid();
        this.drawAxes();
        this.drawGhostTrails(isDimmed);
        this.drawTestVectors(isDimmed);
        this.drawEigenvectors(isDimmed);

        // Draw eigenline and info card on top if hovering
        if (this.hoveredEigenvectorIndex >= 0) {
            this.drawEigenline();
            this.drawEigenInfoCard();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#1F2937';
        this.ctx.lineWidth = 1;

        const gridSize = Math.ceil(Math.max(this.width, this.height) / this.scale / 2) + 5;

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
        const maxDist = Math.max(this.width, this.height) / this.scale;

        // X-axis
        const xAxis = this.currentMatrix.transform(maxDist, 0);
        const xAxisNeg = this.currentMatrix.transform(-maxDist, 0);
        const xStart = this.toScreenCoords(xAxisNeg.x, xAxisNeg.y);
        const xEnd = this.toScreenCoords(xAxis.x, xAxis.y);

        this.ctx.strokeStyle = '#374151';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(xStart.x, xStart.y);
        this.ctx.lineTo(xEnd.x, xEnd.y);
        this.ctx.stroke();

        // Y-axis
        const yAxis = this.currentMatrix.transform(0, maxDist);
        const yAxisNeg = this.currentMatrix.transform(0, -maxDist);
        const yStart = this.toScreenCoords(yAxisNeg.x, yAxisNeg.y);
        const yEnd = this.toScreenCoords(yAxis.x, yAxis.y);

        this.ctx.beginPath();
        this.ctx.moveTo(yStart.x, yStart.y);
        this.ctx.lineTo(yEnd.x, yEnd.y);
        this.ctx.stroke();
    }

    drawGhostTrails(isDimmed = false) {
        const colors = ['#06B6D4', '#EC4899'];
        const opacity = isDimmed ? 0.2 : 1;

        this.eigenTrails.forEach((trail, idx) => {
            if (trail.length < 2) return;

            // Draw the trail with increasing opacity
            for (let i = 0; i < trail.length - 1; i++) {
                const progress = i / (trail.length - 1);
                const alpha = Math.pow(progress, 0.7) * 0.5; // Exponential fade for better visibility
                const point = trail[i];
                const nextPoint = trail[i + 1];

                const start = this.toScreenCoords(point.x, point.y);
                const end = this.toScreenCoords(nextPoint.x, nextPoint.y);

                // Convert hex to rgba for better transparency control
                const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };

                this.ctx.strokeStyle = hexToRgba(colors[idx], alpha * opacity);
                this.ctx.lineWidth = 4;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                // Add subtle glow to trail
                if (progress > 0.6) {
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = colors[idx];
                }

                this.ctx.beginPath();
                this.ctx.moveTo(start.x, start.y);
                this.ctx.lineTo(end.x, end.y);
                this.ctx.stroke();

                this.ctx.shadowBlur = 0;
            }
        });
    }

    drawVector(x, y, color, lineWidth = 3, label = '', opacity = 1) {
        const transformed = this.currentMatrix.transform(x, y);
        const start = this.toScreenCoords(0, 0);
        const end = this.toScreenCoords(transformed.x, transformed.y);

        // Convert hex to rgba
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const colorWithOpacity = hexToRgba(color, opacity);

        // Draw line with glow
        this.ctx.shadowBlur = 15 * opacity;
        this.ctx.shadowColor = colorWithOpacity;
        this.ctx.strokeStyle = colorWithOpacity;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Draw arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = 15;

        this.ctx.fillStyle = colorWithOpacity;
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
        if (label && opacity > 0.3) {
            this.ctx.fillStyle = colorWithOpacity;
            this.ctx.font = 'bold 13px "JetBrains Mono", monospace';
            this.ctx.fillText(label, end.x + 15, end.y - 10);
        }
    }

    drawEigenvectors(isDimmed = false) {
        const eigenvectors = this.targetMatrix.getEigenvectors();
        if (!eigenvectors) return;

        const scale = 3;

        // Determine opacity based on hover state
        let opacity1 = 1, opacity2 = 1;
        if (isDimmed) {
            opacity1 = this.hoveredEigenvectorIndex === 0 ? 1 : 0.15;
            opacity2 = this.hoveredEigenvectorIndex === 1 ? 1 : 0.15;
        }

        // Draw eigenvector 1 (both directions)
        this.drawVector(
            eigenvectors.v1.x * scale,
            eigenvectors.v1.y * scale,
            '#06B6D4',
            5,
            `λ₁=${eigenvectors.lambda1.toFixed(2)}`,
            opacity1
        );
        this.drawVector(
            -eigenvectors.v1.x * scale,
            -eigenvectors.v1.y * scale,
            '#06B6D4',
            5,
            '',
            opacity1
        );

        // Draw eigenvector 2 (both directions)
        this.drawVector(
            eigenvectors.v2.x * scale,
            eigenvectors.v2.y * scale,
            '#EC4899',
            5,
            `λ₂=${eigenvectors.lambda2.toFixed(2)}`,
            opacity2
        );
        this.drawVector(
            -eigenvectors.v2.x * scale,
            -eigenvectors.v2.y * scale,
            '#EC4899',
            5,
            '',
            opacity2
        );
    }

    drawTestVectors(isDimmed = false) {
        const opacity = isDimmed ? 0.15 : 1;
        this.testVectors.forEach((vec, idx) => {
            // Draw original (untransformed) vector in faded gray
            this.drawOriginalVector(vec.x, vec.y, opacity);

            // Draw transformed vector in bright yellow with glow
            this.drawVector(vec.x, vec.y, '#FCD34D', 4, '', opacity);

            // Draw endpoint dot for transformed vector
            this.drawVectorDot(vec.x, vec.y, opacity);

            // Draw arc if this vector is being hovered
            if (idx === this.hoveredVectorIndex && !isDimmed) {
                this.drawRotationArc(vec.x, vec.y);
            }
        });
    }

    drawOriginalVector(x, y, opacity = 1) {
        // Draw the untransformed vector (identity transformation)
        const start = this.toScreenCoords(0, 0);
        const end = this.toScreenCoords(x, y);

        // Faded gray with opacity
        this.ctx.strokeStyle = `rgba(156, 163, 175, ${0.3 * opacity})`;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]); // Dashed line
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();

        // Reset line dash
        this.ctx.setLineDash([]);

        // Small arrowhead for original vector
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLength = 8;

        this.ctx.fillStyle = `rgba(156, 163, 175, ${0.3 * opacity})`;
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
    }

    drawVectorDot(x, y, opacity = 1) {
        // Draw a bright dot at the transformed vector endpoint
        const transformed = this.currentMatrix.transform(x, y);
        const end = this.toScreenCoords(transformed.x, transformed.y);

        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        this.ctx.fillStyle = hexToRgba('#FCD34D', opacity);
        this.ctx.shadowBlur = 10 * opacity;
        this.ctx.shadowColor = hexToRgba('#FCD34D', opacity);
        this.ctx.beginPath();
        this.ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    drawRotationArc(x, y) {
        const origin = this.toScreenCoords(0, 0);
        const originalEnd = this.toScreenCoords(x, y);
        const transformed = this.currentMatrix.transform(x, y);
        const transformedEnd = this.toScreenCoords(transformed.x, transformed.y);

        // Calculate angles
        const angle1 = Math.atan2(originalEnd.y - origin.y, originalEnd.x - origin.x);
        const angle2 = Math.atan2(transformedEnd.y - origin.y, transformedEnd.x - origin.x);

        // Calculate arc radius (use smaller of the two vector lengths, scaled down)
        const originalLength = Math.sqrt(
            (originalEnd.x - origin.x) ** 2 + (originalEnd.y - origin.y) ** 2
        );
        const transformedLength = Math.sqrt(
            (transformedEnd.x - origin.x) ** 2 + (transformedEnd.y - origin.y) ** 2
        );
        const arcRadius = Math.min(originalLength, transformedLength) * 0.4;

        // Draw arc
        this.ctx.strokeStyle = '#FCD34D';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.arc(origin.x, origin.y, arcRadius, angle1, angle2, angle2 < angle1);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Calculate angle difference in degrees
        let angleDiff = ((angle2 - angle1) * 180 / Math.PI);
        // Normalize to -180 to 180
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        // Draw angle label
        const labelAngle = (angle1 + angle2) / 2;
        const labelRadius = arcRadius + 25;
        const labelX = origin.x + labelRadius * Math.cos(labelAngle);
        const labelY = origin.y + labelRadius * Math.sin(labelAngle);

        // Background for label
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        this.ctx.font = 'bold 14px "JetBrains Mono", monospace';
        const labelText = `${Math.abs(angleDiff).toFixed(1)}°`;
        const metrics = this.ctx.measureText(labelText);
        const padding = 6;

        this.ctx.fillRect(
            labelX - metrics.width / 2 - padding,
            labelY - 10 - padding,
            metrics.width + padding * 2,
            20 + padding * 2
        );

        // Draw label text
        this.ctx.fillStyle = '#FCD34D';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(labelText, labelX, labelY);

        // Reset text alignment
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';

        // Highlight the hovered vector
        this.ctx.strokeStyle = '#FCD34D';
        this.ctx.lineWidth = 6;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#FCD34D';
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(transformedEnd.x, transformedEnd.y);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Highlight the original vector too
        this.ctx.strokeStyle = 'rgba(156, 163, 175, 0.6)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(originalEnd.x, originalEnd.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawEigenline() {
        const eigenvectors = this.targetMatrix.getEigenvectors();
        if (!eigenvectors) return;

        const eigenVec = this.hoveredEigenvectorIndex === 0 ? eigenvectors.v1 : eigenvectors.v2;
        const color = this.hoveredEigenvectorIndex === 0 ? '#06B6D4' : '#EC4899';

        // Draw infinite line through origin in both directions
        const maxDist = Math.max(this.width, this.height) / this.scale * 2;

        const point1 = this.currentMatrix.transform(eigenVec.x * maxDist, eigenVec.y * maxDist);
        const point2 = this.currentMatrix.transform(-eigenVec.x * maxDist, -eigenVec.y * maxDist);

        const screen1 = this.toScreenCoords(point1.x, point1.y);
        const screen2 = this.toScreenCoords(point2.x, point2.y);

        // Draw the full eigenline
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.3;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.moveTo(screen1.x, screen1.y);
        this.ctx.lineTo(screen2.x, screen2.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1;
    }

    drawEigenInfoCard() {
        const eigenvectors = this.targetMatrix.getEigenvectors();
        if (!eigenvectors) return;

        const idx = this.hoveredEigenvectorIndex;
        const eigenVec = idx === 0 ? eigenvectors.v1 : eigenvectors.v2;
        const eigenVal = idx === 0 ? eigenvectors.lambda1 : eigenvectors.lambda2;
        const color = idx === 0 ? '#06B6D4' : '#EC4899';
        const spaceNum = idx + 1;

        // Position card in top-left corner
        const x = 40;
        const y = 40;
        const width = 320;
        const height = 160;

        // Draw card background
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.shadowBlur = 0;

        // Draw content
        const padding = 20;
        let currentY = y + padding + 20;

        // Title
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 18px "Inter", sans-serif';
        this.ctx.fillText(`EIGENSPACE ${spaceNum}`, x + padding, currentY);

        currentY += 30;

        // Direction
        this.ctx.fillStyle = '#E5E7EB';
        this.ctx.font = '14px "Inter", sans-serif';
        this.ctx.fillText('Direction:', x + padding, currentY);
        this.ctx.fillStyle = color;
        this.ctx.font = '14px "JetBrains Mono", monospace';
        this.ctx.fillText(`(${eigenVec.x.toFixed(3)}, ${eigenVec.y.toFixed(3)})`, x + padding + 80, currentY);

        currentY += 28;

        // Eigenvalue
        this.ctx.fillStyle = '#E5E7EB';
        this.ctx.font = '14px "Inter", sans-serif';
        this.ctx.fillText('Eigenvalue:', x + padding, currentY);
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 16px "JetBrains Mono", monospace';
        this.ctx.fillText(`λ${spaceNum} = ${eigenVal.toFixed(3)}`, x + padding + 95, currentY);

        currentY += 28;

        // Scaling description
        const scaleFactor = Math.abs(eigenVal);
        const scaleDesc = eigenVal < 0
            ? `${scaleFactor.toFixed(1)}× (reversed)`
            : `${scaleFactor.toFixed(1)}×`;

        this.ctx.fillStyle = '#E5E7EB';
        this.ctx.font = '14px "Inter", sans-serif';
        this.ctx.fillText('Scaling:', x + padding, currentY);
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 14px "JetBrains Mono", monospace';
        this.ctx.fillText(scaleDesc, x + padding + 70, currentY);

        currentY += 28;

        // Note
        this.ctx.fillStyle = '#9CA3AF';
        this.ctx.font = 'italic 12px "Inter", sans-serif';
        this.ctx.fillText('Both arrows = same eigenspace', x + padding, currentY);
        this.ctx.fillText('Vectors scale along this line', x + padding, currentY + 16);
    }
}

// Initialize app
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new EigenvectorApp();
});
