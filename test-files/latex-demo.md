# LaTeX Math Support Demo

## Overview

This page demonstrates the LaTeX math rendering capabilities using KaTeX. You can write mathematical expressions both inline and as display equations.

- **Status**: Active
- **Version**: 1.0
- **Features**: Inline math, display equations, engineering formulas

## Mathematical Expressions

### Inline Math

You can write inline math expressions like \(E = mc^2\) or \(x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}\) directly in your text.

The power formula \(P = I^2R\) is commonly used in electrical engineering.

### Display Math

For more complex equations, use display math:

\[
\nabla \cdot \mathbf{E} = \frac{\rho}{\epsilon_0}
\]

\[
\nabla \times \mathbf{B} = \mu_0\mathbf{J} + \mu_0\epsilon_0\frac{\partial \mathbf{E}}{\partial t}
\]

### Matrix Operations

\[
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
\]

## Engineering Applications

### Stepper Motor Calculations

The step angle of a stepper motor is calculated as:

\[
\theta_{step} = \frac{360°}{N_{steps}} = \frac{2\pi}{N_{steps}} \text{ radians}
\]

### PID Controller

The output of a PID controller is given by:

\[
u(t) = K_p e(t) + K_i \int_0^t e(\tau) d\tau + K_d \frac{de(t)}{dt}
\]

### Power Electronics

For power calculations in electrical systems:

\[
P_{avg} = \frac{1}{T} \int_0^T v(t) \cdot i(t) \, dt
\]

## Features

### Mathematical Notation
- **Inline expressions**: Use `\(` and `\)` for inline math
- **Display equations**: Use `\[` and `\]` for centered equations  
- **Alternative syntax**: Use `$` for inline and `$$` for display

### Advanced Features
- **Matrices**: Full matrix support with various brackets
- **Integrals**: Definite and indefinite integrals
- **Greek letters**: Complete Greek alphabet support
- **Operators**: Nabla, partial derivatives, and more

### Engineering Symbols
- **Electrical**: Voltage (V), current (I), resistance (R)
- **Mechanical**: Force (F), torque (τ), angular velocity (ω)
- **Control**: Transfer functions, Laplace transforms

## Specifications

### Supported Delimiters

| Type | Syntax | Example |
|------|--------|---------|
| Inline | `\(` ... `\)` | \(x^2 + y^2 = z^2\) |
| Display | `\[` ... `\]` | See equations above |
| Inline Alt | `$` ... `$` | $\sin(\theta)$ |
| Display Alt | `$$` ... `$$` | $$\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$$ |

### Performance

- **Rendering**: Client-side with KaTeX
- **Speed**: Fast rendering, no server required
- **Compatibility**: Works in all modern browsers
- **Fallback**: Error handling for invalid expressions

## Examples

### Circuit Analysis

For an RLC circuit, the impedance is:

\[
Z = R + j\omega L + \frac{1}{j\omega C}
\]

### Signal Processing

The Fourier transform of a signal \(x(t)\) is:

\[
X(\omega) = \int_{-\infty}^{\infty} x(t) e^{-j\omega t} dt
\]

### Control Theory

The transfer function of a second-order system:

\[
G(s) = \frac{\omega_n^2}{s^2 + 2\zeta\omega_n s + \omega_n^2}
\]

## Alternative Syntax

You can also use dollar signs: $\alpha + \beta = \gamma$

And double dollar signs for display:

$$
\lim_{x \to \infty} \frac{1}{x} = 0
$$