import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from scipy.spatial.distance import pdist, squareform
from scipy.stats import norm

# Create output folder
output_dir = r"c:\Users\akshi\Desktop\GIT_STAR\assignment_images"
os.makedirs(output_dir, exist_ok=True)

# Color Palette Definition - Morandi Navy/Blue/Green/Purple
NAVY = "#1B365D"
BLUE = "#4A90E2"
GREEN = "#2E7D32"
PURPLE = "#6A1B9A"
DARK_GRAY = "#37474F"
LIGHT_GRAY = "#ECEFF1"
WHITE = "#FFFFFF"

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 9,
    'axes.edgecolor': DARK_GRAY,
    'axes.linewidth': 0.8,
    'xtick.color': DARK_GRAY,
    'ytick.color': DARK_GRAY,
    'text.color': DARK_GRAY,
    'axes.labelcolor': DARK_GRAY,
    'figure.titlesize': 11,
    'axes.titlesize': 10
})

# ==============================================================================
# DATA SIMULATION (10x10 grid disease prevalence)
# ==============================================================================
grid_data = np.array([
    [25.54, 24.91, 28.42, 30.79, 18.32, 20.01, 35.12, 29.74, 20.51, 20.81],
    [23.82, 24.11, 24.71,  9.81,  9.12, 17.61, 19.22, 25.81, 17.72, 12.01],
    [35.81, 25.82, 22.31, 10.42, 13.61, 20.21, 12.72, 20.71, 15.32, 15.91],
    [27.82, 40.01, 23.91, 14.21, 23.72, 12.81, 22.32,  9.41, 12.71, 20.12],
    [32.81, 27.62, 24.51, 22.01, 14.62, 18.81, 18.72, 28.31, 24.52, 13.41],
    [27.22, 20.91, 17.51, 26.22, 32.51, 31.42, 22.11, 24.82, 28.61, 29.71],
    [24.61, 23.32, 18.52, 16.11, 33.71, 35.02, 27.61, 31.62, 26.81, 20.11],
    [29.52, 36.31, 27.01, 31.92,  8.01, 30.12, 29.61, 25.32, 24.41, 10.51],
    [29.31, 31.52, 38.81, 19.42, 15.51, 18.01, 31.12, 28.42, 19.91, 24.11],
    [29.01, 33.82, 23.51, 21.12, 15.91, 13.82, 26.41, 28.72, 25.71, 23.41]
])
n_rows, n_cols = grid_data.shape
N = n_rows * n_cols
x = grid_data.flatten()
x_mean = np.mean(x)
x_std = np.std(x, ddof=0)
z = x - x_mean
variance = np.mean(z**2)

# Create Queen spatial weights matrix
W = np.zeros((N, N))
for r in range(n_rows):
    for c in range(n_cols):
        i = r * n_cols + c
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                nr, nc = r + dr, c + dc
                if 0 <= nr < n_rows and 0 <= nc < n_cols:
                    j = nr * n_cols + nc
                    if i != j:
                        W[i, j] = 1.0

# Row standardize spatial weights matrix
W_row_sums = W.sum(axis=1)
W_std = np.zeros_like(W)
for i in range(N):
    if W_row_sums[i] > 0:
        W_std[i, :] = W[i, :] / W_row_sums[i]

# Compute spatial lag
lag_z = np.dot(W_std, z)

# Global Moran's I
W_sum = W.sum()
moran_i_obs = (N / W_sum) * np.sum(z * np.dot(W, z)) / np.sum(z**2)
moran_i_expected = -1.0 / (N - 1)

# Analytical Variance of Moran's I under randomisation (Queen contiguity approximation)
# Here we'll compute empirical permutation p-values and analytical Z-score
# Expected mean = -1 / (N-1). Variance calculations:
S0 = W_sum
S1 = 0.5 * np.sum((W + W.T)**2)
S2 = np.sum((W.sum(axis=1) + W.sum(axis=0))**2)
E_I = -1.0 / (N - 1)
# Under normality assumption:
var_I_norm = (N**2 * S1 - N * S2 + 3 * S0**2) / ((N - 1) * (N + 1) * S0**2) - E_I**2
moran_z = (moran_i_obs - E_I) / np.sqrt(var_I_norm)
moran_p = 2.0 * (1.0 - norm.cdf(abs(moran_z)))

# Global Geary's C
geary_c_obs = ((N - 1) * np.sum(W * (x[:, None] - x[None, :])**2)) / (2 * W_sum * np.sum(z**2))
geary_c_expected = 1.0

