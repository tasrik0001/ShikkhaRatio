import json
import matplotlib.pyplot as plt

GEOJSON_FILE = "data/bgd_admin_boundaries.geojson/bgd_admin2.geojson"
MAP_FILE = "data/districts_map.png"

with open(GEOJSON_FILE, encoding="utf-8") as file:
    geo = json.load(file)

fig, ax = plt.subplots(figsize=(8, 12))

for feature in geo["features"]:
    geometry = feature["geometry"]
    name = feature["properties"]["adm2_name"]
    if geometry["type"] == "Polygon":
        polygons = [geometry["coordinates"]]
    else:
        polygons = geometry["coordinates"]
    for polygon in polygons:
        ring = polygon[0]
        xs = []
        ys = []
        for point in ring:
            xs.append(point[0])
            ys.append(point[1])
        ax.plot(xs, ys, color="gray", linewidth=0.5)
        ax.fill(xs, ys, color="lightgray")
    ax.annotate(name, (feature["properties"]["center_lon"], feature["properties"]["center_lat"]),
                fontsize=5, ha="center")

ax.set_aspect("equal")
ax.axis("off")
plt.savefig(MAP_FILE, dpi=150, bbox_inches="tight")
print("saved to", MAP_FILE)
