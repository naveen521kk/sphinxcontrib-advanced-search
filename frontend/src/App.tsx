import React from "react";
import "./styles/app.scss";
import lunr from "lunr";
import useDebounce from "./use-debounce";

import type { SearchIndex, SearchIndexItem } from "./types.d.ts";

const SearchIndexContext = React.createContext<SearchIndex | null>(null);

const checkboxes = [
  {
    name: "Full text search",
    value: "fullTextSearch",
  },
  {
    name: "Classes",
    value: "classes",
  },
  {
    name: "Functions",
    value: "functions",
  },
  // {
  //   name: "Methods/Attributes",
  //   value: "methods",
  // },
];

function CheckBox({
  name,
  value,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="checkbox-container">
      <input
        type="checkbox"
        value={value}
        className="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {name}
    </div>
  );
}

function SearchInput({
  setSearchTerm,
}: {
  setSearchTerm: (searchTerm: string) => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  React.useEffect(() => {
    setSearchTerm(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchTerm]);

  return (
    <>
      <input
        type="text"
        placeholder="Search..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </>
  );
}

function DisplaySearchResults({
  searchTerm,
  checkboxState,
}: {
  searchTerm: string;
  checkboxState: Record<string, boolean>;
}) {
  const searchIndex = React.useContext(SearchIndexContext);
  const classesIndex = React.useRef<lunr.Index | null>(null);
  const functionsIndex = React.useRef<lunr.Index | null>(null);
  const [searchResults, setSearchResults] = React.useState<SearchIndexItem[]>(
    []
  );

  React.useEffect(() => {
    if (!searchIndex) return;

    classesIndex.current = lunr(function () {
      this.ref("id");
      this.field("name", { boost: 10 });
      this.field("uri");

      searchIndex?.classes.forEach((doc) => {
        this.add(doc);
      });
    });

    functionsIndex.current = lunr(function () {
      this.ref("id");
      this.field("name", { boost: 10 });
      this.field("uri");

      searchIndex?.functions.forEach((doc) => {
        this.add(doc);
      });
    });
  }, [searchIndex]);

  React.useEffect(() => {
    if (!searchIndex) return;

    let searchResults: SearchIndexItem[] = [];
    const searchQueryModified = `*${searchTerm.toLowerCase()}*`;

    if (checkboxState["classes"]) {
      const results = classesIndex.current?.search(searchQueryModified);
      if (results) {
        searchResults = [
          ...searchResults,
          ...results.map((result) =>
            searchIndex.classes.find((c) => c.id === result.ref)
          ),
        ] as SearchIndexItem[];
      }
    }

    if (checkboxState["functions"]) {
      const results = functionsIndex.current?.search(searchQueryModified);
      if (results) {
        searchResults = [
          ...searchResults,
          ...results.map((result) =>
            searchIndex.functions.find((c) => c.id === result.ref)
          ),
        ] as SearchIndexItem[];
      }
    }

    console.log(searchResults, searchTerm);
    setSearchResults(searchResults);
  }, [searchTerm, checkboxState, searchIndex]);

  return (
    <>
      <ul id="advanced-search-results">
        {searchResults.map((result) => (
          <li key={result.id}>
            <a href={result.uri}>{result.name}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

function App() {
  const [checkboxState, setCheckboxState] = React.useState<
    Record<string, boolean>
  >({
    fullTextSearch: true,
    classes: false,
    functions: false,
    methods: false,
  });

  const [searchIndex, setSearchIndex] = React.useState<SearchIndex | null>(
    null
  );

  const [searchTerm, setSearchTerm] = React.useState<string>("");

  React.useEffect(() => {
    const fetchIndex = async () => {
      const response = await fetch("/classes-functions-search-index.json");
      const index = await response.json();
      setSearchIndex(index);
    };
    fetchIndex();
  }, []);

  const handleCheckboxChange = (value: boolean, name: string) => {
    const newState = {
      ...checkboxState,
      [name]: value,
    };

    // if full text search is enabled, disable all other checkboxes
    if (name === "fullTextSearch" && value) {
      Object.keys(newState).forEach((key) => {
        if (key !== "fullTextSearch") {
          newState[key] = false;
        }
      });
    }

    // similarly, if any other checkbox is enabled, disable full text search
    if (name !== "fullTextSearch" && value) {
      newState["fullTextSearch"] = false;
    }

    setCheckboxState(newState);
  };

  return (
    <>
      <SearchIndexContext.Provider value={searchIndex}>
        <SearchInput setSearchTerm={setSearchTerm} />
        <div className="search-options">
          {checkboxes.map((checkbox) => (
            <CheckBox
              key={checkbox.value}
              name={checkbox.name}
              value={checkbox.value}
              checked={checkboxState[checkbox.value]}
              onChange={(value) => handleCheckboxChange(value, checkbox.value)}
            />
          ))}
        </div>
        <DisplaySearchResults
          searchTerm={searchTerm}
          checkboxState={checkboxState}
        />
      </SearchIndexContext.Provider>
    </>
  );
}

export default App;
