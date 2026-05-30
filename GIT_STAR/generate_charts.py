import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set nice colors matching the doc palette
NAVY = "#0D233A"
BLUE = "#1D4E89"
GREEN = "#1B603D"
RED = "#9B2C2C"
LIGHT = "#D1D5DB"

out_dir = r"c:\Users\akshi\Desktop\GIT_STAR\docx_build\images"

def get_grid():
    # 10x10 Grid with hotspot at (3,3)
    np.random.seed(42)
    x, y = np.meshgrid(np.arange(10), np.arange(10))
    # Gaussian blob at (3,3)
    dist_sq = (x - 3)**2 + (y - 3)**2
    blob = 80 * np.exp(-dist_sq / 10)
    # Add some random noise
    noise = np.random.normal(5, 2, (10, 10))
    grid = blob + noise
    grid = np.clip(grid, 0, 100)
    # Specific points mentioned in text
    grid[3,3] = 81.65
    grid[0,0] = 28.40
    return grid

def plot_heatmap(grid):
    plt.figure(figsize=(8, 6))
    ax = sns.heatmap(grid, annot=True, fmt=".1f", cmap="YlOrRd", cbar_kws={'label': 'Disease Prevalence (%)'}, square=True)
    plt.title("Simulated Disease Prevalence (10x10 Grid)", fontsize=14, pad=15, color=NAVY, fontweight="bold")
    plt.xlabel("X Coordinate", fontsize=12, color=NAVY)
    plt.ylabel("Y Coordinate", fontsize=12, color=NAVY)
    # Highlight hotspot and corner
    import matplotlib.patches as patches
    ax.add_patch(patches.Rectangle((3, 3), 1, 1, fill=False, edgecolor='blue', lw=3))
    ax.add_patch(patches.Rectangle((0, 0), 1, 1, fill=False, edgecolor='green', lw=3))
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "grid_heatmap.png"), dpi=300)
    plt.close()

def plot_moran():
    plt.figure(figsize=(7, 6))
    np.random.seed(123)
    x = np.random.normal(0, 1, 100)
    y = 0.36 * x + np.random.normal(0, 0.8, 100)
    plt.scatter(x, y, alpha=0.6, color=BLUE, edgecolors='w', s=50)
    plt.axhline(0, color='gray', linestyle='--')
    plt.axvline(0, color='gray', linestyle='--')
    
    # Fit line
    m, b = np.polyfit(x, y, 1)
    plt.plot(x, m*x + b, color=RED, lw=2, label=f"Moran's I (slope) ≈ {m:.2f}")
    
    plt.text(1.5, 1.5, "High-High\n(Clustered)", fontsize=12, color=RED, weight="bold", ha="center")
    plt.text(-1.5, -1.5, "Low-Low\n(Clustered)", fontsize=12, color=BLUE, weight="bold", ha="center")
    plt.text(-1.5, 1.5, "Low-High\n(Outlier)", fontsize=12, color="gray", ha="center")
    plt.text(1.5, -1.5, "High-Low\n(Outlier)", fontsize=12, color="gray", ha="center")
    
    plt.title("Moran Scatterplot", fontsize=14, pad=15, color=NAVY, fontweight="bold")
    plt.xlabel("Standardized Prevalence (z)", fontsize=12, color=NAVY)
    plt.ylabel("Spatial Lag (wz)", fontsize=12, color=NAVY)
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "moran_scatterplot.png"), dpi=300)
    plt.close()