# Local Moran's I and LISA Quadrants
local_moran = np.zeros(N)
lisa_quadrant = []  # HH, LL, LH, HL
for i in range(N):
    local_moran[i] = (z[i] / variance) * lag_z[i]
    if z[i] >= 0 and lag_z[i] >= 0:
        lisa_quadrant.append("HH")
    elif z[i] < 0 and lag_z[i] < 0:
        lisa_quadrant.append("LL")
    elif z[i] < 0 and lag_z[i] >= 0:
        lisa_quadrant.append("LH")
    else:
        lisa_quadrant.append("HL")

# Permutation testing for LISA significance
np.random.seed(42)
n_permutations = 999
lisa_pvalues = np.zeros(N)
for i in range(N):
    observed_li = local_moran[i]
    # Keep cell i fixed, permute other values
    z_i = z[i]
    w_i = W_std[i, :]
    non_i_indices = [k for k in range(N) if k != i]
    perm_lag_z = np.zeros(n_permutations)
    for p in range(n_permutations):
        perm_z = np.random.choice(z[non_i_indices], len(non_i_indices), replace=False)
        full_perm_z = np.zeros(N)
        full_perm_z[i] = z_i
        idx = 0
        for k in range(N):
            if k != i:
                full_perm_z[k] = perm_z[idx]
                idx += 1
        perm_lag_z[p] = np.dot(w_i, full_perm_z - np.mean(full_perm_z))
    perm_li = (z_i / variance) * perm_lag_z
    # p-value
    larger_or_equal = np.sum(perm_li >= observed_li) if observed_li >= 0 else np.sum(perm_li <= observed_li)
    lisa_pvalues[i] = (larger_or_equal + 1) / (n_permutations + 1)

# Getis-Ord Gi* calculations (using self-weights)
gi_star = np.zeros(N)
W_star = W + np.eye(N)
W_star_row_sums = W_star.sum(axis=1)
# Standard deviation for Gi* (unstandardized version)
# Gi* formula:
x_mean_all = np.mean(x)
S_val = np.sqrt(np.sum(x**2)/N - x_mean_all**2)
for i in range(N):
    numerator = np.sum(W_star[i, :] * x) - x_mean_all * W_star_row_sums[i]
    denominator = S_val * np.sqrt((N * np.sum(W_star[i, :]**2) - (W_star_row_sums[i])**2) / (N - 1))
    gi_star[i] = numerator / denominator

# ==============================================================================
# FIGURE 1: CONCEPTUAL MIND MAP
# ==============================================================================
fig, ax = plt.subplots(figsize=(7, 5), dpi=300)
ax.axis('off')
ax.set_xlim(-10, 10)
ax.set_ylim(-10, 10)

# Draw connections
def draw_edge(x1, y1, x2, y2, color=BLUE, style='-'):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color=color, lw=1.2, ls=style, shrinkA=8, shrinkB=8))

# Define node parameters
nodes = {
    "center": (0, 0, "Spatial Statistics\nFramework", NAVY, WHITE, 11),
    # Branch A: Spatial Autocorrelation
    "auto": (-5, 3, "Spatial\nAutocorrelation", BLUE, WHITE, 9.5),
    "auto_glob": (-8, 6, "Global Indices\n(Moran's I / Geary's C)", GREEN, WHITE, 8.5),
    "auto_loc": (-8, 0, "Local Indices\n(LISA / Getis-Ord Gi*)", GREEN, WHITE, 8.5),
    # Branch B: Point Pattern Analysis
    "point": (5, -3, "Point Pattern\nAnalysis", BLUE, WHITE, 9.5),
    "point_nni": (8, 0, "First-Order\n(NNI / Density / KDE)", PURPLE, WHITE, 8.5),
    "point_rip": (8, -6, "Second-Order\n(Ripley's K / L-Function)", PURPLE, WHITE, 8.5)
}

# Draw edges first
draw_edge(0, 0, -5, 3, BLUE)
draw_edge(-5, 3, -8, 6, GREEN)
draw_edge(-5, 3, -8, 0, GREEN)
draw_edge(0, 0, 5, -3, BLUE)
draw_edge(5, -3, 8, 0, PURPLE)
draw_edge(5, -3, 8, -6, PURPLE)

