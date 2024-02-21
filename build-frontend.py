import subprocess
import shutil
import json
from os import path

if __name__ == "__main__":
    # call `npm run build` to build the frontend
    subprocess.run(
        ["npm", "run", "build"],
        cwd="frontend",
        check=True,
        shell=True,
    )
    # read ./frontend/dist/.vite/manifest.json
    with open("frontend/dist/.vite/manifest.json") as f:
        manifest = json.load(f)

    shutil.copy(
        path.join("frontend/dist/", manifest["index.html"]["file"]),
        "sphinx_advanced_search/js/sphinx-advanced-search.min.js",
    )
    shutil.copy(
        path.join("frontend/dist/", manifest["index.html"]["css"][0]),
        "sphinx_advanced_search/css/sphinx-advanced-search.min.css",
    )