def plot_lisa():
    # Simulated LISA clusters
    cluster = np.zeros((10, 10))
    # 0: ns, 1: HH, 2: LL, 3: HL, 4: LH
    cluster[2:5, 2:5] = 1 # HH hotspot
    cluster[0:2, 8:10] = 2 # LL coldspot
    cluster[8:10, 0:2] = 2 # LL coldspot
    cluster[4, 2] = 3 # HL
    cluster[2, 4] = 4 # LH
    
    from matplotlib.colors import ListedColormap
    cmap = ListedColormap(['#eeeeee', 'red', 'blue', 'pink', 'lightblue'])
    
    plt.figure(figsize=(8, 6))
    ax = sns.heatmap(cluster, cmap=cmap, vmin=-0.5, vmax=4.5, cbar=False, linewidths=0.5, linecolor='gray', square=True)
    
    # Custom legend
    import matplotlib.patches as mpatches
    hh = mpatches.Patch(color='red', label='High-High Cluster (Hotspot)')
    ll = mpatches.Patch(color='blue', label='Low-Low Cluster (Coldspot)')
    hl = mpatches.Patch(color='pink', label='High-Low Outlier')
    lh = mpatches.Patch(color='lightblue', label='Low-High Outlier')
    ns = mpatches.Patch(color='#eeeeee', label='Not Significant')
    plt.legend(handles=[hh, ll, hl, lh, ns], bbox_to_anchor=(1.05, 1), loc='upper left')
    
    plt.title("LISA Cluster Map (Local Moran's I)", fontsize=14, pad=15, color=NAVY, fontweight="bold")
    plt.xlabel("X Coordinate", fontsize=12, color=NAVY)
    plt.ylabel("Y Coordinate", fontsize=12, color=NAVY)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "lisa_cluster_map.png"), dpi=300, bbox_inches='tight')
    plt.close()

def plot_kde():
    # Simulated point data for KDE
    np.random.seed(99)
    x = np.random.normal(3, 1.5, 60).tolist() + np.random.uniform(0, 10, 20).tolist()
    y = np.random.normal(3, 1.5, 60).tolist() + np.random.uniform(0, 10, 20).tolist()
    
    # Keep within bounds
    x = [min(max(v, 0), 10) for v in x]
    y = [min(max(v, 0), 10) for v in y]
    
    plt.figure(figsize=(8, 6))
    sns.kdeplot(x=x, y=y, cmap="viridis", fill=True, thresh=0, levels=100)
    plt.scatter(x, y, color='white', s=10, alpha=0.5, edgecolors='black')
    plt.title("Kernel Density Estimation (KDE) Surface", fontsize=14, pad=15, color=NAVY, fontweight="bold")
    plt.xlim(0, 10)
    plt.ylim(0, 10)
    plt.xlabel("X Coordinate", fontsize=12, color=NAVY)
    plt.ylabel("Y Coordinate", fontsize=12, color=NAVY)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "kde_surface.png"), dpi=300)
    plt.close()

def plot_ripley():
    r = np.linspace(0, 5, 100)
    # Simulate L(r)
    # L(r) = 0 is CSR.
    # We want a peak at r=2.5 of about 1.28
    expected = np.zeros_like(r)
    observed = 1.3 * np.exp(-((r - 2.5)**2) / 2) - 0.1
    # add confidence envelope
    env_high = 0.2 + 0.05 * r
    env_low = -0.2 - 0.05 * r

    plt.figure(figsize=(8, 5))
    plt.plot(r, expected, 'k--', label="Expected (CSR: L(r) = 0)")
    plt.plot(r, observed, color=RED, lw=3, label="Observed L(r)")
    plt.fill_between(r, env_low, env_high, color='gray', alpha=0.2, label="95% Confidence Envelope")
    
    plt.axvline(2.5, color=BLUE, linestyle=':', label="Peak Clustering (r=2.5)")
    
    plt.title("Besag's L-Function (Multi-Scale Clustering)", fontsize=14, pad=15, color=NAVY, fontweight="bold")
    plt.xlabel("Distance scale r (units)", fontsize=12, color=NAVY)
    plt.ylabel("L(r)", fontsize=12, color=NAVY)
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "ripley_l_function.png"), dpi=300)
    plt.close()

if __name__ == "__main__":
    grid = get_grid()
    plot_heatmap(grid)
    plot_moran()
    plot_lisa()
    plot_kde()
    plot_ripley()
    print("ALL CHARTS GENERATED SUCCESSFULLY")