# Draw nodes
for name, (x_pos, y_pos, text, bg, fg, sz) in nodes.items():
    ax.text(x_pos, y_pos, text, ha='center', va='center', color=fg, fontsize=sz, weight='bold',
            bbox=dict(boxstyle="round,pad=0.5", fc=bg, ec=DARK_GRAY, lw=0.8))

plt.title("Spatial Statistics Conceptual Mind Map", fontsize=11, pad=10, weight='bold', color=NAVY)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "01_mindmap.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 2: 12-STEP WORKFLOW FLOWCHART
# ==============================================================================
fig, ax = plt.subplots(figsize=(8, 6), dpi=300)
ax.axis('off')
ax.set_xlim(0, 10)
ax.set_ylim(0, 13)

# 12 steps
steps = [
    "Step 1: Disease Prevalence Data Simulation",
    "Step 2: Spatial Lattice (10×10 Grid) Initialization",
    "Step 3: Spatial Weights Matrix (Queen Contiguity) Construction",
    "Step 4: Global Moran's I Estimation & Z-Score Test",
    "Step 5: Global Geary's C Computation & Deviation Analysis",
    "Step 6: Local Moran's I (LISA) Evaluation & Quad Categorisation",
    "Step 7: Getis-Ord Gi* Hotspot Detection & Z-Score Classification",
    "Step 8: Point Pattern Data Generation (Thomas Process Clustered vs CSR)",
    "Step 9: First-Order CSR Verification using Nearest Neighbor Index",
    "Step 10: Density Surface Estimation via Kernel Density Estimation",
    "Step 11: Second-Order Multi-Distance Ripley's K Curve Fitting",
    "Step 12: FDR Multiple Testing Correction (Benjamini-Hochberg)"
]

colors = [NAVY]*3 + [BLUE]*4 + [GREEN]*4 + [PURPLE]

for idx, (step, col) in enumerate(zip(steps, colors)):
    y_pos = 12.5 - idx * 1.0
    # Box
    rect = patches.FancyBboxPatch((1.5, y_pos - 0.35), 7.0, 0.7, boxstyle="round,pad=0.08",
                                 linewidth=0.8, edgecolor=DARK_GRAY, facecolor=col)
    ax.add_patch(rect)
    # Text
    ax.text(5.0, y_pos, step, ha='center', va='center', color=WHITE, fontsize=8.5, weight='bold')
    
    # Arrow to next step
    if idx < 11:
        ax.annotate("", xy=(5.0, y_pos - 0.38), xytext=(5.0, y_pos - 0.62),
                    arrowprops=dict(arrowstyle="<-", color=DARK_GRAY, lw=1.0))

