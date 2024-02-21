"""
    sphinx_advanced-search
    ~~~~~~~~~~~~~~~~~~~~~~

    Adds options to search classes, functions, methods/attributes in addition to full-text search

    :copyright: Copyright 2023 by Naveen <naveen521kk@gmail.com>
    :license: MIT, see LICENSE for details.
"""
import json
from importlib.metadata import version
from os import makedirs, path
from typing import Dict, Optional, Tuple

import sphinx
from sphinx.util.osutil import copyfile
from sphinx.jinja2glue import SphinxFileSystemLoader

__version__ = "0.1.0"

INDEX_FILE_NAME = "classes-functions-search-index.json"

index_things = {}

def _get_all_synopses(
    env: sphinx.environment.BuildEnvironment,
) -> Dict[Tuple[Optional[str], str], str]:
    synopses: Dict[Tuple[Optional[str], str], str] = {}
    for domain_name, domain in env.domains.items():
        get_object_synopses = getattr(domain, "get_object_synopses", None)
        if get_object_synopses is not None:
            for key, synopsis in get_object_synopses():
                synopses.setdefault(key, synopsis or "")
    return synopses


def write_genindex_decorator(original_write_genindex):
    def write_genindex_patch(self):
        classes = []
        functions = []

        all_objects = self.env.domains["py"].data["objects"]
        seen_objects = set()
        for objname, obj_entry in all_objects.items():
            objname = objname.split(".")[-1]
            docname = obj_entry.docname
            type = obj_entry.objtype
            node_id = obj_entry.node_id

            if objname in seen_objects:
                continue
            seen_objects.add(objname)
            if type == "class":
                classes.append(
                    {
                        "id": "class-" + node_id.lower(),
                        "name": objname,
                        "uri": self.get_relative_uri("search", docname),
                    }
                )
            elif type == "function":
                functions.append(
                    {
                        "id": "function-" + node_id.lower(),
                        "name": objname,
                        "uri": self.get_relative_uri("search", docname),
                    }
                )

    
        index_things.update(
            {
                "classes": classes,
                "functions": functions,
            }
        )

        # print(self.env.domains['index'].entries)
        print(*self.env.domains["py"].get_objects())

        original_write_genindex(self)

    return write_genindex_patch

# dump_search_index
def dump_search_index_wrapper(original_dump_search_index):
    def dump_search_index_patch(self):
        if self.indexer is None:
            return
        
        searchindexfn = path.join(self.outdir, INDEX_FILE_NAME)
        with open(searchindexfn, "w", encoding="utf-8") as f:
            json.dump(index_things, f)

        original_dump_search_index(self)

    return dump_search_index_patch

def copy_static_files(app, _):
    # copy over the built files
    files = ['js/sphinx-advanced-search.min.js', 'css/sphinx-advanced-search.min.css']
    for f in files:
        src = path.join(path.dirname(__file__), f)
        dest = path.join(app.outdir, '_static', f)
        if not path.exists(path.dirname(dest)):
            makedirs(path.dirname(dest))
        copyfile(src, dest)


def builder_inited(app):
    # adding a new loader to the template system puts our searchbox.html
    # template in front of the others, it overrides whatever searchbox.html
    # the current theme is using.
    # it's still up to the theme to actually _use_ a file called searchbox.html
    # somewhere in its layout. but the base theme and pretty much everything
    # else that inherits from it uses this filename.
    app.builder.templates.loaders.insert(0, SphinxFileSystemLoader(path.dirname(__file__)))


def setup(app):
    # sphinx.domains.python.PythonDomain.indices.append(TestIndex)
    sphinx.builders.html.StandaloneHTMLBuilder.write_genindex = (
        write_genindex_decorator(
            sphinx.builders.html.StandaloneHTMLBuilder.write_genindex
        )
    )
    sphinx.builders.html.StandaloneHTMLBuilder.dump_search_index = (
        dump_search_index_wrapper(
            sphinx.builders.html.StandaloneHTMLBuilder.dump_search_index
        )
    )

    # add js and css files
    # app.add_js_file("js/sphinx-advanced-search.min.js", )
    app.add_css_file("css/sphinx-advanced-search.min.css")

    app.connect('builder-inited', builder_inited)
    app.connect('build-finished', copy_static_files)

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
