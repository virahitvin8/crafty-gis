import os
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Ellipse, Polygon

def generate_backgrounds(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # A4 Dimensions in inches at 300 DPI: 8.27 x 11.69
    width_inch = 8.27
    height_inch = 11.69
    
    # Morandi Theme Colors
    navy = "#1B365D"
    blue = "#4A90E2"
    green = "#2E7D32"
    purple = "#6A1B9A"
    
    # ------------------ 1. COVER BACKGROUND ------------------
    fig, ax = plt.subplots(figsize=(width_inch, height_inch), dpi=300)
    fig.patch.set_facecolor(navy)
    ax.set_facecolor(navy)
    
    # Set limits
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 141.4) # Aspect ratio matching A4
    ax.axis('off')
    
    # Draw abstract geometric shapes
    # Main glowing circle in the bottom right
    circle1 = Circle((85, 20), 45, color=blue, alpha=0.15)
    circle2 = Circle((85, 20), 30, color=purple, alpha=0.12)
    circle3 = Circle((15, 120), 40, color=green, alpha=0.1)
    
    ax.add_patch(circle1)
    ax.add_patch(circle2)
    ax.add_patch(circle3)
    
    # Intersecting arcs and decorative lines
    theta = np.linspace(0, 2*np.pi, 200)
    # Smooth curves
    x1 = np.linspace(-10, 110, 200)
    y1 = 30 + 15 * np.sin(x1 / 20) + (x1 - 50)**2 / 300
    ax.plot(x1, y1, color=blue, alpha=0.25, lw=2)
    ax.plot(x1, y1 - 8, color=purple, alpha=0.2, lw=1.5)
    
    # Bottom left geometric shape
    poly = Polygon([[0, 0], [40, 0], [0, 40]], color=purple, alpha=0.08)
    ax.add_patch(poly)
    
    # Add a thin elegant border
    border = plt.Rectangle((2, 2), 96, 137.4, fill=False, edgecolor=blue, alpha=0.3, lw=1)
    ax.add_patch(border)
    
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(os.path.join(output_dir, "cover_bg.png"), facecolor=fig.get_facecolor(), edgecolor='none', pad_inches=0)
    plt.close()
    
    # ------------------ 2. BACKCOVER BACKGROUND ------------------
    fig, ax = plt.subplots(figsize=(width_inch, height_inch), dpi=300)
    fig.patch.set_facecolor(navy)
    ax.set_facecolor(navy)
    
    # Set limits
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 141.4)
    ax.axis('off')
    
    # Add matching abstract elements but simpler (centered design)
    circle_center = Circle((50, 70), 55, color=blue, alpha=0.1)
    circle_center2 = Circle((50, 70), 40, color=purple, alpha=0.08)
    ax.add_patch(circle_center)
    ax.add_patch(circle_center2)
    
    x2 = np.linspace(-10, 110, 200)
    y2 = 70.7 + 10 * np.cos(x2 / 15)
    ax.plot(x2, y2, color=blue, alpha=0.15, lw=1.5)
    
    border_back = plt.Rectangle((2, 2), 96, 137.4, fill=False, edgecolor=blue, alpha=0.2, lw=1)
    ax.add_patch(border_back)
    
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(os.path.join(output_dir, "backcover_bg.png"), facecolor=fig.get_facecolor(), edgecolor='none', pad_inches=0)
    plt.close()
    
    print("Cover and Backcover backgrounds generated successfully!")

if __name__ == "__main__":
    generate_backgrounds("assignment_images")