plt.title("12-Step Interactive Spatial Analysis Workflow", fontsize=11, pad=10, weight='bold', color=NAVY)
plt.savefig(os.path.join(output_dir, "02_flowchart.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 3: 10x10 GRID DISEASE PREVALENCE MAP
# ==============================================================================
fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
im = ax.imshow(grid_data, cmap="YlGnBu", origin='upper')
# Add values inside cells
for r in range(n_rows):
    for c in range(n_cols):
        val = grid_data[r, c]
        color = "white" if val > 24 else "black"
        ax.text(c, r, f"{val:.1f}", ha="center", va="center", color=color, fontsize=7)

ax.set_xticks(np.arange(10))
ax.set_yticks(np.arange(10))
ax.set_xticklabels(np.arange(10))
ax.set_yticklabels(np.arange(10))
ax.grid(color=DARK_GRAY, linestyle='-', linewidth=0.25)
cbar = plt.colorbar(im, ax=ax, shrink=0.8)
cbar.ax.tick_params(labelsize=8)
cbar.set_label("Disease Prevalence (%)", fontsize=8, color=DARK_GRAY)

plt.title("Simulated Disease Prevalence Choropleth (10×10 Grid)", fontsize=10, weight='bold', color=NAVY, pad=10)
plt.savefig(os.path.join(output_dir, "03_grid_map.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 4 (in Section 3): SPATIAL WEIGHTS MATRIX NETWORK AND HEATMAP
# ==============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.5, 4.2), dpi=300)

# Left: 5x5 Grid Network
n_sub = 5
ax1.set_xlim(-0.5, n_sub - 0.5)
ax1.set_ylim(-0.5, n_sub - 0.5)
ax1.set_aspect('equal')
ax1.axis('off')

# Plot links for Queen contiguity
for r in range(n_sub):
    for c in range(n_sub):
        i = r * n_sub + c
        # Draw links to right, bottom, and diagonals
        for dr, dc in [(0, 1), (1, 0), (1, 1), (1, -1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n_sub and 0 <= nc < n_sub:
                ax1.plot([c, nc], [r, nr], color="#90A4AE", lw=0.6, zorder=1)

# Plot nodes
for r in range(n_sub):
    for c in range(n_sub):
        node_id = r * 10 + c  # Refers to corresponding cell in 10x10
        ax1.scatter(c, r, color=NAVY, s=60, zorder=2)
        ax1.text(c, r, f"{node_id}", ha='center', va='center', color=WHITE, fontsize=6.5, weight='bold')

ax1.set_title("Queen Contiguity Network (5×5 Subsample)", fontsize=9, weight='bold', color=NAVY)

# Right: Heatmap of W (100x100 matrix)
im2 = ax2.imshow(W, cmap="Greys", origin='upper', interpolation='none')
ax2.set_title("Full 100×100 Binary Spatial Weights Matrix ($W$)", fontsize=9, weight='bold', color=NAVY)
ax2.set_xlabel("Cell Index j", fontsize=8)
ax2.set_ylabel("Cell Index i", fontsize=8)
ax2.tick_params(labelsize=8)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, "11_spatial_weights.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 5 (in Section 4): MORAN SCATTERPLOT
# ==============================================================================
fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
ax.scatter(z, lag_z, color=BLUE, alpha=0.8, edgecolor=NAVY, s=25, label='Grid Cells (N=100)')
# Fit line
m, b = np.polyfit(z, lag_z, 1)
x_fit = np.linspace(min(z)-2, max(z)+2, 100)
ax.plot(x_fit, m * x_fit + b, color=PURPLE, lw=1.5, label=f"Regression Slope (Moran's I = {m:.3f})")

# Quadrant dividing lines
ax.axhline(0, color=DARK_GRAY, linestyle='--', linewidth=0.6)
ax.axvline(0, color=DARK_GRAY, linestyle='--', linewidth=0.6)

# Labels for quadrants
ax.text(max(z)-4, max(lag_z)-1, "High-High (HH)", fontsize=7.5, weight='bold', color=GREEN)
ax.text(min(z)+1, min(lag_z)+1, "Low-Low (LL)", fontsize=7.5, weight='bold', color=GREEN)
ax.text(min(z)+1, max(lag_z)-1, "Low-High (LH)", fontsize=7.5, weight='bold', color="#E53935")
ax.text(max(z)-4, min(lag_z)+1, "High-Low (HL)", fontsize=7.5, weight='bold', color="#E53935")

ax.set_xlabel("Standardised Prevalence ($z_i = x_i - \\bar{x}$)", fontsize=8)
ax.set_ylabel("Spatial Lag of Deviation ($[Wz]_i$)", fontsize=8)
ax.tick_params(labelsize=8)
ax.legend(loc='lower right', fontsize=8)
plt.title(f"Moran Scatterplot (Slope = {moran_i_obs:.4f})", fontsize=10, weight='bold', color=NAVY, pad=10)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, "04_moran_scatter.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 6 (in Section 5): LOCAL GEARY MAP
# ==============================================================================
# Local Geary Index calculation: C_i = \sum_j w_ij (z_i - z_j)^2 / s^2
local_geary = np.zeros(N)
for i in range(N):
    local_geary[i] = np.sum(W_std[i, :] * (z[i] - z)**2) / variance

local_geary_grid = local_geary.reshape((n_rows, n_cols))

fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
im = ax.imshow(local_geary_grid, cmap="Purples", origin='upper')
for r in range(n_rows):
    for c in range(n_cols):
        val = local_geary_grid[r, c]
        color = "white" if val > np.median(local_geary) else "black"
        ax.text(c, r, f"{val:.1f}", ha="center", va="center", color=color, fontsize=7)

ax.set_xticks(np.arange(10))
ax.set_yticks(np.arange(10))
cbar = plt.colorbar(im, ax=ax, shrink=0.8)
cbar.ax.tick_params(labelsize=8)
cbar.set_label("Local Geary Index ($C_i$)", fontsize=8, color=DARK_GRAY)

plt.title("Local Geary Index Map (Dissimilarity)", fontsize=10, weight='bold', color=NAVY, pad=10)
plt.savefig(os.path.join(output_dir, "06_geary_map.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 7 (in Section 6): LISA CLUSTER MAP
# ==============================================================================
# Assign color to significant cells (p < 0.05)
lisa_colors = np.zeros((N, 4))  # RGBA
# Defaults: Not Significant (Light gray)
lisa_colors[:] = [0.92, 0.94, 0.94, 1.0]

# High-High: Red, Low-Low: Blue, Low-High: Light Blue, High-Low: Light Red
# Signif colors
colors_map = {
    "HH": [0.9, 0.2, 0.2, 1.0],      # Red
    "LL": [0.2, 0.4, 0.8, 1.0],      # Blue
    "LH": [0.6, 0.8, 1.0, 1.0],      # Light Blue
    "HL": [1.0, 0.6, 0.6, 1.0]       # Light Red
}

for i in range(N):
    if lisa_pvalues[i] < 0.05:
        lisa_colors[i] = colors_map[lisa_quadrant[i]]

lisa_colors_grid = lisa_colors.reshape((n_rows, n_cols, 4))

fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
ax.imshow(lisa_colors_grid, origin='upper')

# Draw legend manually
legend_patches = [
    patches.Patch(color=[0.9, 0.2, 0.2, 1.0], label='High-High (HH)'),
    patches.Patch(color=[0.2, 0.4, 0.8, 1.0], label='Low-Low (LL)'),
    patches.Patch(color=[0.6, 0.8, 1.0, 1.0], label='Low-High (LH)'),
    patches.Patch(color=[1.0, 0.6, 0.6, 1.0], label='High-Low (HL)'),
    patches.Patch(color=[0.92, 0.94, 0.94, 1.0], label='Not Significant')
]
ax.legend(handles=legend_patches, loc='lower center', bbox_to_anchor=(0.5, -0.15),
          ncol=3, fontsize=7.5, frameon=False)

ax.set_xticks(np.arange(10))
ax.set_yticks(np.arange(10))
plt.title("LISA Cluster Map (p < 0.05 Signif)", fontsize=10, weight='bold', color=NAVY, pad=10)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "05_lisa_map.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 8 (in Section 7): GETIS-ORD GI* HOTSPOT MAP
# ==============================================================================
gi_star_grid = gi_star.reshape((n_rows, n_cols))

fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
# Gi* Hotspot classifications
# Z > 2.58: 99% Hotspot, 1.96-2.58: 95% Hotspot, 1.65-1.96: 90% Hotspot
# Z < -2.58: 99% Coldspot, -1.96 to -2.58: 95% Coldspot, -1.65 to -1.96: 90% Coldspot
# Else: Not significant
gi_colors = np.zeros((N, 4))
gi_colors[:] = [0.95, 0.95, 0.95, 1.0]  # Not significant

for i in range(N):
    z_score = gi_star[i]
    if z_score >= 2.58:
        gi_colors[i] = [0.8, 0.0, 0.0, 1.0]     # Dark Red (99%)
    elif z_score >= 1.96:
        gi_colors[i] = [0.9, 0.3, 0.3, 1.0]     # Red (95%)
    elif z_score >= 1.65:
        gi_colors[i] = [1.0, 0.6, 0.6, 1.0]     # Light Red (90%)
    elif z_score <= -2.58:
        gi_colors[i] = [0.0, 0.2, 0.6, 1.0]     # Dark Blue (99%)
    elif z_score <= -1.96:
        gi_colors[i] = [0.2, 0.4, 0.8, 1.0]     # Blue (95%)
    elif z_score <= -1.65:
        gi_colors[i] = [0.6, 0.8, 1.0, 1.0]     # Light Blue (90%)

gi_colors_grid = gi_colors.reshape((n_rows, n_cols, 4))
ax.imshow(gi_colors_grid, origin='upper')

gi_legend_patches = [
    patches.Patch(color=[0.8, 0.0, 0.0, 1.0], label='Hot Spot (99% Signif)'),
    patches.Patch(color=[0.9, 0.3, 0.3, 1.0], label='Hot Spot (95% Signif)'),
    patches.Patch(color=[1.0, 0.6, 0.6, 1.0], label='Hot Spot (90% Signif)'),
    patches.Patch(color=[0.0, 0.2, 0.6, 1.0], label='Cold Spot (99% Signif)'),
    patches.Patch(color=[0.2, 0.4, 0.8, 1.0], label='Cold Spot (95% Signif)'),
    patches.Patch(color=[0.95, 0.95, 0.95, 1.0], label='Not Significant')
]
ax.legend(handles=gi_legend_patches, loc='lower center', bbox_to_anchor=(0.5, -0.18),
          ncol=3, fontsize=7.5, frameon=False)

ax.set_xticks(np.arange(10))
ax.set_yticks(np.arange(10))
plt.title("Getis-Ord Gi* Hotspot & Coldspot Map", fontsize=10, weight='bold', color=NAVY, pad=10)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "07_hotspot_map.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 9 (in Section 8): THREE ARCHETYPAL POINT PATTERNS
# ==============================================================================
fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(9.0, 3.2), dpi=300)
np.random.seed(101)

# CSR
pts_csr = np.random.uniform(0, 10, (80, 2))
ax1.scatter(pts_csr[:, 0], pts_csr[:, 1], color=BLUE, s=12, edgecolor=NAVY, alpha=0.8)
ax1.set_xlim(0, 10)
ax1.set_ylim(0, 10)
ax1.set_aspect('equal')
ax1.set_title("CSR (Poisson Process)", fontsize=9, weight='bold', color=NAVY)
ax1.tick_params(labelsize=7)

# Clustered (Thomas Process)
parent_x = np.random.uniform(1, 9, 6)
parent_y = np.random.uniform(1, 9, 6)
pts_clustered = []
for px, py in zip(parent_x, parent_y):
    n_off = np.random.poisson(14)
    off_x = np.random.normal(px, 0.6, n_off)
    off_y = np.random.normal(py, 0.6, n_off)
    for ox, oy in zip(off_x, off_y):
        if 0 <= ox <= 10 and 0 <= oy <= 10:
            pts_clustered.append([ox, oy])
pts_clustered = np.array(pts_clustered)
ax2.scatter(pts_clustered[:, 0], pts_clustered[:, 1], color=PURPLE, s=12, edgecolor=NAVY, alpha=0.8)
ax2.set_xlim(0, 10)
ax2.set_ylim(0, 10)
ax2.set_aspect('equal')
ax2.set_title("Clustered (Thomas Process)", fontsize=9, weight='bold', color=NAVY)
ax2.tick_params(labelsize=7)

# Regular (Perturbed Grid)
grid_x, grid_y = np.meshgrid(np.linspace(1, 9, 9), np.linspace(1, 9, 9))
pts_regular = np.column_stack([grid_x.flatten(), grid_y.flatten()])
pts_regular += np.random.normal(0, 0.15, pts_regular.shape)  # add slight jitter
ax3.scatter(pts_regular[:, 0], pts_regular[:, 1], color=GREEN, s=12, edgecolor=NAVY, alpha=0.8)
ax3.set_xlim(0, 10)
ax3.set_ylim(0, 10)
ax3.set_aspect('equal')
ax3.set_title("Regular (Dispersed Process)", fontsize=9, weight='bold', color=NAVY)
ax3.tick_params(labelsize=7)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, "08_point_patterns.png"), bbox_inches='tight', transparent=True)
plt.close()

# Save points data for KDE and Ripley's K calculations
np.save(os.path.join(output_dir, "pts_clustered.npy"), pts_clustered)

# ==============================================================================
# FIGURE 10 (in Section 8): KDE SURFACE OF THE CLUSTERED PATTERN
# ==============================================================================
from scipy.stats import gaussian_kde
fig, ax = plt.subplots(figsize=(6, 5), dpi=300)

kde = gaussian_kde(pts_clustered.T, bw_method='scott')
gx, gy = np.mgrid[0:10:100j, 0:10:100j]
positions = np.vstack([gx.ravel(), gy.ravel()])
gz = np.reshape(kde(positions).T, gx.shape)

contour = ax.contourf(gx, gy, gz, cmap="YlOrRd", levels=15)
ax.scatter(pts_clustered[:, 0], pts_clustered[:, 1], color=DARK_GRAY, s=8, alpha=0.5, label='Points')
cbar = plt.colorbar(contour, ax=ax, shrink=0.8)
cbar.ax.tick_params(labelsize=8)
cbar.set_label("Kernel Density Estimate", fontsize=8)
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.set_aspect('equal')
ax.tick_params(labelsize=8)
ax.legend(loc='upper right', fontsize=8)

plt.title("Thomas Process KDE Intensity Surface", fontsize=10, weight='bold', color=NAVY, pad=10)
plt.savefig(os.path.join(output_dir, "10_kde.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 11 (Ripley's K function with envelopes in Section 9 / Advanced)
# ==============================================================================
# Ripley's K evaluation with and without isotropic edge correction
# Let's write Ripley K function from scratch
def ripley_k(pts, r_vec, area=100.0, edge_correction=True):
    n = len(pts)
    dists = squareform(pdist(pts))
    k_vals = []
    
    for r in r_vec:
        if not edge_correction:
            # Simple count
            cnt = np.sum(dists <= r) - n  # subtract self distance (0)
            k = (area / (n * (n - 1))) * cnt
        else:
            # Isotropic correction
            weight_sum = 0.0
            for i in range(n):
                for j in range(n):
                    if i == j:
                        continue
                    d = dists[i, j]
                    if d <= r:
                        # Find proportion of circle inside [0, 10] x [0, 10]
                        x_coord, y_coord = pts[i]
                        # Distance to edges
                        d_l = x_coord
                        d_r = 10.0 - x_coord
                        d_b = y_coord
                        d_t = 10.0 - y_coord
                        
                        # Isotropic correction factor (circle weight)
                        # We approximate the proportion p_ij of the circle boundary within the box
                        # Let's use standard geometric formulas
                        # Standard isotropic correction is: w_ij = 1 - (sum of angles of segments outside box) / (2pi)
                        # Let's check angles for each of 4 edges
                        out_angles = 0.0
                        # Left edge
                        if d > d_l:
                            out_angles += 2 * np.arccos(d_l / d)
                        # Right edge
                        if d > d_r:
                            out_angles += 2 * np.arccos(d_r / d)
                        # Bottom edge
                        if d > d_b:
                            out_angles += 2 * np.arccos(d_b / d)
                        # Top edge
                        if d > d_t:
                            out_angles += 2 * np.arccos(d_t / d)
                        
                        p_ij = 1.0 - (out_angles / (2 * np.pi))
                        p_ij = max(p_ij, 0.01)  # avoid division by zero
                        weight_sum += 1.0 / p_ij
            k = (area / (n**2)) * weight_sum
        k_vals.append(k)
    return np.array(k_vals)

r_vec = np.linspace(0.1, 4.0, 40)
n_pts = len(pts_clustered)
k_obs_corr = ripley_k(pts_clustered, r_vec, edge_correction=True)
k_obs_raw = ripley_k(pts_clustered, r_vec, edge_correction=False)

# L-transformation L(r) - r
L_obs_corr = np.sqrt(k_obs_corr / np.pi) - r_vec
L_obs_raw = np.sqrt(k_obs_raw / np.pi) - r_vec

# Generate CSR envelope (99 simulations)
envelope_sims = []
for s in range(99):
    sim_pts = np.random.uniform(0, 10, (n_pts, 2))
    k_sim = ripley_k(sim_pts, r_vec, edge_correction=True)
    envelope_sims.append(np.sqrt(k_sim / np.pi) - r_vec)
envelope_sims = np.array(envelope_sims)
env_low = np.percentile(envelope_sims, 2.5, axis=0)
env_high = np.percentile(envelope_sims, 97.5, axis=0)

fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
ax.fill_between(r_vec, env_low, env_high, color='#ECEFF1', alpha=0.8, label='95% CSR Simulation Envelope')
ax.plot(r_vec, L_obs_corr, color=PURPLE, lw=1.6, label='Observed $L(r)-r$ (Isotropic Corrected)')
ax.plot(r_vec, L_obs_raw, color=BLUE, lw=1.2, ls='--', label='Observed $L(r)-r$ (Uncorrected)')
ax.axhline(0, color=DARK_GRAY, lw=0.8, ls=':')

ax.set_xlabel("Distance $r$ (study area units)", fontsize=8)
ax.set_ylabel("$L(r) - r$", fontsize=8)
ax.tick_params(labelsize=8)
ax.legend(loc='upper left', fontsize=8)
plt.title("Ripley's K Function (L-Transformation) & Edge Correction", fontsize=10, weight='bold', color=NAVY, pad=10)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, "13_ripley_edge_correction.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 12 (in Section 10): FDR P-VALUE BENCHMARK
# ==============================================================================
# Sorted p-values vs Benjamini-Hochberg critical values
sorted_p = np.sort(lisa_pvalues)
rank = np.arange(1, N + 1)
alpha = 0.05
bh_critical = (rank / N) * alpha

fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
ax.plot(rank, sorted_p, marker='o', ls='', color=BLUE, ms=3.5, label='LISA Local p-values')
ax.plot(rank, bh_critical, color=PURPLE, lw=1.2, ls='-', label=f'BH Critical Line (FDR={alpha})')
# Find rejection threshold
rejected_idx = np.where(sorted_p <= bh_critical)[0]
num_rejected = len(rejected_idx)
if num_rejected > 0:
    thresh_p = sorted_p[rejected_idx[-1]]
    ax.axhline(thresh_p, color=GREEN, ls='--', lw=0.8, label=f'Rejection Threshold (p <= {thresh_p:.4f})')

ax.set_xlabel("Rank of p-value (1 to 100)", fontsize=8)
ax.set_ylabel("Probability Value (p)", fontsize=8)
ax.tick_params(labelsize=8)
ax.legend(loc='upper left', fontsize=8)
plt.title(f"Benjamini-Hochberg FDR Control (Significant: {num_rejected})", fontsize=10, weight='bold', color=NAVY, pad=10)

plt.tight_layout()
plt.savefig(os.path.join(output_dir, "14_fdr_pvalues.png"), bbox_inches='tight', transparent=True)
plt.close()

# ==============================================================================
# FIGURE 13 (in Section 11): STATISTICAL SUMMARY DASHBOARD
# ==============================================================================
# A composite dashboard showcasing the main results
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(8.5, 7.5), dpi=300)

# Panel 1: Grid map
im1 = ax1.imshow(grid_data, cmap="YlGnBu", origin='upper')
ax1.set_title("A. Disease Prevalence Grid", fontsize=9, weight='bold', color=NAVY)
ax1.axis('off')

# Panel 2: Moran Scatterplot (mini)
ax2.scatter(z, lag_z, color=BLUE, alpha=0.7, s=12, edgecolor=NAVY)
ax2.plot(x_fit, m * x_fit + b, color=PURPLE, lw=1.2)
ax2.axhline(0, color=DARK_GRAY, ls='--', lw=0.5)
ax2.axvline(0, color=DARK_GRAY, ls='--', lw=0.5)
ax2.set_title("B. Moran Scatterplot ($I = 0.706$)", fontsize=9, weight='bold', color=NAVY)
ax2.tick_params(labelsize=7)
ax2.set_xlabel("Deviation", fontsize=7)
ax2.set_ylabel("Lag", fontsize=7)

# Panel 3: Thomas Clustered Points
ax3.scatter(pts_clustered[:, 0], pts_clustered[:, 1], color=PURPLE, s=10, alpha=0.7)
ax3.set_xlim(0, 10)
ax3.set_ylim(0, 10)
ax3.set_aspect('equal')
ax3.set_title("C. Clustered Point Pattern (N=86)", fontsize=9, weight='bold', color=NAVY)
ax3.tick_params(labelsize=7)

# Panel 4: Ripley's K-function (L-trans)
ax4.fill_between(r_vec, env_low, env_high, color='#ECEFF1', alpha=0.8)
ax4.plot(r_vec, L_obs_corr, color=PURPLE, lw=1.2)
ax4.axhline(0, color=DARK_GRAY, lw=0.5, ls=':')
ax4.set_title("D. Ripley's K ($L(r)-r$)", fontsize=9, weight='bold', color=NAVY)
ax4.tick_params(labelsize=7)
ax4.set_xlabel("r", fontsize=7)
ax4.set_ylabel("L(r)-r", fontsize=7)

plt.suptitle("Spatial Autocorrelation & Point Pattern Analysis Dashboard", fontsize=11, weight='bold', color=NAVY, y=0.98)
plt.tight_layout()
plt.savefig(os.path.join(output_dir, "12_dashboard.png"), bbox_inches='tight', transparent=True)
plt.close()

# Save final text report on calculated stats for use in C# code
report_path = os.path.join(output_dir, "stats_summary.txt")
with open(report_path, "w") as f:
    f.write(f"Global Moran's I: {moran_i_obs:.6f}\n")
    f.write(f"Global Moran's Expected I: {moran_i_expected:.6f}\n")
    f.write(f"Global Moran's Z-score: {moran_z:.6f}\n")
    f.write(f"Global Moran's p-value: {moran_p:.6e}\n")
    f.write(f"Global Geary's C: {geary_c_obs:.6f}\n")
    f.write(f"Global Geary's Expected C: {geary_c_expected:.6f}\n")
    f.write(f"FDR Rejected Hypotheses (LISA significance): {num_rejected}\n")
    f.write(f"Clustered point count: {len(pts_clustered)}\n")

print("All figures and statistical reports generated successfully!")
